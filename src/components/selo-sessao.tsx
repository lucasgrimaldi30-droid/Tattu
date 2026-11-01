const SESSAO: Record<string, { rotulo: string; cor: string }> = {
  agendada: { rotulo: "Agendada", cor: "bg-teal-100 text-teal-800" },
  realizada: { rotulo: "Realizada", cor: "bg-zinc-200 text-zinc-800" },
  cancelada: { rotulo: "Cancelada", cor: "bg-rose-100 text-rose-800" },
};

export function SeloSessao({ status }: { status: string }) {
  const { rotulo, cor } = SESSAO[status] ?? SESSAO.agendada;
  return (
    <span className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cor}`}>{rotulo}</span>
  );
}
