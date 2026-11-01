import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/formatos";
import { formatarQuantidade } from "@/lib/numeros";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { AbasInsumos } from "../abas";
import { adicionarItemKit, criarKit, excluirKit, removerItemKit } from "../actions";

export const metadata: Metadata = { title: "Kits" };

type Kit = {
  id: string;
  nome: string;
  kit_itens: {
    id: string;
    quantidade: number;
    insumos: { nome: string; unidade: string; custo_medio: number } | null;
  }[];
};

export default async function Kits() {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const [{ data: kits }, { data: insumos }] = await Promise.all([
    supabase
      .from("kits")
      .select("id, nome, kit_itens(id, quantidade, insumos(nome, unidade, custo_medio))")
      .order("nome")
      .returns<Kit[]>(),
    supabase.from("insumos").select("id, nome, unidade").eq("ativo", true).order("nome"),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Insumos</h1>
      <AbasInsumos atual="/admin/insumos/kits" />
      <p className="text-sm text-stone-400">
        O kit padrão (luvas, filme, copinhos…) entra na sessão com um toque. Depois dá para ajustar.
      </p>

      {kits?.map((kit) => {
        const custo = kit.kit_itens.reduce(
          (t, i) => t + Number(i.quantidade) * Number(i.insumos?.custo_medio ?? 0),
          0,
        );
        return (
          <section key={kit.id} className="cartao space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">{kit.nome}</h2>
              <span className="text-sm text-stone-400">custo atual {formatarMoeda(custo)}</span>
            </div>
            {kit.kit_itens.length ? (
              <ul className="divide-y divide-stone-800 text-sm">
                {kit.kit_itens.map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-2">
                    <span>
                      {item.insumos?.nome}
                      <span className="text-stone-500"> · {formatarQuantidade(item.quantidade)} {item.insumos?.unidade}</span>
                    </span>
                    <form action={removerItemKit.bind(null, item.id)}>
                      <button type="submit" aria-label="Remover do kit" className="text-stone-500 hover:text-rose-400">✕</button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-400">Kit vazio.</p>
            )}
            {insumos?.length ? (
              <Formulario acao={adicionarItemKit.bind(null, kit.id)} className="space-y-2">
                <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
                  <select name="insumo_id" required defaultValue="" aria-label="Insumo" className="campo">
                    <option value="" disabled>Adicionar insumo…</option>
                    {insumos.map((i) => (
                      <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>
                    ))}
                  </select>
                  <input name="quantidade" inputMode="decimal" required placeholder="Qtd." aria-label="Quantidade" className="campo" />
                </div>
                <BotaoEnviar className="botao-secundario w-full" pendente="Adicionando…">Adicionar ao kit</BotaoEnviar>
              </Formulario>
            ) : null}
            <form action={excluirKit.bind(null, kit.id)}>
              <BotaoEnviar className="text-sm text-rose-400 hover:text-rose-300" pendente="Apagando…">Apagar kit</BotaoEnviar>
            </form>
          </section>
        );
      })}

      <section className="cartao space-y-3">
        <h2 className="font-semibold">Novo kit</h2>
        <Formulario acao={criarKit} className="flex gap-2">
          <input name="nome" required placeholder="Ex.: Kit padrão" aria-label="Nome do kit" className="campo" />
          <BotaoEnviar className="botao w-auto px-5" pendente="…">Criar</BotaoEnviar>
        </Formulario>
      </section>
    </div>
  );
}
