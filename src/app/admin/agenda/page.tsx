import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  diaNaBahia,
  ehDia,
  formatarDia,
  formatarDiaSemana,
  formatarHora,
  hojeNaBahia,
  inicioDoDia,
    somarDias,
} from "@/lib/datas";
import { formatarDuracao } from "@/lib/formatos";
import { SeloSessao } from "@/components/selo-sessao";

export const metadata: Metadata = { title: "Agenda" };

type SessaoAgenda = {
  id: string;
  inicio: string;
  duracao_min: number;
  status: string;
  orcamentos: { numero: number; descricao: string; clientes: { nome: string } | null } | null;
};

export default async function Agenda({ searchParams }: PageProps<"/admin/agenda">) {
  await exigirAdmin();
  const { de } = await searchParams;
  const hoje = hojeNaBahia();
  // Sete dias a partir de hoje (ou da data escolhida).
  const inicio = ehDia(de) ? de : hoje;
  const fim = somarDias(inicio, 6);

  const supabase = await criarClienteServidor();
  const { data: sessoes } = await supabase
    .from("sessoes")
    .select("id, inicio, duracao_min, status, orcamentos(numero, descricao, clientes(nome))")
    .gte("inicio", inicioDoDia(inicio))
    .lt("inicio", inicioDoDia(somarDias(inicio, 7)))
    .order("inicio")
    .returns<SessaoAgenda[]>();

  const dias = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
  const porDia = new Map<string, SessaoAgenda[]>();
  for (const s of sessoes ?? []) {
    const dia = diaNaBahia(s.inicio);
    porDia.set(dia, [...(porDia.get(dia) ?? []), s]);
  }
  const minutosNaSemana = (sessoes ?? [])
    .filter((s) => s.status !== "cancelada")
    .reduce((t, s) => t + s.duracao_min, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-stone-400">
            {formatarDia(inicio).slice(0, 5)} a {formatarDia(fim)} · {formatarDuracao(minutosNaSemana)} marcadas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <Link href={`/admin/agenda?de=${somarDias(inicio, -7)}`} className="botao-secundario">← Anterior</Link>
        <Link href="/admin/agenda" className="botao-secundario">Hoje</Link>
        <Link href={`/admin/agenda?de=${somarDias(inicio, 7)}`} className="botao-secundario">Próxima →</Link>
      </div>

      <ol className="space-y-3">
        {dias.map((dia) => {
          const doDia = porDia.get(dia) ?? [];
          return (
            <li key={dia} className={`cartao ${dia === hoje ? "border-amber-400/60" : ""} ${doDia.length ? "" : "py-2.5"}`}>
              <h2 className={`text-sm font-semibold ${dia === hoje ? "text-amber-300" : doDia.length ? "" : "text-stone-500"}`}>
                {formatarDiaSemana(dia)}{dia === hoje && " · hoje"}
              </h2>
              {doDia.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {doDia.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/admin/sessoes/${s.id}`}
                        className={`flex items-start gap-3 rounded-lg bg-stone-900 p-2.5 hover:bg-stone-800 ${s.status === "cancelada" ? "opacity-50" : ""}`}
                      >
                        <span className="w-12 shrink-0 font-mono text-amber-300">{formatarHora(s.inicio)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{s.orcamentos?.clientes?.nome}</span>
                          <span className="block truncate text-xs text-stone-400">
                            #{s.orcamentos?.numero} · {formatarDuracao(s.duracao_min)} · {s.orcamentos?.descricao}
                          </span>
                        </span>
                        <SeloSessao status={s.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
