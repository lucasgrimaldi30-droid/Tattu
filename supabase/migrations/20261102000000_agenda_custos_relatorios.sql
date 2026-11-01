-- =====================================================================
-- Agenda, custos, pagamentos e relatórios
-- =====================================================================

-- ---------------------------------------------------------------------
-- Compras: apagar uma compra desfaz a entrada no estoque e no custo médio
-- ---------------------------------------------------------------------
create or replace function public.desfazer_compra()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_estoque numeric;
  v_custo numeric;
  v_restante numeric;
begin
  select estoque_atual, custo_medio into v_estoque, v_custo
    from public.insumos where id = old.insumo_id for update;

  v_restante := v_estoque - old.quantidade;

  update public.insumos
     set estoque_atual = v_restante,
         -- Tira a compra da média; se não sobrar estoque, mantém o custo.
         custo_medio = case
           when v_restante > 0 and v_estoque * v_custo - old.valor_total >= 0
             then (v_estoque * v_custo - old.valor_total) / v_restante
           else v_custo
         end
   where id = old.insumo_id;

  return old;
end;
$$;

create trigger compras_desfazer
  after delete on public.compras
  for each row execute function public.desfazer_compra();

-- Compra não se edita (apaga e lança de novo): mantém o custo médio coerente.
create or replace function public.bloquear_edicao_compra()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Compras não podem ser editadas. Apague e lance de novo.';
end;
$$;

create trigger compras_sem_edicao
  before update on public.compras
  for each row execute function public.bloquear_edicao_compra();

-- ---------------------------------------------------------------------
-- Kit padrão: adiciona todos os itens do kit como consumo da sessão
-- (somando à quantidade se o insumo já estiver lançado).
-- ---------------------------------------------------------------------
create or replace function public.aplicar_kit(p_sessao_id uuid, p_kit_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_item record;
  v_qtd integer := 0;
begin
  if not public.is_admin() and auth.uid() is not null then
    raise exception 'Sem permissão';
  end if;

  for v_item in
    select ki.insumo_id, ki.quantidade
      from public.kit_itens ki
      join public.insumos i on i.id = ki.insumo_id and i.ativo
     where ki.kit_id = p_kit_id
  loop
    update public.consumos
       set quantidade = quantidade + v_item.quantidade
     where sessao_id = p_sessao_id and insumo_id = v_item.insumo_id;
    if not found then
      insert into public.consumos (sessao_id, insumo_id, quantidade)
      values (p_sessao_id, v_item.insumo_id, v_item.quantidade);
    end if;
    v_qtd := v_qtd + 1;
  end loop;

  return v_qtd;
end;
$$;

revoke execute on function public.aplicar_kit from public, anon;
grant execute on function public.aplicar_kit to authenticated;

-- ---------------------------------------------------------------------
-- Views de resultado (security_invoker: respeitam o RLS de quem consulta)
-- ---------------------------------------------------------------------

-- Uma linha por pedido: quanto custou de insumo, quanto entrou e a margem.
create or replace view public.resultado_pedidos
with (security_invoker = true)
as
select
  o.id,
  o.numero,
  o.status,
  o.descricao,
  c.nome as cliente_nome,
  coalesce(ci.custo_insumos, 0)::numeric(12, 2) as custo_insumos,
  coalesce(pg.recebido, 0)::numeric(12, 2) as recebido,
  (coalesce(pg.recebido, 0) - coalesce(ci.custo_insumos, 0))::numeric(12, 2) as margem,
  case when coalesce(pg.recebido, 0) > 0
    then round((coalesce(pg.recebido, 0) - coalesce(ci.custo_insumos, 0))
               / pg.recebido * 100, 1)
  end as margem_pct,
  coalesce(se.minutos, 0) as minutos_tatuando,
  pg.ultimo_pagamento
from public.orcamentos o
join public.clientes c on c.id = o.cliente_id
left join lateral (
  select sum(co.quantidade * co.custo_unitario_no_momento) as custo_insumos
    from public.sessoes s
    join public.consumos co on co.sessao_id = s.id
   where s.orcamento_id = o.id
) ci on true
left join lateral (
  select sum(p.valor) as recebido, max(p.data) as ultimo_pagamento
    from public.pagamentos p
   where p.orcamento_id = o.id
) pg on true
left join lateral (
  select sum(s.duracao_min) as minutos
    from public.sessoes s
   where s.orcamento_id = o.id and s.status = 'realizada'
) se on true;

-- Por mês (fuso da Bahia): faturamento pela data do pagamento, custo de
-- insumos e horas pela data da sessão realizada.
create or replace view public.resultado_mensal
with (security_invoker = true)
as
with fat as (
  select date_trunc('month', p.data)::date as mes, sum(p.valor) as faturamento,
         count(distinct p.orcamento_id) as tattoos_pagas
    from public.pagamentos p
   group by 1
),
custo as (
  select date_trunc('month', s.inicio at time zone 'America/Bahia')::date as mes,
         sum(co.quantidade * co.custo_unitario_no_momento) as custo_insumos
    from public.consumos co
    join public.sessoes s on s.id = co.sessao_id
   group by 1
),
horas as (
  select date_trunc('month', s.inicio at time zone 'America/Bahia')::date as mes,
         sum(s.duracao_min) as minutos, count(*) as sessoes
    from public.sessoes s
   where s.status = 'realizada'
   group by 1
),
meses as (
  select mes from fat union select mes from custo union select mes from horas
)
select
  m.mes,
  coalesce(f.faturamento, 0)::numeric(12, 2) as faturamento,
  coalesce(c.custo_insumos, 0)::numeric(12, 2) as custo_insumos,
  (coalesce(f.faturamento, 0) - coalesce(c.custo_insumos, 0))::numeric(12, 2) as margem,
  case when coalesce(f.faturamento, 0) > 0
    then round((f.faturamento - coalesce(c.custo_insumos, 0)) / f.faturamento * 100, 1)
  end as margem_pct,
  coalesce(f.tattoos_pagas, 0) as tattoos_pagas,
  coalesce(h.sessoes, 0) as sessoes_realizadas,
  coalesce(h.minutos, 0) as minutos_tatuando
from meses m
left join fat f on f.mes = m.mes
left join custo c on c.mes = m.mes
left join horas h on h.mes = m.mes;

-- Quanto cada insumo pesou no custo (por mês da sessão).
create or replace view public.custo_por_insumo_mensal
with (security_invoker = true)
as
select
  date_trunc('month', s.inicio at time zone 'America/Bahia')::date as mes,
  i.id as insumo_id,
  i.nome,
  i.unidade,
  sum(co.quantidade)::numeric(12, 3) as quantidade,
  sum(co.quantidade * co.custo_unitario_no_momento)::numeric(12, 2) as custo
from public.consumos co
join public.sessoes s on s.id = co.sessao_id
join public.insumos i on i.id = co.insumo_id
group by 1, 2, 3, 4;

grant select on public.resultado_pedidos, public.resultado_mensal,
  public.custo_por_insumo_mensal to authenticated;
revoke all on public.resultado_pedidos, public.resultado_mensal,
  public.custo_por_insumo_mensal from anon;
