"use client";

import { useActionState } from "react";
import { entrar } from "./actions";

export function FormularioAcesso() {
  const [estado, acao, enviando] = useActionState(entrar, {});
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label htmlFor="email" className="rotulo">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="campo" />
      </div>
      <div>
        <label htmlFor="senha" className="rotulo">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required className="campo" />
      </div>
      {estado.erro && (
        <p role="alert" className="rounded-lg bg-rose-950 px-3 py-2 text-sm text-rose-200">
          {estado.erro}
        </p>
      )}
      <button type="submit" disabled={enviando} className="botao">
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
