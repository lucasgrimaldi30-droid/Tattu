-- =====================================================================
-- Sistema do Tatuador — schema inicial
-- Tabelas, tipos, funções, gatilhos, RLS, Realtime e bucket de fotos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.papel_usuario as enum ('admin', 'cliente');

create type public.status_orcamento as enum (
  'novo', 'em_conversa', 'orcado', 'aceito', 'agendado', 'concluido',
  'recusado', 'cancelado'
);

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
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  telefone text,
  role public.papel_usuario not null default 'cliente',
  criado_em timestamptz not null default now()
);

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles (id) on delete cascade,
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
  storage_path text not null,
  criado_em timestamptz not null default now()
);

create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  autor_id uuid not null references public.profiles (id) on delete cascade,
  texto text,
  foto_path text,
  lida boolean not null default false,
  criado_em timestamptz not null default now(),
  constraint mensagem_nao_vazia check (
    coalesce(nullif(trim(texto), ''), foto_path) is not null
  )
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
create index on public.orcamento_fotos (orcamento_id);
create index on public.mensagens (orcamento_id, criado_em);
create index on public.sessoes (orcamento_id);
create index on public.sessoes (inicio);
create index on public.compras (insumo_id);
create index on public.consumos (sessao_id);
create index on public.consumos (insumo_id);
create index on public.kit_itens (kit_id);
create index on public.pagamentos (orcamento_id);

