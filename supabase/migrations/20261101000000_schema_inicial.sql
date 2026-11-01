-- =====================================================================
-- Sistema do Tatuador — schema inicial
--
-- Só o tatuador (admin) entra no sistema. O cliente não tem conta: o
-- pedido de orçamento chega pelo formulário público do site (gravado
-- pelo servidor com a chave secreta) ou é lançado à mão pelo tatuador
-- quando vem pelo WhatsApp. A conversa acontece no WhatsApp.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.status_orcamento as enum (
  'novo', 'em_conversa', 'orcado', 'aceito', 'agendado', 'concluido',
  'recusado', 'cancelado'
);

create type public.origem_orcamento as enum ('site', 'whatsapp', 'manual');

create type public.local_corpo as enum (
  'braco', 'antebraco', 'perna', 'costas', 'peito', 'costela',
  'mao', 'pe', 'pescoco', 'outro'
);

create type public.tipo_foto as enum ('local', 'referencia');

create type public.status_sessao as enum ('agendada', 'realizada', 'cancelada');

create type public.categoria_insumo as enum (
  'tinta', 'agulha_cartucho', 'luva', 'filme_plastico', 'higiene',
  'descartavel', 'outro'
);

create type public.forma_pagamento as enum ('pix', 'dinheiro', 'debito', 'credito');

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

-- Quem pode entrar no sistema. Só o tatuador: a linha é criada à mão
-- no SQL Editor (veja o README). Quem se cadastrar no Auth sem ter
-- linha aqui não vê nada.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  criado_em timestamptz not null default now()
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  -- Só dígitos, com DDI (ex.: 5571999998888). Um cadastro por número.
  telefone text not null unique check (telefone ~ '^[0-9]{10,15}$'),
  instagram text,
  observacoes text,
  criado_em timestamptz not null default now()
);

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  -- Número curto para falar com o cliente: "pedido #12".
  numero integer generated always as identity unique,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  origem public.origem_orcamento not null default 'site',
  descricao text not null,
  local_corpo public.local_corpo not null,
  tamanho_cm numeric(6, 1) check (tamanho_cm is null or tamanho_cm > 0),
  colorida boolean not null default false,
  disponibilidade text,
  status public.status_orcamento not null default 'novo',
  -- Resposta do tatuador
  valor_min numeric(10, 2) check (valor_min is null or valor_min >= 0),
  valor_max numeric(10, 2) check (valor_max is null or valor_max >= 0),
  tempo_estimado_min integer check (tempo_estimado_min is null or tempo_estimado_min > 0),
  sessoes_previstas integer check (sessoes_previstas is null or sessoes_previstas > 0),
  proposta_data timestamptz,
  anotacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint valor_faixa_valida check (
    valor_min is null or valor_max is null or valor_max >= valor_min
  )
);

create table public.orcamento_fotos (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  tipo public.tipo_foto not null,
  storage_path text not null unique,
  criado_em timestamptz not null default now()
);

create table public.sessoes (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  inicio timestamptz not null,
  duracao_min integer not null check (duracao_min > 0),
  status public.status_sessao not null default 'agendada',
  observacoes text
);

create table public.insumos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria public.categoria_insumo not null,
  unidade text not null,
  custo_medio numeric(12, 4) not null default 0 check (custo_medio >= 0),
  estoque_atual numeric(12, 3) not null default 0,
  estoque_minimo numeric(12, 3) not null default 0 check (estoque_minimo >= 0),
  ativo boolean not null default true
);

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  data date not null default (now() at time zone 'America/Bahia')::date,
  fornecedor text,
  insumo_id uuid not null references public.insumos (id) on delete restrict,
  quantidade numeric(12, 3) not null check (quantidade > 0),
  valor_total numeric(12, 2) not null check (valor_total >= 0)
);

create table public.consumos (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.sessoes (id) on delete cascade,
  insumo_id uuid not null references public.insumos (id) on delete restrict,
  quantidade numeric(12, 3) not null check (quantidade > 0),
  custo_unitario_no_momento numeric(12, 4) not null default 0
);

create table public.kits (
  id uuid primary key default gen_random_uuid(),
  nome text not null
);

create table public.kit_itens (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.kits (id) on delete cascade,
  insumo_id uuid not null references public.insumos (id) on delete cascade,
  quantidade numeric(12, 3) not null check (quantidade > 0),
  unique (kit_id, insumo_id)
);

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  valor numeric(10, 2) not null check (valor >= 0),
  forma public.forma_pagamento not null,
  data date not null default (now() at time zone 'America/Bahia')::date
);

