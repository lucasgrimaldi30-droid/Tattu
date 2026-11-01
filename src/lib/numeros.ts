/**
 * Lê número digitado em pt-BR: "1.200,50", "1200,5", "1200.50", "R$ 80".
 * Vazio → null. Inválido ou negativo → NaN.
 */
export function lerNumero(valor: FormDataEntryValue | null): number | null {
  let v = String(valor ?? "").trim().replace(/^R\$\s*/, "");
  if (!v) return null;
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

/** 1.5 → "1,5" para preencher campos. */
export function paraCampo(n: number | string | null | undefined) {
  return n == null ? "" : String(Number(n)).replace(".", ",");
}

const QUANTIDADE = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
export function formatarQuantidade(n: number | string) {
  return QUANTIDADE.format(Number(n));
}

export function formatarPercentual(n: number | string | null | undefined) {
  if (n == null) return "—";
  return `${String(Number(n).toFixed(1)).replace(".", ",")}%`;
}
