import { formatarMoeda } from "@/lib/formatos";
import { formatarDia } from "@/lib/datas";
import { formatarQuantidade } from "@/lib/numeros";
import { excluirCompra } from "@/app/admin/insumos/actions";

export type CompraLinha = {
  id: string;
  data: string;
  fornecedor: string | null;
  quantidade: number;
  valor_total: number;
  insumos: { nome: string; unidade: string } | null;
};

export function ListaCompras({ compras, mostrarInsumo = true }: { compras: CompraLinha[]; mostrarInsumo?: boolean }) {
  if (!compras.length) return <p className="text-sm text-stone-400">Nenhuma compra lançada.</p>;
  return (
    <ul className="divide-y divide-stone-800 text-sm">
      {compras.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
          <span className="min-w-0">
            <span className="block truncate">
              {mostrarInsumo && <strong>{c.insumos?.nome} · </strong>}
              {formatarQuantidade(c.quantidade)} {c.insumos?.unidade}
            </span>
            <span className="block text-xs text-stone-500">
              {formatarDia(c.data)}{c.fornecedor && ` · ${c.fornecedor}`} · {formatarMoeda(Number(c.valor_total) / Number(c.quantidade))}/{c.insumos?.unidade}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {formatarMoeda(c.valor_total)}
            <form action={excluirCompra.bind(null, c.id)}>
              <button type="submit" aria-label="Apagar compra" title="Apagar (desfaz no estoque e no custo médio)" className="text-stone-500 hover:text-rose-400">✕</button>
            </form>
          </span>
        </li>
      ))}
    </ul>
  );
}
