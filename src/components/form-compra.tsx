import { hojeNaBahia } from "@/lib/datas";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { lancarCompra } from "@/app/admin/insumos/actions";

/** Formulário de compra (entrada). Com `insumoFixo`, não mostra a escolha do insumo. */
export function FormCompra({
  insumos,
  insumoFixo,
}: {
  insumos?: { id: string; nome: string; unidade: string }[];
  insumoFixo?: { id: string; unidade: string };
}) {
  return (
    <Formulario acao={lancarCompra} className="space-y-3">
      {insumoFixo ? (
        <input type="hidden" name="insumo_id" value={insumoFixo.id} />
      ) : (
        <div>
          <label htmlFor="insumo_id" className="rotulo">Insumo</label>
          <select id="insumo_id" name="insumo_id" required defaultValue="" className="campo">
            <option value="" disabled>Escolha…</option>
            {insumos?.map((i) => (
              <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="quantidade" className="rotulo">Quantidade{insumoFixo ? ` (${insumoFixo.unidade})` : ""}</label>
          <input id="quantidade" name="quantidade" inputMode="decimal" required className="campo" />
        </div>
        <div>
          <label htmlFor="valor_total" className="rotulo">Valor total (R$)</label>
          <input id="valor_total" name="valor_total" inputMode="decimal" required className="campo" />
        </div>
        <div>
          <label htmlFor="data" className="rotulo">Data</label>
          <input id="data" name="data" type="date" required defaultValue={hojeNaBahia()} className="campo" />
        </div>
        <div>
          <label htmlFor="fornecedor" className="rotulo">Fornecedor</label>
          <input id="fornecedor" name="fornecedor" className="campo" />
        </div>
      </div>
      <BotaoEnviar pendente="Lançando…">Lançar compra</BotaoEnviar>
    </Formulario>
  );
}
