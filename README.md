# Tattu — Sistema do Tatuador

Sistema web (mobile-first, em português) para **um tatuador** fechar pedidos e controlar horários, custos e ganhos.

- **Cliente:** não tem conta. Manda o pedido pelo formulário do site (`/orcamento`) e é levado para o WhatsApp do tatuador com o número do pedido.
- **Tatuador:** único usuário do sistema (`/admin`). Vê os pedidos com fotos, abre o WhatsApp do cliente, registra valor, tempo, sessões, data e anotações. Pedidos que chegam pelo WhatsApp são lançados à mão.

A especificação está em [`docs/SPEC.md`](docs/SPEC.md) (com as decisões mais recentes no topo).

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Vercel.

## Andamento

| Fase | O quê | Situação |
|---|---|---|
| 1 | Projeto, login do tatuador, banco completo com RLS | ✅ |
| 2 | Formulário público de pedido com fotos → WhatsApp | ✅ |
| 3 | Pedidos no painel: lista, detalhe, fechamento, lançamento manual | ✅ |
| 4 | Sessões e agenda | ✅ |
| 5 | Insumos, compras e custo médio | ✅ |
| 6 | Consumo por sessão + kit padrão + pagamento final | ✅ |
| 7 | Custo, margem e relatórios | ✅ |
| 8 | IA no WhatsApp (primeiras mensagens e pedido pela conversa) | ⏳ |

## Rodar localmente

