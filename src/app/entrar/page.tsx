import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterUsuario, paginaInicial } from "@/lib/auth";
import { caminhoSeguro } from "@/lib/redirecionamento";
import { FormularioAcesso } from "./formulario-acesso";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  const params = await searchParams;
  const proximo = caminhoSeguro(params.proximo);

  const usuario = await obterUsuario();
  if (usuario) redirect(proximo ?? paginaInicial(usuario.role));

  return (
    <div className="mx-auto max-w-sm space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-bold">Acesse sua conta</h1>
        <p className="mt-1 text-stone-400">
          Para pedir orçamento e conversar com o tatuador.
        </p>
      </div>
      {params.erro === "link" && (
        <p role="alert" className="rounded-lg bg-rose-950 px-3 py-2 text-sm text-rose-200">
          O link expirou ou já foi usado. Peça um novo.
        </p>
      )}
      <FormularioAcesso proximo={proximo} />
    </div>
  );
}
