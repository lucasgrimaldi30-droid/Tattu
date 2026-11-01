import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarDiaSemana, diaNaBahia, formatarHora, paraCampoDataHora } from "@/lib/datas";
import { formatarDuracao } from "@/lib/formatos";
import { paraCampo } from "@/lib/numeros";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { SeloSessao } from "@/components/selo-sessao";
import { criarSessao } from "@/app/admin/sessoes/actions";

export async function SecaoSessoes({
  orcamentoId,
  tempoEstimadoMin,
  propostaData,
}: {
  orcamentoId: string;
  tempoEstimadoMin: number | null;
  propostaData: string | null;
}) {
  const supabase = await criarClienteServidor();
  const { data: sessoes } = await supabase
    .from("sessoes")
    .select("id, inicio, duracao_min, status")
    .eq("orcamento_id", orcamentoId)
    .order("inicio");

  return (
    <section className="cartao space-y-4">
      <h2 className="font-semibold">Sessões</h2>

      {sessoes && sessoes.length > 0 ? (
        <ul className="divide-y divide-stone-800">
          {sessoes.map((s, i) => (
            <li key={s.id}>
              <Link href={`/admin/sessoes/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-amber-300">
                <span>
                  <span className="text-stone-500">{i + 1}ª · </span>
                  <span>{formatarDiaSemana(diaNaBahia(s.inicio))}</span>, {formatarHora(s.inicio)}
                  <span className="text-stone-500"> · {formatarDuracao(s.duracao_min)}</span>
                </span>
                <SeloSessao status={s.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-400">Nenhuma sessão marcada ainda.</p>
      )}

      <details className="group">
        <summary className="botao-secundario cursor-pointer list-none">+ Marcar sessão</summary>
        <Formulario acao={criarSessao.bind(null, orcamentoId)} className="mt-3 space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
            <div>
              <label htmlFor="inicio" className="rotulo">Data e hora</label>
              <input id="inicio" name="inicio" type="datetime-local" required defaultValue={paraCampoDataHora(propostaData)} className="campo" />
            </div>
            <div>
              <label htmlFor="duracao_horas" className="rotulo">Duração (h)</label>
              <input id="duracao_horas" name="duracao_horas" inputMode="decimal" required defaultValue={paraCampo(tempoEstimadoMin ? tempoEstimadoMin / 60 : 3)} className="campo" />
            </div>
          </div>
          <BotaoEnviar pendente="Agendando…">Agendar</BotaoEnviar>
        </Formulario>
      </details>
    </section>
  );
}
