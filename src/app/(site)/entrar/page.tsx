import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterTatuador } from "@/lib/auth";
import { FormularioAcesso } from "./formulario-acesso";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function PaginaEntrar() {
  if (await obterTatuador()) redirect("/admin");

  return (
    <div className="mx-auto max-w-sm space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-bold">Área do tatuador</h1>
        <p className="mt-1 text-stone-400">Entre para ver pedidos, agenda e custos.</p>
      </div>
      <FormularioAcesso />
    </div>
  );
}