-- ---------------------------------------------------------------------
-- Funções auxiliares (usadas pelas políticas de RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- O usuário logado pode ver/escrever neste orçamento? (dono ou admin)
create or replace function public.pode_acessar_orcamento(p_orcamento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.orcamentos
    where id = p_orcamento_id and cliente_id = auth.uid()
  );
$$;

-- Mesma checagem a partir do nome da pasta no Storage (texto).
create or replace function public.pode_acessar_pasta(p_pasta text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.orcamentos
    where id::text = p_pasta and cliente_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------

-- Cria o perfil (sempre como cliente) quando alguém se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.raw_user_meta_data ->> 'telefone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Só o admin muda o papel de alguém. (No SQL Editor do Supabase não há
-- usuário logado, então lá é permitido — é assim que se cria o admin.)
create or replace function public.proteger_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Sem permissão para alterar o papel do usuário';
  end if;
  return new;
end;
$$;

create trigger profiles_proteger_role
  before update on public.profiles
  for each row execute function public.proteger_role();

-- O cliente só pode responder ao orçamento (aceitar/recusar quando
-- estiver 'orcado'). Todo o resto só o tatuador altera.
create or replace function public.validar_update_orcamento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();

  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if (new.cliente_id, new.descricao, new.local_corpo, new.tamanho_cm,
      new.colorida, new.disponibilidade, new.valor_min, new.valor_max,
      new.tempo_estimado_min, new.sessoes_previstas, new.proposta_data,
      new.criado_em)
     is distinct from
     (old.cliente_id, old.descricao, old.local_corpo, old.tamanho_cm,
      old.colorida, old.disponibilidade, old.valor_min, old.valor_max,
      old.tempo_estimado_min, old.sessoes_previstas, old.proposta_data,
      old.criado_em) then
    raise exception 'O cliente só pode aceitar ou recusar o orçamento';
  end if;

  if new.status is distinct from old.status
     and not (old.status = 'orcado' and new.status in ('aceito', 'recusado')) then
    raise exception 'Mudança de status não permitida';
  end if;

  return new;
end;
$$;

create trigger orcamentos_validar_update
  before update on public.orcamentos
  for each row execute function public.validar_update_orcamento();

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

-- Marca como lidas as mensagens do orçamento enviadas pela outra pessoa.
create or replace function public.marcar_mensagens_lidas(p_orcamento_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.pode_acessar_orcamento(p_orcamento_id) then
    raise exception 'Sem acesso a este orçamento';
  end if;

  update public.mensagens
     set lida = true
   where orcamento_id = p_orcamento_id
     and autor_id <> auth.uid()
     and not lida;
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.orcamentos      enable row level security;
alter table public.orcamento_fotos enable row level security;
alter table public.mensagens       enable row level security;
alter table public.sessoes         enable row level security;
alter table public.insumos         enable row level security;
alter table public.compras         enable row level security;
alter table public.consumos        enable row level security;
alter table public.kits            enable row level security;
alter table public.kit_itens       enable row level security;
alter table public.pagamentos      enable row level security;

-- profiles
create policy "perfil: ler o próprio ou admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "perfil: editar o próprio ou admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "perfil: admin apaga" on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- orcamentos
create policy "orçamento: dono ou admin lê" on public.orcamentos
  for select to authenticated
  using (cliente_id = auth.uid() or public.is_admin());

create policy "orçamento: cliente cria o próprio" on public.orcamentos
  for insert to authenticated
  with check (
    (cliente_id = auth.uid() and status = 'novo'
      and valor_min is null and valor_max is null
      and tempo_estimado_min is null and sessoes_previstas is null
      and proposta_data is null)
    or public.is_admin()
  );

create policy "orçamento: dono ou admin atualiza" on public.orcamentos
  for update to authenticated
  using (cliente_id = auth.uid() or public.is_admin())
  with check (cliente_id = auth.uid() or public.is_admin());

create policy "orçamento: admin apaga" on public.orcamentos
  for delete to authenticated
  using (public.is_admin());

-- orcamento_fotos
create policy "fotos do orçamento: dono ou admin lê" on public.orcamento_fotos
  for select to authenticated
  using (public.pode_acessar_orcamento(orcamento_id));

create policy "fotos do orçamento: dono ou admin envia" on public.orcamento_fotos
  for insert to authenticated
  with check (public.pode_acessar_orcamento(orcamento_id));

create policy "fotos do orçamento: dono ou admin apaga" on public.orcamento_fotos
  for delete to authenticated
  using (public.pode_acessar_orcamento(orcamento_id));

-- mensagens
create policy "mensagem: participantes leem" on public.mensagens
  for select to authenticated
  using (public.pode_acessar_orcamento(orcamento_id));

create policy "mensagem: participantes enviam como si mesmos" on public.mensagens
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and lida = false
    and public.pode_acessar_orcamento(orcamento_id)
  );

create policy "mensagem: admin edita" on public.mensagens
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "mensagem: admin apaga" on public.mensagens
  for delete to authenticated
  using (public.is_admin());

-- sessoes (cliente só vê as suas; tatuador gerencia)
create policy "sessão: dono ou admin lê" on public.sessoes
  for select to authenticated
  using (public.pode_acessar_orcamento(orcamento_id));

create policy "sessão: admin gerencia" on public.sessoes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- pagamentos (cliente só vê os seus; tatuador registra)
create policy "pagamento: dono ou admin lê" on public.pagamentos
  for select to authenticated
  using (public.pode_acessar_orcamento(orcamento_id));

create policy "pagamento: admin gerencia" on public.pagamentos
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ERP de insumos: só o admin
create policy "insumos: só admin" on public.insumos
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "compras: só admin" on public.compras
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "consumos: só admin" on public.consumos
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "kits: só admin" on public.kits
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "kit_itens: só admin" on public.kit_itens
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Funções expostas pela API: só para usuários logados
revoke execute on function public.marcar_mensagens_lidas(uuid) from public, anon;
grant execute on function public.marcar_mensagens_lidas(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Realtime (chat)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.mensagens;

-- ---------------------------------------------------------------------
-- Storage: bucket privado "fotos", uma pasta por orçamento
--   caminho: <orcamento_id>/<arquivo>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos', 'fotos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "fotos: dono ou admin lê" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fotos'
    and public.pode_acessar_pasta((storage.foldername(name))[1])
  );

create policy "fotos: dono ou admin envia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and public.pode_acessar_pasta((storage.foldername(name))[1])
  );

create policy "fotos: admin apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and public.is_admin());
