# Tattu — Sistema do Tatuador

App web (mobile-first, em português) para um tatuador gerenciar orçamentos, conversar com clientes e controlar o custo dos insumos de cada tattoo. A especificação completa está em [`docs/SPEC.md`](docs/SPEC.md).

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, Realtime) · Vercel.

## Andamento

| Fase | O quê | Situação |
|---|---|---|
| 1 | Projeto, auth, perfis e RLS (banco completo) | ✅ |
| 2 | Pedido de orçamento com upload de fotos | ⏳ |
| 3 | Chat em tempo real por orçamento | ⏳ |
| 4 | Painel do tatuador + resposta de orçamento + status | ⏳ (painel com contadores pronto) |
| 5 | Sessões e agenda | ⏳ |
| 6 | Insumos, compras e custo médio | ⏳ (banco pronto) |
| 7 | Consumo por sessão + kit padrão + pagamento | ⏳ (banco pronto) |
| 8 | Custo, margem e relatórios | ⏳ |
| 9 | Notificações por e-mail e ajustes finais | ⏳ |

## Rodar localmente

Pré-requisitos: Node.js 20 ou mais novo e uma conta grátis no [Supabase](https://supabase.com).

### 1. Criar o projeto no Supabase

1. Em <https://supabase.com/dashboard>, crie um projeto (região **South America (São Paulo)**).
2. Abra **SQL Editor → New query**, cole todo o conteúdo de
   [`supabase/migrations/20261101000000_schema_inicial.sql`](supabase/migrations/20261101000000_schema_inicial.sql) e clique em **Run**.
   Isso cria as tabelas, as regras de segurança (RLS), o Realtime do chat e o bucket privado `fotos`.
3. Em **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:** adicione `http://localhost:3000/auth/callback`

### 2. Configurar as chaves

```bash
cp .env.example .env.local
```

Preencha `.env.local` com os dados de **Project Settings → API** (URL do projeto e a chave *publishable* — ou a *anon*, nos projetos antigos). As chaves ficam só nesse arquivo, que não vai para o Git.

### 3. Instalar e rodar

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>. Para testar no celular, use o modo de dispositivo do navegador (largura ~390 px) ou acesse pelo IP do computador na mesma rede.

### 4. Virar o tatuador (admin)

Todo cadastro novo entra como **cliente**. Para transformar a sua conta em admin:

1. Crie sua conta pelo site (aba **Criar conta**) e confirme o e-mail.
2. No **SQL Editor** do Supabase, rode (trocando o e-mail):

```sql
update public.profiles
   set role = 'admin'
 where id = (select id from auth.users where email = 'seu-email@exemplo.com');
```

3. Saia e entre de novo: você cai no **Painel**.

Só existe um admin. Pelo app ninguém consegue mudar o próprio papel — o banco bloqueia.

## Publicar na Vercel

1. Suba este repositório no GitHub (já está).
2. Em <https://vercel.com/new>, importe o repositório. O framework (Next.js) é detectado sozinho.
3. Em **Environment Variables**, cadastre as mesmas três variáveis do `.env.local`, com `NEXT_PUBLIC_SITE_URL` apontando para o endereço da Vercel (ex.: `https://tattu.vercel.app`).
4. Clique em **Deploy**.
5. De volta ao Supabase, em **Authentication → URL Configuration**:
   - troque o **Site URL** pelo endereço da Vercel;
   - adicione `https://SEU-ENDERECO.vercel.app/auth/callback` em **Redirect URLs**.

## Como está organizado

```
supabase/
  migrations/      SQL do banco: tabelas, RLS, gatilhos, Realtime, Storage
  tests/           testes de RLS rodando num Postgres comum (sem Docker)
src/
  proxy.ts         renova a sessão e protege /admin e /meus-orcamentos
  lib/supabase/    clientes do Supabase (navegador, servidor, proxy)
  lib/auth.ts      usuário logado, exigirUsuario, exigirAdmin
  lib/formatos.ts  R$, datas pt-BR no fuso America/Bahia, durações
  lib/constantes.ts rótulos de status, locais do corpo, pagamentos, categorias
  app/             páginas (/, /entrar, /meus-orcamentos, /admin, /auth/callback)
```

### Regras que o banco garante (RLS + gatilhos)

- Cliente vê e escreve só os **próprios** orçamentos, fotos, mensagens, sessões e pagamentos; o admin vê tudo.
- Cliente cria orçamento só como `novo` e sem valores; depois só pode **aceitar ou recusar** quando estiver `orcado`.
- Insumos, compras, consumos e kits: **só admin**.
- **Compra** lançada → soma ao estoque e recalcula o **custo médio ponderado**.
- **Consumo** lançado → grava o custo médio do momento e dá **baixa no estoque** (apagar o consumo devolve).
- Fotos ficam no bucket privado `fotos`, em `<id-do-orçamento>/<arquivo>`, acessadas por URL assinada.

### Testar as regras do banco sem Supabase

Com um Postgres local qualquer (banco descartável):

```bash
createdb tattu_teste
psql -d tattu_teste -f supabase/tests/stub_supabase.sql
psql -d tattu_teste -f supabase/migrations/20261101000000_schema_inicial.sql
psql -d tattu_teste -f supabase/tests/rls.sql
```

Cada linha marcada "(deve falhar)" tem que mostrar um `ERROR`; as demais mostram os valores esperados.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` | ESLint |
