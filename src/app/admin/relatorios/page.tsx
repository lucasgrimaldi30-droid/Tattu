import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarDuracao, formatarMoeda } from "@/lib/formatos";
import { formatarMes, hojeNaBahia } from "@/lib/datas";
import { formatarPercentual, formatarQuantidade } from "@/lib/numeros";

export const metadata: Metadata = { title: "Relatórios" };

type Mes = {
  mes: string;
  faturamento: number;
  custo_insumos: number;
  margem: number;
  margem_pct: number | null;
  tattoos_pagas: number;
  sessoes_realizadas: number;
  minutos_tatuando: number;
};

type ResultadoPedido = {
  id: string;
  numero: number;
  cliente_nome: string;
  descricao: string;
  custo_insumos: number;
  recebido: number;
  margem: number;
  margem_pct: number | null;
  minutos_tatuando: number;
};

/** Primeiro dia do mês, 11 meses atrás (janela de 12 meses). */
function inicioJanela() {
  const [a, m] = hojeNaBahia().split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 - 11, 1));
  return d.toISOString().slice(0, 10);
}

function porHora(margem: number, minutos: number) {
  return minutos > 0 ? formatarMoeda((Number(margem) / minutos) * 60) + "/h" : null;
}

export default async function Relatorios() {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const desde = inicioJanela();

  const [{ data: meses }, { data: melhores }, { data: piores }, { data: porInsumo }, { data: insumos }] =
    await Promise.all([
      supabase.from("resultado_mensal").select("*").gte("mes", desde).order("mes", { ascending: false }).returns<Mes[]>(),
      supabase.from("resultado_pedidos").select("*").gt("recebido", 0).order("margem", { ascending: false }).limit(5).returns<ResultadoPedido[]>(),
      supabase.from("resultado_pedidos").select("*").gt("recebido", 0).order("margem", { ascending: true }).limit(5).returns<ResultadoPedido[]>(),
      supabase.from("custo_por_insumo_mensal").select("insumo_id, nome, unidade, quantidade, custo").gte("mes", desde),
      supabase.from("insumos").select("id, nome, unidade, estoque_atual, estoque_minimo").eq("ativo", true).order("nome"),
    ]);

  const totais = (meses ?? []).reduce(
    (t, m) => ({
      faturamento: t.faturamento + Number(m.faturamento),
      custo: t.custo + Number(m.custo_insumos),
      minutos: t.minutos + Number(m.minutos_tatuando),
      tattoos: t.tattoos + Number(m.tattoos_pagas),
    }),
    { faturamento: 0, custo: 0, minutos: 0, tattoos: 0 },
  );
  const margemTotal = totais.faturamento - totais.custo;
  const maiorFaturamento = Math.max(1, ...(meses ?? []).map((m) => Number(m.faturamento)));

  const insumosAgrupados = new Map<string, { nome: string; unidade: string; quantidade: number; custo: number }>();
  for (const linha of porInsumo ?? []) {
    const atual = insumosAgrupados.get(linha.insumo_id) ?? { nome: linha.nome, unidade: linha.unidade, quantidade: 0, custo: 0 };
    atual.quantidade += Number(linha.quantidade);
    atual.custo += Number(linha.custo);
    insumosAgrupados.set(linha.insumo_id, atual);
  }
  const rankingInsumos = [...insumosAgrupados.values()].sort((a, b) => b.custo - a.custo).slice(0, 8);
  const maiorCustoInsumo = Math.max(1, ...rankingInsumos.map((i) => i.custo));
  const baixos = (insumos ?? []).filter((i) => Number(i.estoque_atual) < Number(i.estoque_minimo));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-stone-400">Últimos 12 meses</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Numero titulo="Faturamento" valor={formatarMoeda(totais.faturamento)} />
        <Numero titulo="Custo de insumos" valor={formatarMoeda(totais.custo)} cor="text-rose-300" />
        <Numero
          titulo="Margem"
          valor={formatarMoeda(margemTotal)}
          detalhe={totais.faturamento ? formatarPercentual((margemTotal / totais.faturamento) * 100) : undefined}
          cor="text-emerald-300"
        />
        <Numero
          titulo="Horas tatuando"
          valor={formatarDuracao(totais.minutos)}
          detalhe={porHora(margemTotal, totais.minutos) ?? undefined}
        />
      </div>

      <section className="cartao space-y-3">
        <h2 className="font-semibold">Mês a mês</h2>
        {meses?.length ? (
          <ul className="space-y-3">
            {meses.map((m) => (
              <li key={m.mes} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{formatarMes(m.mes)}</span>
                  <span>
                    <strong>{formatarMoeda(m.faturamento)}</strong>
                    <span className="text-stone-500"> · margem </span>
                    <span className="text-emerald-300">{formatarMoeda(m.margem)}</span>
                  </span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-stone-800" aria-hidden="true">
                  <div className="bg-emerald-500" style={{ width: `${(Math.max(Number(m.margem), 0) / maiorFaturamento) * 100}%` }} />
                  <div className="bg-rose-400" style={{ width: `${(Math.min(Number(m.custo_insumos), Number(m.faturamento)) / maiorFaturamento) * 100}%` }} />
                </div>
                <p className="text-xs text-stone-500">
                  {m.tattoos_pagas} tattoo(s) paga(s) · {m.sessoes_realizadas} sessão(ões) · {formatarDuracao(m.minutos_tatuando)} ·
                  insumos {formatarMoeda(m.custo_insumos)} ({formatarPercentual(m.margem_pct)} de margem)
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">Sem pagamentos ou sessões registrados ainda.</p>
        )}
        <p className="text-xs text-stone-500">
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />margem
          <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />insumos
        </p>
      </section>

      <RankingPedidos titulo="Tattoos mais lucrativas" pedidos={melhores ?? []} />
      <RankingPedidos titulo="Tattoos menos lucrativas" pedidos={piores ?? []} />

      <section className="cartao space-y-3">
        <h2 className="font-semibold">Insumos que mais pesam no custo</h2>
        {rankingInsumos.length ? (
          <ul className="space-y-2.5">
            {rankingInsumos.map((i) => (
              <li key={i.nome} className="space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <span>{i.nome} <span className="text-stone-500">· {formatarQuantidade(i.quantidade)} {i.unidade}</span></span>
                  <strong>{formatarMoeda(i.custo)}</strong>
                </div>
                <div className="h-1.5 rounded-full bg-stone-800" aria-hidden="true">
                  <div className="h-full rounded-full bg-rose-400" style={{ width: `${(i.custo / maiorCustoInsumo) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">Nenhum insumo lançado em sessões ainda.</p>
        )}
      </section>

      <section className={`cartao space-y-3 ${baixos.length ? "border-rose-800" : ""}`}>
        <h2 className="font-semibold">Abaixo do estoque mínimo</h2>
        {baixos.length ? (
          <ul className="divide-y divide-stone-800 text-sm">
            {baixos.map((i) => (
              <li key={i.id}>
                <Link href={`/admin/insumos/${i.id}`} className="flex justify-between py-2 hover:text-amber-300">
                  <span>{i.nome}</span>
                  <span className="text-rose-400">
                    {formatarQuantidade(i.estoque_atual)} / mín. {formatarQuantidade(i.estoque_minimo)} {i.unidade}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">Tudo em ordem. ✓</p>
        )}
      </section>
    </div>
  );
}

function Numero({ titulo, valor, detalhe, cor = "" }: { titulo: string; valor: string; detalhe?: string; cor?: string }) {
  return (
    <div className="cartao">
      <p className={`text-xl font-bold ${cor}`}>{valor}</p>
      <p className="text-sm text-stone-400">
        {titulo}
        {detalhe && <span className="text-stone-500"> · {detalhe}</span>}
      </p>
    </div>
  );
}

function RankingPedidos({ titulo, pedidos }: { titulo: string; pedidos: ResultadoPedido[] }) {
  return (
    <section className="cartao space-y-3">
      <h2 className="font-semibold">{titulo}</h2>
      {pedidos.length ? (
        <ul className="divide-y divide-stone-800 text-sm">
          {pedidos.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/orcamentos/${p.id}`} className="flex items-center justify-between gap-3 py-2 hover:text-amber-300">
                <span className="min-w-0">
                  <span className="block truncate">
                    <span className="text-stone-500">#{p.numero}</span> {p.cliente_nome}
                  </span>
                  <span className="block truncate text-xs text-stone-500">
                    recebido {formatarMoeda(p.recebido)} · insumos {formatarMoeda(p.custo_insumos)}
                    {porHora(p.margem, p.minutos_tatuando) && ` · ${porHora(p.margem, p.minutos_tatuando)}`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <strong className="block text-emerald-300">{formatarMoeda(p.margem)}</strong>
                  <span className="text-xs text-stone-500">{formatarPercentual(p.margem_pct)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-400">Nenhuma tattoo paga ainda.</p>
      )}
    </section>
  );
}
