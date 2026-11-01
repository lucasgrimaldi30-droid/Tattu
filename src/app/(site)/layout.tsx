import { Cabecalho } from "@/components/cabecalho";

export default function LayoutSite({ children }: LayoutProps<"/">) {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
