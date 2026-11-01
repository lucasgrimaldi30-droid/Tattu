import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { CATEGORIAS_INSUMO } from "@/lib/constantes";
import { formatarMoeda } from "@/lib/formatos";
import { formatarQuantidade } from "@/lib/numeros";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { AbasInsumos } from "./abas";
import { CamposInsumo } from "./campos-insumo";
import { criarInsumo } from "./actions";

export const metadata: Metadata = { title: "Insumos" };

export default async function Insumos() {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data: insumos } = await supabase
    .from("insumos")
    .select("id, nome, categoria, unidade, custo_medio, estoque_atual, estoque_minimo, ativo")
    .order("ativo", { ascending: false })
    .order("nome");

  const baixos = (insumos ?? []).filter((i) => i.ativo && Number(i.estoque_atual) < Number(i.estoque_minimo));
  const valorEmEstoque = (insumos ?? []).reduce(
    (t, i) => t + Math.max(Number(i.estoque_atual), 0) * Number(i.custo_medio),
    0,
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Insumos</h1>
      <AbasInsumos atual="/admin/insumos" />

      <div className="grid grid-cols-2 gap-3">
        <div className="cartao">
          <p className="text-2xl font-bold">{formatarMoeda(valorEmEstoque)}</p>
          <p className="text-sm text-stone-400">em estoque (custo)</p>
        </div>
        <div className={`cartao ${baixos.length ? "border-rose-700" : ""}`}>
          <p className={`text-2xl font-bold ${baixos.length ? "text-rose-400" : ""}`}>{baixos.length}</p>
          <p className="text-sm text-stone-400">abaixo do mínimo</p>
        </div>
      </div>

      {insumos && insumos.length > 0 ? (
        <ul className="space-y-2">
          {insumos.map((i) => {
            const baixo = i.ativo && Number(i.estoque_atual) < Number(i.estoque_minimo);
            return (
              <li key={i.id}>
                <Link
                  href={`/admin/insumos/${i.id}`}
                  className={`cartao flex items-center justify-between gap-3 hover:border-stone-600 ${baixo ? "border-rose-800" : ""} ${i.ativo ? "" : "opacity-50"}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{i.nome}</span>
                    <span className="block text-xs text-stone-500">
                      {CATEGORIAS_INSUMO[i.categoria as keyof typeof CATEGORIAS_INSUMO]} · {formatarMoeda(i.custo_medio)}/{i.unidade}
                      {!i.ativo && " · inativo"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`block font-semibold ${baixo ? "text-rose-400" : ""}`}>
                      {formatarQuantidade(i.estoque_atual)} {i.unidade}
                    </span>
                    <span className="block text-xs text-stone-500">mín. {formatarQuantidade(i.estoque_minimo)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="cartao text-center text-stone-400">Nenhum insumo cadastrado.</div>
      )}

      <details className="cartao" open={!insumos?.length}>
        <summary className="cursor-pointer font-semibold">+ Novo insumo</summary>
        <Formulario acao={criarInsumo} className="mt-4 space-y-3">
          <CamposInsumo />
          <p className="text-sm text-stone-400">Já tem em estoque? Informe para entrar com o custo certo (opcional):</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="estoque_inicial" className="rotulo">Quantidade</label>
              <input id="estoque_inicial" name="estoque_inicial" inputMode="decimal" className="campo" />
            </div>
            <div>
              <label htmlFor="valor_inicial" className="rotulo">Valor pago (R$)</label>
              <input id="valor_inicial" name="valor_inicial" inputMode="decimal" className="campo" />
            </div>
          </div>
          <BotaoEnviar pendente="Cadastrando…">Cadastrar</BotaoEnviar>
        </Formulario>
      </details>
    </div>
  );
}
