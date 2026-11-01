import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaPedidos, SELECT_RESUMO, type PedidoResumo } from "@/components/lista-pedidos";
import { formatarMoeda } from "@/lib/formatos";
import { hojeNaBahia } from "@/lib/datas";

export const metadata: Metadata = { title: "Painel" };

/** Domingo 00:00 até o domingo seguinte, no fuso da Bahia (UTC−3, sem horário de verão). */
function semanaAtual() {
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000); // relógio da Bahia em UTC
  const inicio = new Date(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() - agora.getUTCDay()),
  );
  const fim = new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => `${d.toISOString().slice(0, 10)}T00:00:00-03:00`;
  return { inicio: iso(inicio), fim: iso(fim) };
}

export default async function Painel() {
  const tatuador = await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { inicio, fim } = semanaAtual();

  const mesAtual = `${hojeNaBahia().slice(0, 7)}-01`;
  const [novos, negociando, sessoes, insumos, recentes, resultadoMes] = await Promise.all([
    supabase.from("orcamentos").select("id", { count: "exact", head: true }).eq("status", "novo"),
    supabase
      .from("orcamentos")
      .select("id", { count: "exact", head: true })
      .in("status", ["em_conversa", "orcado"]),
    supabase
      .from("sessoes")
      .select("id", { count: "exact", head: true })
      .eq("status", "agendada")
      .gte("inicio", inicio)
      .lt("inicio", fim),
    supabase.from("insumos").select("estoque_atual, estoque_minimo").eq("ativo", true),
    supabase
      .from("orcamentos")
      .select(SELECT_RESUMO)
      .eq("status", "novo")
      .order("criado_em", { ascending: false })
      .limit(5)
      .returns<PedidoResumo[]>(),
    supabase.from("resultado_mensal").select("faturamento, margem").eq("mes", mesAtual).maybeSingle(),
  ]);

  const abaixoDoMinimo =
    insumos.data?.filter((i) => Number(i.estoque_atual) < Number(i.estoque_minimo)).length ?? 0;

  const cartoes = [
    { titulo: "Pedidos novos", valor: novos.count ?? 0, href: "/admin/orcamentos?status=novo" },
    { titulo: "Em negociação", valor: negociando.count ?? 0, href: "/admin/orcamentos?status=negociando" },
    { titulo: "Sessões nesta semana", valor: sessoes.count ?? 0, href: "/admin/agenda" },
    { titulo: "Insumos abaixo do mínimo", valor: abaixoDoMinimo, alerta: abaixoDoMinimo > 0, href: "/admin/insumos" },
    { titulo: "Faturado no mês", valor: formatarMoeda(resultadoMes.data?.faturamento ?? 0), href: "/admin/relatorios" },
    { titulo: "Margem no mês", valor: formatarMoeda(resultadoMes.data?.margem ?? 0), href: "/admin/relatorios" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="mt-1 text-stone-400">Olá, {tatuador.nome || "tatuador"}.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cartoes.map((c) => {
          const conteudo = (
            <>
              <p className={`text-2xl font-bold ${c.alerta ? "text-rose-400" : ""}`}>{c.valor}</p>
              <p className="mt-1 text-sm text-stone-400">{c.titulo}</p>
            </>
          );
          const classe = `cartao block ${c.alerta ? "border-rose-700" : ""}`;
          return c.href ? (
            <Link key={c.titulo} href={c.href} className={`${classe} hover:border-stone-600`}>
              {conteudo}
            </Link>
          ) : (
            <div key={c.titulo} className={classe}>{conteudo}</div>
          );
        })}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pedidos novos</h2>
        <ListaPedidos pedidos={recentes.data ?? []} />
      </section>
    </div>
  );
}
