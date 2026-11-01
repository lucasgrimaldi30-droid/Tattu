import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/formatos";
import { hojeNaBahia } from "@/lib/datas";
import { FormCompra } from "@/components/form-compra";
import { ListaCompras, type CompraLinha } from "@/components/lista-compras";
import { AbasInsumos } from "../abas";

export const metadata: Metadata = { title: "Compras" };

export default async function Compras() {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const [{ data: insumos }, { data: compras }] = await Promise.all([
    supabase.from("insumos").select("id, nome, unidade").eq("ativo", true).order("nome"),
    supabase
      .from("compras")
      .select("id, data, fornecedor, quantidade, valor_total, insumos(nome, unidade)")
      .order("data", { ascending: false })
      .limit(100)
      .returns<CompraLinha[]>(),
  ]);

  const mes = hojeNaBahia().slice(0, 7);
  const gastoNoMes = (compras ?? [])
    .filter((c) => c.data.startsWith(mes))
    .reduce((t, c) => t + Number(c.valor_total), 0);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Insumos</h1>
      <AbasInsumos atual="/admin/insumos/compras" />

      <section className="cartao space-y-3">
        <h2 className="font-semibold">Lançar compra</h2>
        {insumos?.length ? (
          <FormCompra insumos={insumos} />
        ) : (
          <p className="text-sm text-stone-400">Cadastre um insumo primeiro.</p>
        )}
      </section>

      <section className="cartao space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Últimas compras</h2>
          <span className="text-sm text-stone-400">No mês: <strong>{formatarMoeda(gastoNoMes)}</strong></span>
        </div>
        <ListaCompras compras={compras ?? []} />
      </section>
    </div>
  );
}
