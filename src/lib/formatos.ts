/** Formatação pt-BR: moeda em R$ e datas no fuso da Bahia. */

export const FUSO = "America/Bahia";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarMoeda(valor: number | string | null | undefined) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return moeda.format(Number(valor));
}

/** "R$ 800,00 – R$ 1.200,00", ou um valor só quando mín = máx. */
export function formatarFaixa(
  min: number | string | null,
  max: number | string | null,
) {
  if (min == null && max == null) return "—";
  if (min == null || max == null || Number(min) === Number(max)) {
    return formatarMoeda(min ?? max);
  }
  return `${formatarMoeda(min)} – ${formatarMoeda(max)}`;
}

export function formatarData(data: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(data));
}

export function formatarDataHora(data: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

/** 90 → "1h30", 240 → "4h", 45 → "45 min" */
export function formatarDuracao(minutos: number | null | undefined) {
  if (!minutos) return "—";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}