Pré-requisitos: Node.js 20 ou mais novo e uma conta grátis no [Supabase](https://supabase.com).

### 1. Criar o projeto no Supabase

1. Em <https://supabase.com/dashboard>, crie um projeto (região **South America (São Paulo)**).
2. Abra **SQL Editor → New query** e rode, **nesta ordem**, cada arquivo de [`supabase/migrations/`](supabase/migrations/) (cole o conteúdo e clique em **Run**):
   1. `20261101000000_schema_inicial.sql`: tabelas, regras de segurança (RLS) e o bucket privado `fotos`
   2. `20261102000000_agenda_custos_relatorios.sql`: kit, desfazer compra e as views dos relatórios
3. Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**. Só você entra no sistema.

### 2. Criar o seu acesso (tatuador)

1. Em **Authentication → Users → Add user → Create new user**, coloque seu e-mail e uma senha e marque **Auto Confirm User**.
2. No **SQL Editor**, rode (trocando o e-mail e o nome):

```sql
insert into public.profiles (id, nome)
select id, 'Seu Nome' from auth.users where email = 'seu-email@exemplo.com';
```

Só quem tem linha em `profiles` entra no sistema. Qualquer outra conta é recusada no login e não enxerga nada no banco.

### 3. Configurar as chaves

```bash
cp .env.example .env.local
```

Preencha `.env.local`:

| Variável | Onde achar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → *publishable* (ou *anon*) |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys → *secret* (ou *service_role*). **Secreta**: só fica no servidor |
| `NEXT_PUBLIC_WHATSAPP_TATUADOR` | Seu WhatsApp, só dígitos com 55 + DDD (ex.: `5571999998888`) |

O arquivo `.env.local` não vai para o Git.

### 4. Instalar e rodar

```bash
npm install
npm run dev
```

- Site do cliente: <http://localhost:3000> → **Pedir orçamento**
- Sistema do tatuador: <http://localhost:3000/entrar>

Para testar como no celular, use o modo de dispositivo do navegador (largura ~390 px).

## Publicar na Vercel

1. Em <https://vercel.com/new>, importe este repositório do GitHub. O Next.js é detectado sozinho.
2. Em **Environment Variables**, cadastre as quatro variáveis do `.env.local`.
3. Clique em **Deploy**.
4. Mande para os clientes o link `https://SEU-ENDERECO.vercel.app/orcamento` (bio do Instagram, resposta automática do WhatsApp etc.).

## O dia a dia no sistema

1. **Pedido chega** (site ou lançado por você) → aparece em **Painel** e **Pedidos**.
2. **Negociação no WhatsApp** → no pedido, registre valor, tempo, sessões, data e anotações, e mude a situação.
3. **Marcar sessão** → no pedido, **+ Marcar sessão**. O pedido passa para *Agendado* e aparece na **Agenda** (próximos 7 dias).
4. **No dia** → abra a sessão pela Agenda. Toque no kit (ex.: **+ Kit padrão**), lance as tintas e agulhas usadas e **Marcar realizada**. O estoque baixa sozinho.
5. **No fim** → no pedido, **Registrar pagamento** (valor, forma, data) com *Tattoo finalizada* marcado. O pedido mostra recebido, custo de insumos e margem.
6. **Compras** → em **Insumos → Compras**: o estoque sobe e o custo médio é recalculado.
7. **Relatórios** → faturamento, custo, margem e R$/hora mês a mês, tattoos mais e menos lucrativas, insumos que mais pesam e estoque baixo.

## Como funciona o pedido pelo site

1. O cliente preenche o formulário. As fotos são reduzidas no próprio celular (até 1600 px) antes de subir.
2. O servidor valida os dados e grava cliente e pedido com a chave secreta. O mesmo telefone reaproveita o cadastro do cliente.
3. O servidor devolve um link de upload assinado por foto, e o navegador manda cada foto direto para o Storage. Assim não esbarra no limite de tamanho da Vercel.
4. O cliente vê "Pedido recebido #N" e o botão **Continuar no WhatsApp**, com a mensagem já escrita.

Um campo escondido barra robôs simples. Se aparecer spam, dá para colocar um captcha (ex.: Cloudflare Turnstile).

## Como está organizado

```
supabase/
  migrations/       SQL do banco: tabelas, RLS, gatilhos, Storage
  tests/            testes de RLS num Postgres comum (sem Docker)
src/
  proxy.ts          renova a sessão e protege /admin
  app/(site)/       páginas públicas: início, /orcamento, /entrar
  app/admin/        sistema do tatuador: painel, pedidos, agenda, sessões,
                    insumos (estoque, compras, kits) e relatórios
  components/       formulário de pedido, lista de pedidos, selo de status
  lib/pedidos.ts    validação e gravação do pedido (servidor)
  lib/supabase/     clientes do Supabase (navegador, servidor, proxy, chave secreta)
  lib/auth.ts       tatuador logado, exigirAdmin
  lib/telefone.ts   normalização, formatação e link do WhatsApp
  lib/formatos.ts   R$, datas pt-BR no fuso America/Bahia, durações
  lib/datas.ts      campos de data/hora ↔ fuso da Bahia, dias da agenda
  lib/numeros.ts    leitura de números digitados em pt-BR ("1.200,50")
```

### Regras que o banco garante

- Todas as tabelas e as fotos: **só o tatuador** lê e escreve. Visitante anônimo não lê nada.
- O formulário público grava pelo servidor com a chave secreta. A função `registrar_orcamento` não pode ser chamada por visitante anônimo.
- **Compra** lançada: soma ao estoque e recalcula o **custo médio ponderado**.
- **Consumo** lançado: grava o custo médio do momento e dá **baixa no estoque**. Apagar o consumo (ou a sessão) devolve ao estoque.
- Apagar uma **compra** desfaz a entrada no estoque e no custo médio. Compra não se edita: apague e lance de novo.
- **Kit** aplicado duas vezes soma as quantidades em vez de duplicar linhas.
- Relatórios (views `resultado_pedidos`, `resultado_mensal`, `custo_por_insumo_mensal`): faturamento pela data do pagamento; custo e horas pela data da sessão, no fuso da Bahia. As views respeitam o RLS.

### Testar as regras do banco sem Supabase

Com um Postgres local qualquer, num banco descartável:

```bash
createdb tattu_teste
psql -d tattu_teste -f supabase/tests/stub_supabase.sql
for f in supabase/migrations/*.sql; do psql -d tattu_teste -f "$f"; done
psql -d tattu_teste -f supabase/tests/rls.sql
# em outro banco descartável (recriado do mesmo jeito):
psql -d tattu_teste2 -f supabase/tests/custos.sql
```

Cada linha marcada "(deve falhar)" tem que mostrar um `ERROR`. As demais mostram os valores esperados.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` | ESLint |
