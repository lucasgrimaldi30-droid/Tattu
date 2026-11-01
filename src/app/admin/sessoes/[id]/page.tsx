import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { diaNaBahia, formatarDiaSemana, formatarHora, paraCampoDataHora } from "@/lib/datas";
import { formatarDuracao, formatarMoeda } from "@/lib/formatos";
import { formatarQuantidade, paraCampo } from "@/lib/numeros";
import { linkWhatsApp } from "@/lib/telefone";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { SeloSessao } from "@/components/selo-sessao";
import {
  adicionarConsumo,
  aplicarKit,
  atualizarSessao,
  excluirSessao,
  marcarRealizada,
  removerConsumo,
} from "../actions";

export const metadata: Metadata = { title: "Sessão" };

type Sessao = {
  id: string;
  orcamento_id: string;
  inicio: string;
  duracao_min: number;
  status: string;
  observacoes: string | null;
  orcamentos: { numero: number; descricao: string; clientes: { nome: string; telefone: string } | null } | null;
};

type Consumo = {
  id: string;
  quantidade: number;
  custo_unitario_no_momento: number;
  insumos: { nome: string; unidade: string } | null;
};

export default async function PaginaSessao({ params }: PageProps<"/admin/sessoes/[id]">) {
  await exigirAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await criarClienteServidor();
  const [{ data: sessao }, { data: consumos }, { data: insumos }, { data: kits }] = await Promise.all([
    supabase
      .from("sessoes")
      .select("*, orcamentos(numero, descricao, clientes(nome, telefone))")
      .eq("id", id)
      .maybeSingle<Sessao>(),
    supabase
      .from("consumos")
      .select("id, quantidade, custo_unitario_no_momento, insumos(nome, unidade)")
      .eq("sessao_id", id)
      .returns<Consumo[]>(),
    supabase.from("insumos").select("id, nome, unidade, estoque_atual").eq("ativo", true).order("nome"),
    supabase.from("kits").select("id, nome, kit_itens(count)").order("nome"),
  ]);
  if (!sessao) notFound();

  const pedido = sessao.orcamentos;
  const cliente = pedido?.clientes;
  const custoTotal = (consumos ?? []).reduce(
    (soma, c) => soma + Number(c.quantidade) * Number(c.custo_unitario_no_momento),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href={`/admin/orcamentos/${sessao.orcamento_id}`} className="text-sm text-amber-400 hover:underline">
          ← Pedido #{pedido?.numero} · {cliente?.nome}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">
            {formatarDiaSemana(diaNaBahia(sessao.inicio))}, {formatarHora(sessao.inicio)}
          </h1>
          <SeloSessao status={sessao.status} />
        </div>
        <p className="text-stone-400">
          {formatarDuracao(sessao.duracao_min)} · <span className="line-clamp-1 inline">{pedido?.descricao}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {cliente && (
          <a
            href={linkWhatsApp(cliente.telefone, `Olá, ${cliente.nome.split(" ")[0]}! Lembrando da sua sessão de tatuagem ${formatarDiaSemana(diaNaBahia(sessao.inicio))} às ${formatarHora(sessao.inicio)}.`)}
            target="_blank"
            rel="noreferrer"
            className="botao bg-emerald-500 text-sm hover:bg-emerald-400"
          >
            Lembrar no WhatsApp
          </a>
        )}
        {sessao.status === "agendada" && (
          <form action={marcarRealizada.bind(null, sessao.id)}>
            <BotaoEnviar className="botao text-sm">Marcar realizada</BotaoEnviar>
          </form>
        )}
      </div>

      <section className="cartao space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Insumos usados</h2>
          <span className="text-sm text-stone-400">Custo: <strong className="text-rose-300">{formatarMoeda(custoTotal)}</strong></span>
        </div>

        {kits && kits.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {kits.map((k) => (
              <form key={k.id} action={aplicarKit.bind(null, sessao.id, k.id)}>
                <BotaoEnviar className="botao-secundario" pendente="Adicionando…">+ {k.nome}</BotaoEnviar>
              </form>
            ))}
          </div>
        )}

        {consumos && consumos.length > 0 ? (
          <ul className="divide-y divide-stone-800 text-sm">
            {consumos.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {c.insumos?.nome}
                  <span className="text-stone-500"> · {formatarQuantidade(c.quantidade)} {c.insumos?.unidade}</span>
                </span>
                <span className="flex items-center gap-3">
                  {formatarMoeda(Number(c.quantidade) * Number(c.custo_unitario_no_momento))}
                  <form action={removerConsumo.bind(null, c.id)}>
                    <button type="submit" aria-label="Remover" className="text-stone-500 hover:text-rose-400">✕</button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">Nada lançado ainda.</p>
        )}

        {insumos && insumos.length > 0 ? (
          <Formulario acao={adicionarConsumo.bind(null, sessao.id)} className="space-y-3">
            <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
              <select name="insumo_id" required defaultValue="" aria-label="Insumo" className="campo">
                <option value="" disabled>Insumo…</option>
                {insumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome} ({i.unidade}) · estoque {formatarQuantidade(i.estoque_atual)}
                  </option>
                ))}
              </select>
              <input name="quantidade" inputMode="decimal" required placeholder="Qtd." aria-label="Quantidade" className="campo" />
            </div>
            <BotaoEnviar className="botao-secundario w-full" pendente="Lançando…">Lançar insumo</BotaoEnviar>
          </Formulario>
        ) : (
          <p className="text-sm text-stone-400">
            Cadastre insumos em <Link href="/admin/insumos" className="text-amber-400 underline">Insumos</Link> para lançar aqui.
          </p>
        )}
      </section>

      <section className="cartao space-y-4">
        <h2 className="font-semibold">Editar sessão</h2>
        <Formulario acao={atualizarSessao.bind(null, sessao.id)} className="space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
            <div>
              <label htmlFor="inicio" className="rotulo">Data e hora</label>
              <input id="inicio" name="inicio" type="datetime-local" required defaultValue={paraCampoDataHora(sessao.inicio)} className="campo" />
            </div>
            <div>
              <label htmlFor="duracao_horas" className="rotulo">Duração (h)</label>
              <input id="duracao_horas" name="duracao_horas" inputMode="decimal" required defaultValue={paraCampo(sessao.duracao_min / 60)} className="campo" />
            </div>
          </div>
          <div>
            <label htmlFor="status" className="rotulo">Situação</label>
            <select id="status" name="status" defaultValue={sessao.status} className="campo">
              <option value="agendada">Agendada</option>
              <option value="realizada">Realizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label htmlFor="observacoes" className="rotulo">Observações</label>
            <textarea id="observacoes" name="observacoes" rows={2} defaultValue={sessao.observacoes ?? ""} className="campo" />
          </div>
          <BotaoEnviar>Salvar</BotaoEnviar>
        </Formulario>
        <form action={excluirSessao.bind(null, sessao.id, sessao.orcamento_id)}>
          <BotaoEnviar className="w-full py-2 text-sm text-rose-400 hover:text-rose-300" pendente="Apagando…">
            Apagar sessão (os insumos voltam ao estoque)
          </BotaoEnviar>
        </form>
      </section>
    </div>
  );
}
