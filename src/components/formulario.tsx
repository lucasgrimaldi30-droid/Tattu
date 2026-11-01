"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type EstadoAcao = { erro?: string; ok?: string };
export type Acao = (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;

/**
 * Formulário ligado a uma Server Action, com mensagem de erro/sucesso.
 * Os campos vêm como children (podem ser renderizados no servidor).
 */
export function Formulario({
  acao,
  children,
  className = "space-y-4",
}: {
  acao: Acao;
  children: ReactNode;
  className?: string;
}) {
  const [estado, acaoForm] = useActionState(acao, {});
  return (
    <form action={acaoForm} className={className}>
      {children}
      {estado.erro && (
        <p role="alert" className="rounded-lg bg-rose-950 px-3 py-2 text-sm text-rose-200">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="rounded-lg bg-emerald-950 px-3 py-2 text-sm text-emerald-200">
          {estado.ok}
        </p>
      )}
    </form>
  );
}

/** Botão de enviar que se desativa enquanto a ação roda. */
export function BotaoEnviar({
  children,
  pendente = "Salvando…",
  className = "botao",
  ...resto
}: {
  children: ReactNode;
  pendente?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} {...resto}>
      {pending ? pendente : children}
    </button>
  );
}
