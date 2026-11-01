import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/formatos";
import { formatarQuantidade } from "@/lib/numeros";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { FormCompra } from "@/components/form-compra";
import { ListaCompras, type CompraLinha } from "@/components/lista-compras";
import { CamposInsumo } from "../campos-insumo";
import { atualizarInsumo } from "../actions";

export const metadata: Metadata = { title: "Insumo" };

export default async function PaginaInsumo({ params }: PageProps<"/admin/insumos/[id]">) {
  await exigirAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await criarClienteServidor();
  const [{ data: insumo }, { data: compras }] = await Promise.all([
    supabase.from("insumos").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("compras")
      .select("id, data, fornecedor, quantidade, valor_total, insumos(nome, unidade)")
      .eq("insumo_id", id)
      .order("data", { ascending: false })
      .returns<CompraLinha[]>(),
  ]);
  if (!insumo) notFound();

  const baixo = Number(insumo.estoque_atual) < Number(insumo.estoque_minimo);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/insumos" className="text-sm text-amber-400 hover:underline">← Insumos</Link>
        <h1 className="text-2xl font-bold">{insumo.nome}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={`cartao ${baixo ? "border-rose-700" : ""}`}>
          <p className={`text-2xl font-bold ${baixo ? "text-rose-400" : ""}`}>
            {formatarQuantidade(insumo.estoque_atual)} <span className="text-base font-normal">{insumo.unidade}</span>
          </p>
          <p className="text-sm text-stone-400">em estoque (mín. {formatarQuantidade(insumo.estoque_minimo)})</p>
        </div>
        <div className="cartao">
          <p className="text-2xl font-bold">{formatarMoeda(insumo.custo_medio)}</p>
          <p className="text-sm text-stone-400">custo médio por {insumo.unidade}</p>
        </div>
      </div>

      <section className="cartao space-y-3">
        <h2 className="font-semibold">Lançar compra</h2>
        <FormCompra insumoFixo={{ id: insumo.id, unidade: insumo.unidade }} />
      </section>

      <section className="cartao space-y-3">
        <h2 className="font-semibold">Compras</h2>
        <ListaCompras compras={compras ?? []} mostrarInsumo={false} />
      </section>

      <details className="cartao">
        <summary className="cursor-pointer font-semibold">Editar cadastro</summary>
        <Formulario acao={atualizarInsumo.bind(null, insumo.id)} className="mt-4 space-y-3">
          <CamposInsumo inicial={insumo} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="ativo" defaultChecked={insumo.ativo} className="h-4 w-4 accent-amber-400" />
            Ativo (desmarque para esconder sem apagar o histórico)
          </label>
          <BotaoEnviar>Salvar</BotaoEnviar>
        </Formulario>
      </details>
    </div>
  );
}
