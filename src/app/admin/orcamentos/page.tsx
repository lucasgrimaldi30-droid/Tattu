import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { type StatusOrcamento } from "@/lib/constantes";
import { ListaPedidos, SELECT_RESUMO, type PedidoResumo } from "@/components/lista-pedidos";

export const metadata: Metadata = { title: "Pedidos" };

const FILTROS: { valor: string; rotulo: string; status?: StatusOrcamento[] }[] = [
  { valor: "abertos", rotulo: "Em aberto", status: ["novo", "em_conversa", "orcado", "aceito", "agendado"] },
  { valor: "novo", rotulo: "Novos", status: ["novo"] },
  { valor: "negociando", rotulo: "Negociando", status: ["em_conversa", "orcado"] },
  { valor: "fechados", rotulo: "Fechados", status: ["aceito", "agendado"] },
  { valor: "concluido", rotulo: "Concluídos", status: ["concluido"] },
  { valor: "perdidos", rotulo: "Perdidos", status: ["recusado", "cancelado"] },
  { valor: "todos", rotulo: "Todos" },
];

export default async function Pedidos({ searchParams }: PageProps<"/admin/orcamentos">) {
  await exigirAdmin();
  const { status } = await searchParams;
  const filtro = FILTROS.find((f) => f.valor === status) ?? FILTROS[0];

  const supabase = await criarClienteServidor();
  let consulta = supabase
    .from("orcamentos")
    .select(SELECT_RESUMO)
    .order("criado_em", { ascending: false })
    .limit(200);
  if (filtro.status) consulta = consulta.in("status", filtro.status);
  const { data } = await consulta.returns<PedidoResumo[]>();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pedidos</h1>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={`/admin/orcamentos?status=${f.valor}`}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
              f.valor === filtro.valor
                ? "border-amber-400 bg-amber-400/10 text-amber-300"
                : "border-stone-700 text-stone-400"
            }`}
          >
            {f.rotulo}
          </Link>
        ))}
      </div>
      <ListaPedidos pedidos={data ?? []} />
    </div>
  );
}
