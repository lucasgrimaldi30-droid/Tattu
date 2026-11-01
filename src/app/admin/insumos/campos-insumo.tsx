import { CATEGORIAS_INSUMO } from "@/lib/constantes";
import { paraCampo } from "@/lib/numeros";

export function CamposInsumo({
  inicial,
}: {
  inicial?: { nome: string; categoria: string; unidade: string; estoque_minimo: number };
}) {
  return (
    <>
      <div>
        <label htmlFor="nome" className="rotulo">Nome</label>
        <input id="nome" name="nome" required defaultValue={inicial?.nome} placeholder="Ex.: Tinta preta Dynamic" className="campo" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="categoria" className="rotulo">Categoria</label>
          <select id="categoria" name="categoria" required defaultValue={inicial?.categoria ?? ""} className="campo">
            <option value="" disabled>Escolha…</option>
            {Object.entries(CATEGORIAS_INSUMO).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="unidade" className="rotulo">Unidade</label>
          <input id="unidade" name="unidade" required list="unidades" defaultValue={inicial?.unidade} placeholder="ml, unidade, par…" className="campo" />
          <datalist id="unidades">
            {["ml", "unidade", "par", "caixa", "rolo", "m", "g", "pacote"].map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
      </div>
      <div>
        <label htmlFor="estoque_minimo" className="rotulo">Estoque mínimo (alerta abaixo disso)</label>
        <input id="estoque_minimo" name="estoque_minimo" inputMode="decimal" defaultValue={paraCampo(inicial?.estoque_minimo ?? 0)} className="campo" />
      </div>
    </>
  );
}
