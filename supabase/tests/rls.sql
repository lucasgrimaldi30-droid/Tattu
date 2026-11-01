-- Testes de RLS e gatilhos. Rode depois de stub_supabase.sql + migrations
-- num banco descartável (veja o README). Linhas "(deve falhar)" devem dar ERROR.
\set ON_ERROR_STOP 0
insert into auth.users (id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','adm@x','{"nome":"Tatuador"}'),
 ('00000000-0000-0000-0000-00000000000b','b@x','{"nome":"Bia","telefone":"71999"}'),
 ('00000000-0000-0000-0000-00000000000c','c@x','{"nome":"Caio"}');
update profiles set role='admin' where id='00000000-0000-0000-0000-00000000000a';
select nome, telefone, role from profiles order by nome;

-- cliente B
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000b';
\echo '--- B tenta virar admin (deve falhar)'
update profiles set role='admin' where id=auth.uid();
\echo '--- B cria orçamento com valor (deve falhar)'
insert into orcamentos (cliente_id,descricao,local_corpo,valor_min) values (auth.uid(),'x','braco',100);
\echo '--- B cria orçamento ok'
insert into orcamentos (id,cliente_id,descricao,local_corpo,tamanho_cm,colorida) values ('11111111-1111-1111-1111-111111111111',auth.uid(),'Rosa','antebraco',15,true);
\echo '--- B cria orçamento em nome de C (deve falhar)'
insert into orcamentos (cliente_id,descricao,local_corpo) values ('00000000-0000-0000-0000-00000000000c','x','braco');
insert into mensagens (orcamento_id,autor_id,texto) values ('11111111-1111-1111-1111-111111111111',auth.uid(),'oi');
insert into storage.objects (bucket_id,name) values ('fotos','11111111-1111-1111-1111-111111111111/a.jpg');
\echo '--- B envia foto em pasta inválida (deve falhar sem erro de cast)'
insert into storage.objects (bucket_id,name) values ('fotos','qualquer/a.jpg');
\echo '--- B tenta definir valor (deve falhar)'
update orcamentos set valor_max=999 where id='11111111-1111-1111-1111-111111111111';
\echo '--- B tenta aceitar antes de orcado (deve falhar)'
update orcamentos set status='aceito' where id='11111111-1111-1111-1111-111111111111';
\echo '--- B lê insumos (0 linhas)'
select count(*) from insumos;

-- cliente C
set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000c';
\echo '--- C vê orçamentos/mensagens/fotos de B (0,0,0)'
select (select count(*) from orcamentos),(select count(*) from mensagens),(select count(*) from storage.objects);
\echo '--- C manda msg no orçamento de B (deve falhar)'
insert into mensagens (orcamento_id,autor_id,texto) values ('11111111-1111-1111-1111-111111111111',auth.uid(),'intruso');

-- admin
set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
\echo '--- admin vê tudo'
select (select count(*) from orcamentos),(select count(*) from mensagens),(select count(*) from profiles);
select marcar_mensagens_lidas('11111111-1111-1111-1111-111111111111');
select lida from mensagens;
update orcamentos set valor_min=800, valor_max=1200, tempo_estimado_min=240, sessoes_previstas=1, status='orcado' where id='11111111-1111-1111-1111-111111111111';
insert into insumos (id,nome,categoria,unidade) values ('22222222-2222-2222-2222-222222222222','Tinta preta','tinta','ml');
insert into compras (insumo_id,quantidade,valor_total) values ('22222222-2222-2222-2222-222222222222',100,200);
insert into compras (insumo_id,quantidade,valor_total) values ('22222222-2222-2222-2222-222222222222',100,400);
\echo '--- custo médio esperado 3.00, estoque 200'
select custo_medio, estoque_atual from insumos;
insert into sessoes (id,orcamento_id,inicio,duracao_min) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111',now(),240);
insert into consumos (sessao_id,insumo_id,quantidade) values ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222',10);
\echo '--- consumo: custo 3.00, estoque 190'
select c.custo_unitario_no_momento, i.estoque_atual from consumos c join insumos i on i.id=c.insumo_id;

set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000b';
\echo '--- B aceita (ok) e vê a sessão (1)'
update orcamentos set status='aceito' where id='11111111-1111-1111-1111-111111111111';
select status from orcamentos; select count(*) from sessoes;
