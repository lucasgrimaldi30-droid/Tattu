# Sistema do Tatuador — Especificação

> **Decisões de 01/11/2026 (valem sobre o texto abaixo):**
> - **O cliente não tem conta nem senha.** Ele só manda o pedido: pelo formulário público do site (sem login) ou pelo WhatsApp. Depois do formulário, é levado para o WhatsApp do tatuador.
> - **Só o tatuador entra no sistema.** O sistema serve para fechar pedidos e controlar horários, custos e ganhos.
> - **Sem chat no sistema:** a conversa fica no WhatsApp. No pedido há um botão "Abrir WhatsApp" e um campo de anotações.
> - **IA no WhatsApp** (manda as primeiras mensagens e cria o pedido a partir da conversa): fase futura.
> - Pedidos que chegam pelo WhatsApp, por enquanto, são lançados à mão pelo tatuador.

App web (mobile-first) para **um tatuador** gerenciar orçamentos, conversar com clientes e controlar o custo dos insumos de cada tattoo.

## Stack
- **Next.js** (App Router, TypeScript) + **Tailwind CSS**
- **Supabase**: Postgres, Auth, Storage (fotos), Realtime (chat)
- **Vercel** para deploy
- Interface toda em **português (pt-BR)**, valores em **R$**, datas em formato brasileiro, fuso America/Bahia

## Perfis de acesso
- **Admin (tatuador)**: único usuário administrador. Vê e gerencia tudo.
- **Cliente**: cria conta (e-mail + senha ou link mágico por e-mail), vê só os próprios orçamentos e conversas.
- Segurança via **Row Level Security (RLS)** no Supabase em todas as tabelas: cliente só lê/escreve o que é dele; admin acessa tudo.

## Regra de pagamento
- **Não existe sinal.** O pagamento é feito **somente ao final** da sessão.
- O tatuador registra manualmente: valor final cobrado, forma de pagamento (Pix, dinheiro, cartão de débito, cartão de crédito) e data.
- Sem integração com gateway de pagamento nesta versão.

---

## Módulo 1 — Orçamentos (portal do cliente)
Cliente preenche:
- Descrição da ideia
- Local do corpo (lista: braço, antebraço, perna, costas, peito, costela, mão, pé, pescoço, outro)
- Tamanho aproximado (cm)
- Colorida ou preto e cinza
- **Fotos do local** do corpo (várias)
- **Fotos de referência** (várias)
- Disponibilidade de dias/horários (texto livre)

Tatuador responde com:
- Valor estimado (pode ser faixa: mín–máx)
- Tempo estimado de sessão
- Número de sessões previstas
- Proposta de data/hora

### Status do orçamento
`novo` → `em_conversa` → `orcado` → `aceito` → `agendado` → `concluido`
Também: `recusado` (pelo cliente) e `cancelado` (pelo tatuador).

## Módulo 2 — Chat
- Um chat por orçamento, em tempo real (Supabase Realtime).
- Texto e envio de **fotos** pelos dois lados.
- Indicador de mensagens não lidas.
- Notificação por e-mail ao tatuador quando chega orçamento novo ou mensagem nova (pode ficar para a fase 2).

## Módulo 3 — Agenda e sessões
- Ao aceitar o orçamento, o tatuador cria uma ou mais **sessões** (data, hora, duração).
- Visão de agenda (lista por dia / semana) para o tatuador.
- Cliente vê as datas das suas sessões.
- Ao concluir a sessão: lança **insumos usados** e, na última sessão, o **pagamento**.

## Módulo 4 — ERP de insumos (só admin)
### Cadastro de insumos
- Nome, categoria (tinta, agulha/cartucho, luva, filme/plástico, higiene, descartável, outro)
- Unidade de medida (ml, unidade, caixa, rolo, par…)
- **Custo por unidade** (calculado a partir das compras: custo médio)
- Estoque atual e **estoque mínimo** (alerta quando abaixo)

### Compras (entradas)
- Data, fornecedor, insumo, quantidade, valor total
- Atualiza estoque e recalcula o **custo médio ponderado**

### Consumo por sessão (saídas)
- Na sessão, o tatuador lança os insumos e quantidades usadas
- Baixa do estoque automática
- **Kit padrão**: conjunto pré-definido de insumos (luvas, filme, copinhos etc.) que pode ser adicionado em um toque e depois ajustado

### Custo e margem
Para cada tattoo concluída:
- **Custo de insumos** = soma (quantidade × custo médio no momento do lançamento)
- **Valor cobrado** (pagamento registrado)
- **Margem** = valor cobrado − custo de insumos (em R$ e %)

### Relatórios
- Faturamento, custo de insumos e margem por mês
- Tattoos mais e menos lucrativas
- Insumos que mais pesam no custo
- Lista de insumos abaixo do estoque mínimo

---

## Modelo de dados (Supabase / Postgres)
- `profiles` — id (= auth.users.id), nome, telefone, role (`admin` | `cliente`), criado_em
- `orcamentos` — id, cliente_id, descricao, local_corpo, tamanho_cm, colorida (bool), disponibilidade, status, valor_min, valor_max, tempo_estimado_min, sessoes_previstas, criado_em, atualizado_em
- `orcamento_fotos` — id, orcamento_id, tipo (`local` | `referencia`), storage_path, criado_em
- `mensagens` — id, orcamento_id, autor_id, texto, foto_path (opcional), lida (bool), criado_em
- `sessoes` — id, orcamento_id, inicio, duracao_min, status (`agendada` | `realizada` | `cancelada`), observacoes
- `insumos` — id, nome, categoria, unidade, custo_medio, estoque_atual, estoque_minimo, ativo
- `compras` — id, data, fornecedor, insumo_id, quantidade, valor_total
- `consumos` — id, sessao_id, insumo_id, quantidade, custo_unitario_no_momento
- `kits` / `kit_itens` — kit padrão de insumos
- `pagamentos` — id, orcamento_id, valor, forma (`pix` | `dinheiro` | `debito` | `credito`), data

Storage: bucket privado `fotos` com pastas por orçamento; acesso por URL assinada.

## Telas
**Cliente**
1. Página inicial (apresentação do tatuador + botão "Pedir orçamento")
2. Login / cadastro
3. Formulário de orçamento com upload de fotos
4. Meus orçamentos (lista com status)
5. Detalhe do orçamento + chat

**Tatuador (admin)**
1. Painel: orçamentos novos, mensagens não lidas, sessões da semana, alertas de estoque
2. Orçamentos (lista com filtro por status) → detalhe + chat + responder valor
3. Agenda / sessões → concluir sessão (lançar insumos, registrar pagamento)
4. Insumos (cadastro + estoque) e Compras
5. Relatórios

---

## Ordem de construção (MVP primeiro)
1. Projeto Next.js + Supabase, auth, perfis e RLS
2. Pedido de orçamento com upload de fotos
3. Chat em tempo real por orçamento
4. Painel do tatuador + resposta de orçamento + status
5. Sessões e agenda
6. Insumos, compras e custo médio
7. Consumo por sessão + kit padrão + pagamento final
8. Custo, margem e relatórios
9. Notificações por e-mail e ajustes finais

## Instruções para o Claude Code
- Construir uma fase por vez, testando antes de seguir.
- Gerar as migrations SQL do Supabase (tabelas + RLS + bucket de storage).
- Manter as chaves em `.env.local` (nunca no código).
- Layout mobile-first; testar em largura de celular.
- Escrever um README com o passo a passo para rodar localmente e publicar na Vercel.
