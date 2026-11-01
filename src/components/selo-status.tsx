import { STATUS_ORCAMENTO, type StatusOrcamento } from "@/lib/constantes";

export function SeloStatus({ status }: { status: StatusOrcamento }) {
  const { rotulo, cor } = STATUS_ORCAMENTO[status];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cor}`}>
      {rotulo}
    </span>
  );
}
