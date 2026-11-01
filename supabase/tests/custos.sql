-- Testes de compras, kit, consumo, pagamentos e relatórios.
-- Rode depois de stub_supabase.sql + todas as migrations, num banco descartável.
\set ON_ERROR_STOP 0
insert into auth.users (id,email) values
 ('00000000-0000-0000-0000-00000000000a','tatuador@x'),
 ('00000000-0000-0000-0000-00000000000b','intruso@x');
insert into profiles (id, nome) values ('00000000-0000-0000-0000-00000000000a','Tatuador');
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';

select id as pedido1 from registrar_orcamento('Bia','5571999990000','site','Rosa','antebraco',12,false,null) \gset
select id as pedido2 from registrar_orcamento('Caio','5571888887777','whatsapp','Leão','costas',30,true,null) \gset

insert into insumos (id,nome,categoria,unidade,estoque_minimo) values
 ('10000000-0000-0000-0000-000000000001','Tinta preta','tinta','ml',50),
 ('10000000-0000-0000-0000-000000000002','Luva nitrílica','luva','par',20),
 ('10000000-0000-0000-0000-000000000003','Filme PVC','filme_plastico','m',0);
insert into compras (insumo_id,quantidade,valor_total) values
 ('10000000-0000-0000-0000-000000000001',100,200),   -- 2,00/ml
 ('10000000-0000-0000-0000-000000000001',100,400),   -- média 3,00/ml
 ('10000000-0000-0000-0000-000000000002',50,50),     -- 1,00/par
 ('10000000-0000-0000-0000-000000000003',10,30);     -- 3,00/m
\echo '--- apagar a 2ª compra de tinta: estoque 100, custo volta a 2,00'
delete from compras where valor_total = 400;
select nome, estoque_atual, custo_medio from insumos order by nome;
\echo '--- editar compra (deve falhar)'
update compras set valor_total = 1;
insert into compras (insumo_id,quantidade,valor_total) values ('10000000-0000-0000-0000-000000000001',100,400);

insert into kits (id,nome) values ('20000000-0000-0000-0000-000000000001','Kit básico');
insert into kit_itens (kit_id,insumo_id,quantidade) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',2),
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003',1);

insert into sessoes (id,orcamento_id,inicio,duracao_min,status) values
 ('30000000-0000-0000-0000-000000000001',:'pedido1','2026-10-10 14:00-03',180,'realizada'),
 ('30000000-0000-0000-0000-000000000002',:'pedido2','2026-10-31 22:00-03',240,'realizada'),  -- 01/11 01:00 UTC: conta em outubro
 ('30000000-0000-0000-0000-000000000003',:'pedido2','2026-11-20 10:00-03',240,'agendada');

\echo '--- kit 2x na mesma sessão: soma (luva 4, filme 2)'
select aplicar_kit('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
select aplicar_kit('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
insert into consumos (sessao_id,insumo_id,quantidade) values ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',10);
select i.nome, c.quantidade, c.custo_unitario_no_momento from consumos c join insumos i on i.id=c.insumo_id order by i.nome;
-- custo sessão 1: luva 4*1 + filme 2*3 + tinta 10*3 = 40
insert into consumos (sessao_id,insumo_id,quantidade) values ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',20); -- 60
\echo '--- estoques: tinta 170, luva 46, filme 8'
select nome, estoque_atual from insumos order by nome;

insert into pagamentos (orcamento_id,valor,forma,data) values
 (:'pedido1',500,'pix','2026-10-10'),
 (:'pedido2',1000,'credito','2026-11-02');

\echo '--- resultado por pedido: #1 custo 40 recebido 500 margem 460 (92%), #2 custo 60 recebido 1000 margem 940 (94%)'
select numero, cliente_nome, custo_insumos, recebido, margem, margem_pct, minutos_tatuando from resultado_pedidos order by numero;
\echo '--- mensal: out fat 500 custo 100 margem 400 (2 sessões, 420 min); nov fat 1000 custo 0'
select * from resultado_mensal order by mes;
\echo '--- custo por insumo em outubro: tinta 90, filme 6, luva 4'
select nome, quantidade, custo from custo_por_insumo_mensal where mes='2026-10-01' order by custo desc;

\echo '--- intruso logado: views vazias'
set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000b';
select (select count(*) from resultado_pedidos),(select count(*) from resultado_mensal),(select count(*) from custo_por_insumo_mensal);
\echo '--- intruso aplica kit (não grava nada / deve falhar)'
select aplicar_kit('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001');
reset role;
\echo '--- anônimo lê view (deve falhar)'
set role anon;
select count(*) from resultado_pedidos;
