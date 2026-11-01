import type { Metadata } from "next";
import { exigirUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { LOCAIS_CORPO, type LocalCorpo, type StatusOrcamento } from "@/lib/constantes";
import { formatarData, formatarFaixa } from "@/lib/formatos";
import { SeloStatus } from "@/components/selo-status";

export const metadata: Metadata = { title: "Meus orçamentos" };

export default async function MeusOrcamentos() {
  const usuario = await exigirUsuario("/meus-orcamentos");
  const supabase = await criarClienteServidor();

  const { data: orcamentos, error } = await supabase
    .from("orcamentos")
    .select("id, descricao, local_corpo, status, valor_min, valor_max, criado_em")
    .eq("cliente_id", usuario.id)
    .order("criado_em", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {usuario.nome.split(" ")[0] || "tudo bem"}!</h1>
        <p className="mt-1 text-stone-400">Acompanhe aqui seus pedidos de orçamento.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-950 px-3 py-2 text-sm text-rose-200">
          Não foi possível carregar seus orçamentos.
        </p>
      )}

      {orcamentos && orcamentos.length === 0 && (
        <div className="cartao text-center text-stone-400">
          Você ainda não pediu nenhum orçamento.
        </div>
      )}

      <ul className="space-y-3">
        {orcamentos?.map((o) => (
          <li key={o.id} className="cartao space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className="line-clamp-2 font-medium">{o.descricao}</p>
              <SeloStatus status={o.status as StatusOrcamento} />
            </div>
            <p className="text-sm text-stone-400">
              {LOCAIS_CORPO[o.local_corpo as LocalCorpo]} · pedido em {formatarData(o.criado_em)}
              {(o.valor_min ?? o.valor_max) != null &&
                ` · ${formatarFaixa(o.valor_min, o.valor_max)}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
