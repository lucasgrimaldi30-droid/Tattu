"use client";

import { useActionState, useState } from "react";
import { cadastrar, entrar, enviarLinkMagico, type EstadoForm } from "./actions";

type Aba = "entrar" | "cadastrar" | "link";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "entrar", rotulo: "Entrar" },
  { id: "cadastrar", rotulo: "Criar conta" },
  { id: "link", rotulo: "Sem senha" },
];

export function FormularioAcesso({ proximo }: { proximo: string | null }) {
  const [aba, setAba] = useState<Aba>("entrar");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-900 p-1" role="tablist">
        {ABAS.map(({ id, rotulo }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`rounded-md px-2 py-2 text-sm font-medium transition ${
              aba === id ? "bg-stone-700 text-white" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "entrar" && <FormEntrar proximo={proximo} />}
      {aba === "cadastrar" && <FormCadastrar proximo={proximo} />}
      {aba === "link" && <FormLink proximo={proximo} />}
    </div>
  );
}

function Mensagem({ estado }: { estado: EstadoForm }) {
  if (estado.erro) {
    return (
      <p role="alert" className="rounded-lg bg-rose-950 px-3 py-2 text-sm text-rose-200">
        {estado.erro}
      </p>
    );
  }
  if (estado.aviso) {
    return (
      <p role="status" className="rounded-lg bg-emerald-950 px-3 py-2 text-sm text-emerald-200">
        {estado.aviso}
      </p>
    );
  }
  return null;
}

function CampoProximo({ proximo }: { proximo: string | null }) {
  return proximo ? <input type="hidden" name="proximo" value={proximo} /> : null;
}

function FormEntrar({ proximo }: { proximo: string | null }) {
  const [estado, acao, enviando] = useActionState(entrar, {});
  return (
    <form action={acao} className="space-y-4">
      <CampoProximo proximo={proximo} />
      <div>
        <label htmlFor="email" className="rotulo">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="campo" />
      </div>
      <div>
        <label htmlFor="senha" className="rotulo">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required className="campo" />
      </div>
      <Mensagem estado={estado} />
      <button type="submit" disabled={enviando} className="botao">
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

function FormCadastrar({ proximo }: { proximo: string | null }) {
  const [estado, acao, enviando] = useActionState(cadastrar, {});
  return (
    <form action={acao} className="space-y-4">
      <CampoProximo proximo={proximo} />
      <div>
        <label htmlFor="nome" className="rotulo">Nome</label>
        <input id="nome" name="nome" autoComplete="name" required className="campo" />
      </div>
      <div>
        <label htmlFor="telefone" className="rotulo">WhatsApp (opcional)</label>
        <input id="telefone" name="telefone" type="tel" autoComplete="tel" placeholder="(71) 99999-9999" className="campo" />
      </div>
      <div>
        <label htmlFor="email-cadastro" className="rotulo">E-mail</label>
        <input id="email-cadastro" name="email" type="email" autoComplete="email" required className="campo" />
      </div>
      <div>
        <label htmlFor="senha-cadastro" className="rotulo">Senha (mínimo 6 caracteres)</label>
        <input id="senha-cadastro" name="senha" type="password" minLength={6} autoComplete="new-password" required className="campo" />
      </div>
      <Mensagem estado={estado} />
      <button type="submit" disabled={enviando} className="botao">
        {enviando ? "Criando…" : "Criar conta"}
      </button>
    </form>
  );
}

function FormLink({ proximo }: { proximo: string | null }) {
  const [estado, acao, enviando] = useActionState(enviarLinkMagico, {});
  return (
    <form action={acao} className="space-y-4">
      <CampoProximo proximo={proximo} />
      <p className="text-sm text-stone-400">
        Sem senha: mandamos um link para o seu e-mail e você entra com um toque.
        Se ainda não tem conta, ela é criada na hora.
      </p>
      <div>
        <label htmlFor="email-link" className="rotulo">E-mail</label>
        <input id="email-link" name="email" type="email" autoComplete="email" required className="campo" />
      </div>
      <Mensagem estado={estado} />
      <button type="submit" disabled={enviando} className="botao">
        {enviando ? "Enviando…" : "Enviar link"}
      </button>
    </form>
  );
}
