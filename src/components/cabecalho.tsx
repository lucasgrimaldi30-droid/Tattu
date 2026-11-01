import Link from "next/link";

export function Cabecalho({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-stone-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-amber-400">●</span> Estúdio
        </Link>
        {children}
      </div>
    </header>
  );
}
