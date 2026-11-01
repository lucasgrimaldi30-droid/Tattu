import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FUSO } from "@/lib/formatos";

export const metadata: Metadata = { title: "Painel" };

/** Início e fim (domingo a domingo) da semana atual no fuso da Bahia (UTC−3). */
function semanaAtual() {
  const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: FUSO }));
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - hoje.getDay());
  const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 7);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00-03:00`;
  return { inicio: iso(inicio), fim: iso(fim) };
}

export default async function Painel() {
  const usuario = await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { inicio, fim } = semanaAtual();

  const [novos, naoLidas, sessoes, insumos] = await Promise.all([
    supabase.from("orcamentos").select("id", { count: "exact", head: true }).eq("status", "novo"),
    supabase
      .from("mensagens")
      .select("id", { count: "exact", head: true })
      .eq("lida", false)
      .neq("autor_id", usuario.id),
    supabase
      .from("sessoes")
      .select("id", { count: "exact", head: true })
      .eq("status", "agendada")
      .gte("inicio", inicio)
      .lt("inicio", fim),
    supabase.from("insumos").select("estoque_atual, estoque_minimo").eq("ativo", true),
  ]);

  const abaixoDoMinimo =
    insumos.data?.filter((i) => Number(i.estoque_atual) < Number(i.estoque_minimo)).length ?? 0;

  const cartoes = [
    { titulo: "Orçamentos novos", valor: novos.count ?? 0 },
    { titulo: "Mensagens não lidas", valor: naoLidas.count ?? 0 },
    { titulo: "Sessões desta semana", valor: sessoes.count ?? 0 },
    { titulo: "Insumos abaixo do mínimo", valor: abaixoDoMinimo, alerta: abaixoDoMinimo > 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="mt-1 text-stone-400">Bem-vindo, {usuario.nome || "tatuador"}.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cartoes.map((c) => (
          <div key={c.titulo} className={`cartao ${c.alerta ? "border-rose-700" : ""}`}>
            <p className={`text-3xl font-bold ${c.alerta ? "text-rose-400" : ""}`}>{c.valor}</p>
            <p className="mt-1 text-sm text-stone-400">{c.titulo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
