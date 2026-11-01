import Link from "next/link";
import { LOCAIS_CORPO, type LocalCorpo, type StatusOrcamento } from "@/lib/constantes";
import { formatarData, formatarFaixa } from "@/lib/formatos";
import { SeloStatus } from "@/components/selo-status";

export type PedidoResumo = {
  id: string;
  numero: number;
  descricao: string;
  local_corpo: string;
  status: string;
  origem: string;
  valor_min: number | null;
  valor_max: number | null;
  criado_em: string;
  clientes: { nome: string } | null;
};

export const SELECT_RESUMO =
  "id, numero, descricao, local_corpo, status, origem, valor_min, valor_max, criado_em, clientes(nome)";

export function ListaPedidos({ pedidos }: { pedidos: PedidoResumo[] }) {
  if (pedidos.length === 0) {
    return <div className="cartao text-center text-stone-400">Nenhum pedido aqui.</div>;
  }
  return (
    <ul className="space-y-2">
      {pedidos.map((p) => (
        <li key={p.id}>
          <Link href={`/admin/orcamentos/${p.id}`} className="cartao block space-y-1 hover:border-stone-600">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">
                <span className="text-stone-500">#{p.numero}</span> {p.clientes?.nome ?? "—"}
              </p>
              <SeloStatus status={p.status as StatusOrcamento} />
            </div>
            <p className="line-clamp-1 text-sm text-stone-300">{p.descricao}</p>
            <p className="text-xs text-stone-500">
              {LOCAIS_CORPO[p.local_corpo as LocalCorpo]} · {formatarData(p.criado_em)}
              {p.origem === "whatsapp" && " · via WhatsApp"}
              {(p.valor_min ?? p.valor_max) != null && ` · ${formatarFaixa(p.valor_min, p.valor_max)}`}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
