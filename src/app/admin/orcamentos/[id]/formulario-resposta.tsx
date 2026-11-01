"use client";

import { useActionState } from "react";
import { STATUS_ORCAMENTO } from "@/lib/constantes";
import { responderOrcamento } from "../actions";

type Inicial = {
  status: string;
  valor_min: number | null;
  valor_max: number | null;
  tempo_horas: number | null;
  sessoes_previstas: number | null;
  proposta_data: string;
  anotacoes: string;
};

const br = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));

export function FormularioResposta({ id, inicial }: { id: string; inicial: Inicial }) {
  const [estado, acao, salvando] = useActionState(responderOrcamento.bind(null, id), {});

  return (
    <form action={acao} className="space-y-4">
      <div>
        <label htmlFor="status" className="rotulo">Situação</label>
        <select id="status" name="status" defaultValue={inicial.status} className="campo">
          {Object.entries(STATUS_ORCAMENTO).map(([valor, { rotulo }]) => (
            <option key={valor} value={valor}>{rotulo}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="valor_min" className="rotulo">Valor mín. (R$)</label>
          <input id="valor_min" name="valor_min" inputMode="decimal" defaultValue={br(inicial.valor_min)} placeholder="800" className="campo" />
        </div>
        <div>
          <label htmlFor="valor_max" className="rotulo">Valor máx. (R$)</label>
          <input id="valor_max" name="valor_max" inputMode="decimal" defaultValue={br(inicial.valor_max)} placeholder="1.200" className="campo" />
        </div>
        <div>
          <label htmlFor="tempo_horas" className="rotulo">Tempo/sessão (h)</label>
          <input id="tempo_horas" name="tempo_horas" inputMode="decimal" defaultValue={br(inicial.tempo_horas)} placeholder="4" className="campo" />
        </div>
        <div>
          <label htmlFor="sessoes_previstas" className="rotulo">Sessões</label>
          <input id="sessoes_previstas" name="sessoes_previstas" inputMode="numeric" defaultValue={br(inicial.sessoes_previstas)} placeholder="1" className="campo" />
        </div>
      </div>

      <div>
        <label htmlFor="proposta_data" className="rotulo">Data proposta</label>
        <input id="proposta_data" name="proposta_data" type="datetime-local" defaultValue={inicial.proposta_data} className="campo" />
      </div>

      <div>
        <label htmlFor="anotacoes" className="rotulo">Anotações</label>
        <textarea id="anotacoes" name="anotacoes" rows={3} defaultValue={inicial.anotacoes} placeholder="O que foi combinado no WhatsApp…" className="campo" />
      </div>

      {estado.erro && (
        <p role="alert" className="rounded-lg bg-rose-950 px-3 py-2 text-sm text-rose-200">{estado.erro}</p>
      )}
      {estado.ok && !salvando && (
        <p role="status" className="rounded-lg bg-emerald-950 px-3 py-2 text-sm text-emerald-200">Salvo.</p>
      )}

      <button type="submit" disabled={salvando} className="botao">
        {salvando ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
