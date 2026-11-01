-- Testes de RLS e gatilhos. Rode depois de stub_supabase.sql + migrations
-- num banco descartável (veja o README). Linhas "(deve falhar)" devem dar ERROR.
\set ON_ERROR_STOP 0
insert into auth.users (id,email) values
 ('00000000-0000-0000-0000-00000000000a','tatuador@x'),
 ('00000000-0000-0000-0000-00000000000b','intruso@x');
-- o tatuador é cadastrado à mão (como no README)
insert into profiles (id, nome) values ('00000000-0000-0000-0000-00000000000a','Tatuador');

\echo '--- servidor (service_role) registra pedido do site, 2x o mesmo telefone'
set role service_role;
select numero from registrar_orcamento('Bia','5571999990000','site','Rosa fineline','antebraco',12,false,'sábados');
select numero from registrar_orcamento('','5571999990000','site','Outra ideia','perna',null,true,null);
select nome, telefone from clientes;
reset role;

\echo '--- visitante anônimo: não lê nada e não chama a função (deve falhar)'
set role anon;
select count(*) from orcamentos;
select * from registrar_orcamento('X','5571000000000','site','x','braco',null,false,null);
reset role;

\echo '--- usuário logado que não é o tatuador: 0 linhas, não insere (deve falhar)'
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000b';
select (select count(*) from orcamentos),(select count(*) from clientes),(select count(*) from storage.objects);
insert into profiles (id,nome) values (auth.uid(),'eu');
select * from registrar_orcamento('X','5571000000000','manual','x','braco',null,false,null);

\echo '--- tatuador vê tudo e lança pedido do WhatsApp'
set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
select numero from registrar_orcamento('Caio','5571888887777','whatsapp','Leão','costas',30,true,null);
select numero, origem, status from orcamentos order by numero;
update orcamentos set valor_min=800, valor_max=1200, status='orcado' where numero=1;
insert into insumos (id,nome,categoria,unidade) values ('22222222-2222-2222-2222-222222222222','Tinta preta','tinta','ml');
insert into compras (insumo_id,quantidade,valor_total) values ('22222222-2222-2222-2222-222222222222',100,200);
insert into compras (insumo_id,quantidade,valor_total) values ('22222222-2222-2222-2222-222222222222',100,400);
\echo '--- custo médio esperado 3.00, estoque 200'
select custo_medio, estoque_atual from insumos;
insert into sessoes (id,orcamento_id,inicio,duracao_min) select '33333333-3333-3333-3333-333333333333', id, now(), 240 from orcamentos where numero=1;
insert into consumos (sessao_id,insumo_id,quantidade) values ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222',10);
\echo '--- consumo: custo 3.00, estoque 190'
select c.custo_unitario_no_momento, i.estoque_atual from consumos c join insumos i on i.id=c.insumo_id;
delete from consumos;
\echo '--- apagou o consumo: estoque volta a 200'
select estoque_atual from insumos;