-- Índices
create index on public.orcamentos (cliente_id);
create index on public.orcamentos (status);
create index on public.orcamentos (criado_em desc);
create index on public.orcamento_fotos (orcamento_id);
create index on public.sessoes (orcamento_id);
create index on public.sessoes (inicio);
create index on public.compras (insumo_id);
create index on public.consumos (sessao_id);
create index on public.consumos (insumo_id);
create index on public.kit_itens (kit_id);
create index on public.pagamentos (orcamento_id);

-- ---------------------------------------------------------------------
-- Funções e gatilhos
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger orcamentos_atualizado_em
  before update on public.orcamentos
  for each row execute function public.tocar_atualizado_em();

-- Compra (entrada): soma ao estoque e recalcula o custo médio ponderado.
create or replace function public.aplicar_compra()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_estoque numeric;
  v_custo numeric;
begin
  select greatest(estoque_atual, 0), custo_medio
    into v_estoque, v_custo
    from public.insumos
   where id = new.insumo_id
   for update;

  update public.insumos
     set custo_medio = (v_estoque * v_custo + new.valor_total)
                       / (v_estoque + new.quantidade),
         estoque_atual = estoque_atual + new.quantidade
   where id = new.insumo_id;

  return new;
end;
$$;

create trigger compras_aplicar
  after insert on public.compras
  for each row execute function public.aplicar_compra();

-- Consumo (saída): grava o custo médio do momento e dá baixa no estoque.
create or replace function public.preparar_consumo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select custo_medio into new.custo_unitario_no_momento
    from public.insumos where id = new.insumo_id;
  return new;
end;
$$;

create trigger consumos_preparar
  before insert on public.consumos
  for each row execute function public.preparar_consumo();

create or replace function public.movimentar_estoque_consumo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.insumos set estoque_atual = estoque_atual - new.quantidade
     where id = new.insumo_id;
  elsif tg_op = 'DELETE' then
    update public.insumos set estoque_atual = estoque_atual + old.quantidade
     where id = old.insumo_id;
  elsif tg_op = 'UPDATE' then
    update public.insumos set estoque_atual = estoque_atual + old.quantidade
     where id = old.insumo_id;
    update public.insumos set estoque_atual = estoque_atual - new.quantidade
     where id = new.insumo_id;
  end if;
  return null;
end;
$$;

create trigger consumos_estoque
  after insert or update of quantidade, insumo_id or delete on public.consumos
  for each row execute function public.movimentar_estoque_consumo();


-- Cria (ou reaproveita, pelo telefone) o cliente e abre o orçamento numa
-- transação só. Usada pelo formulário público (servidor, chave secreta)
-- e pelo lançamento manual do tatuador.
create or replace function public.registrar_orcamento(
  p_nome text,
  p_telefone text,
  p_origem public.origem_orcamento,
  p_descricao text,
  p_local_corpo public.local_corpo,
  p_tamanho_cm numeric,
  p_colorida boolean,
  p_disponibilidade text
)
returns table (id uuid, numero integer)
language plpgsql
set search_path = ''
as $$
declare
  v_cliente uuid;
begin
  insert into public.clientes as c (nome, telefone)
  values (trim(p_nome), p_telefone)
  on conflict (telefone) do update
    set nome = case when trim(c.nome) = '' then excluded.nome else c.nome end
  returning c.id into v_cliente;

  return query
  insert into public.orcamentos as o
    (cliente_id, origem, descricao, local_corpo, tamanho_cm, colorida, disponibilidade)
  values
    (v_cliente, p_origem, trim(p_descricao), p_local_corpo, p_tamanho_cm,
     coalesce(p_colorida, false), nullif(trim(p_disponibilidade), ''))
  returning o.id, o.numero;
end;
$$;

revoke execute on function public.registrar_orcamento from public, anon;
grant execute on function public.registrar_orcamento to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Row Level Security: tudo só para o tatuador.
-- O formulário público grava pelo servidor com a chave secreta
-- (service role), que não passa por RLS. Visitante anônimo não lê nada.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'clientes', 'orcamentos', 'orcamento_fotos', 'sessoes',
    'insumos', 'compras', 'consumos', 'kits', 'kit_itens', 'pagamentos'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "só o tatuador" on public.%I for all to authenticated '
      'using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Storage: bucket privado "fotos", uma pasta por orçamento
--   caminho: <orcamento_id>/<tipo>-<arquivo>
-- O cliente envia por URL de upload assinada gerada pelo servidor.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos', 'fotos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "fotos: só o tatuador" on storage.objects
  for all to authenticated
  using (bucket_id = 'fotos' and public.is_admin())
  with check (bucket_id = 'fotos' and public.is_admin());
