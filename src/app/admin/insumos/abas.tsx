import Link from "next/link";

const ABAS = [
  { href: "/admin/insumos", rotulo: "Estoque" },
  { href: "/admin/insumos/compras", rotulo: "Compras" },
  { href: "/admin/insumos/kits", rotulo: "Kits" },
] as const;

export function AbasInsumos({ atual }: { atual: (typeof ABAS)[number]["href"] }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-900 p-1 text-sm">
      {ABAS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={`rounded-md py-2 text-center font-medium ${a.href === atual ? "bg-stone-700 text-white" : "text-stone-400 hover:text-stone-200"}`}
        >
          {a.rotulo}
        </Link>
      ))}
    </div>
  );
}
