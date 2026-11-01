import Link from "next/link";
import { obterUsuario, paginaInicial } from "@/lib/auth";
import { sair } from "@/app/entrar/actions";

export async function Cabecalho() {
  const usuario = await obterUsuario();

  return (
    <header className="border-b border-stone-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-amber-400">●</span> Estúdio
        </Link>

        {usuario ? (
          <nav className="flex items-center gap-2 text-sm">
            <Link href={paginaInicial(usuario.role)} className="botao-secundario">
              {usuario.role === "admin" ? "Painel" : "Meus orçamentos"}
            </Link>
            <form action={sair}>
              <button type="submit" className="px-2 py-2 text-stone-400 hover:text-stone-100">
                Sair
              </button>
            </form>
          </nav>
        ) : (
          <Link href="/entrar" className="botao-secundario">
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
