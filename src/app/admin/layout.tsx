import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/cabecalho";
import { sair } from "@/app/(site)/entrar/actions";

export const metadata: Metadata = { robots: { index: false } };

const MENU = [
  { href: "/admin", rotulo: "Painel" },
  { href: "/admin/orcamentos", rotulo: "Pedidos" },
  { href: "/admin/agenda", rotulo: "Agenda" },
  { href: "/admin/insumos", rotulo: "Insumos" },
  { href: "/admin/relatorios", rotulo: "Relatórios" },
] as const;

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <Cabecalho>
        <div className="flex items-center gap-1">
          <Link
            href="/admin/orcamentos/novo"
            className="whitespace-nowrap rounded-md bg-amber-400 px-3 py-1.5 text-sm font-semibold text-stone-950"
          >
            + Pedido
          </Link>
          <form action={sair}>
            <button type="submit" className="px-2 py-2 text-sm text-stone-400 hover:text-stone-100">
              Sair
            </button>
          </form>
        </div>
      </Cabecalho>
      <nav className="border-b border-stone-800">
        <div className="mx-auto flex max-w-3xl overflow-x-auto px-2 py-1.5 text-sm">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-stone-300 hover:bg-stone-800 hover:text-white"
            >
              {item.rotulo}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
