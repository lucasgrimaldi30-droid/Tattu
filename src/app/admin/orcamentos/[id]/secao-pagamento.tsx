import { criarClienteServidor } from "@/lib/supabase/server";
import { FORMAS_PAGAMENTO } from "@/lib/constantes";
import { formatarMoeda } from "@/lib/formatos";
import { formatarDia, hojeNaBahia } from "@/lib/datas";
import { formatarPercentual, paraCampo } from "@/lib/numeros";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { excluirPagamento, registrarPagamento } from "../actions";

export async function SecaoPagamento({
  orcamentoId,
  valorSugerido,
  concluido,
}: {
  orcamentoId: string;
  valorSugerido: number | null;
  concluido: boolean;
}) {
  const supabase = await criarClienteServidor();
  const [{ data: pagamentos }, { data: resultado }] = await Promise.all([
    supabase.from("pagamentos").select("id, valor, forma, data").eq("orcamento_id", orcamentoId).order("data"),
    supabase
      .from("resultado_pedidos")
      .select("custo_insumos, recebido, margem, margem_pct")
      .eq("id", orcamentoId)
      .maybeSingle(),
  ]);

  return (
    <section className="cartao space-y-4">
      <h2 className="font-semibold">Pagamento e resultado</h2>

      {resultado && (
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-stone-900 p-2">
            <dt className="text-xs text-stone-500">Recebido</dt>
            <dd className="font-semibold">{formatarMoeda(resultado.recebido)}</dd>
          </div>
          <div className="rounded-lg bg-stone-900 p-2">
            <dt className="text-xs text-stone-500">Insumos</dt>
            <dd className="font-semibold text-rose-300">{formatarMoeda(resultado.custo_insumos)}</dd>
          </div>
          <div className="rounded-lg bg-stone-900 p-2">
            <dt className="text-xs text-stone-500">Margem</dt>
            <dd className="font-semibold text-emerald-300">
              {formatarMoeda(resultado.margem)}
              <span className="block text-xs font-normal text-stone-400">{formatarPercentual(resultado.margem_pct)}</span>
            </dd>
          </div>
        </dl>
      )}

      {pagamentos && pagamentos.length > 0 && (
        <ul className="divide-y divide-stone-800 text-sm">
          {pagamentos.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                {formatarDia(p.data)} · {FORMAS_PAGAMENTO[p.forma as keyof typeof FORMAS_PAGAMENTO]}
              </span>
              <span className="flex items-center gap-3">
                <strong>{formatarMoeda(p.valor)}</strong>
                <form action={excluirPagamento.bind(null, p.id)}>
                  <button type="submit" aria-label="Apagar pagamento" className="text-stone-500 hover:text-rose-400">✕</button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Formulario acao={registrarPagamento.bind(null, orcamentoId)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="valor" className="rotulo">Valor recebido (R$)</label>
            <input id="valor" name="valor" inputMode="decimal" required defaultValue={pagamentos?.length ? "" : paraCampo(valorSugerido)} className="campo" />
          </div>
          <div>
            <label htmlFor="data" className="rotulo">Data</label>
            <input id="data" name="data" type="date" required defaultValue={hojeNaBahia()} className="campo" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(FORMAS_PAGAMENTO).map(([valor, rotulo]) => (
            <label key={valor} className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-700 px-3 py-2 text-sm has-checked:border-amber-400 has-checked:bg-amber-400/10">
              <input type="radio" name="forma" value={valor} required defaultChecked={valor === "pix"} className="accent-amber-400" />
              {rotulo}
            </label>
          ))}
        </div>
        {!concluido && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="finalizar" defaultChecked className="h-4 w-4 accent-amber-400" />
            Tattoo finalizada (marca o pedido como concluído)
          </label>
        )}
        <BotaoEnviar pendente="Registrando…">Registrar pagamento</BotaoEnviar>
      </Formulario>
    </section>
  );
}
