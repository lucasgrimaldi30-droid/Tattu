/**
 * Datas no fuso America/Bahia, que é sempre UTC−3 (sem horário de verão).
 * Por isso dá para converter só somando/subtraindo 3 horas.
 */
const OFFSET_MS = 3 * 60 * 60 * 1000;

/** "2026-11-20T14:30" (campo datetime-local, hora da Bahia) → ISO com -03:00. */
export function deCampoDataHora(valor: string): string | null | undefined {
  if (!valor) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return undefined;
  return `${valor}:00-03:00`;
}

/** ISO → "2026-11-20T14:30" na hora da Bahia, para o campo datetime-local. */
export function paraCampoDataHora(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() - OFFSET_MS).toISOString().slice(0, 16);
}

/** Dia (YYYY-MM-DD) na Bahia de um instante. */
export function diaNaBahia(iso: string | Date = new Date()) {
  return new Date(new Date(iso).getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

export function hojeNaBahia() {
  return diaNaBahia(new Date());
}

export function ehDia(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(valor));
}

export function somarDias(dia: string, dias: number) {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Meia-noite do dia na Bahia, como ISO. */
export function inicioDoDia(dia: string) {
  return `${dia}T00:00:00-03:00`;
}

const DIA_SEMANA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
});

/** "2026-11-20" → "Sexta-feira, 20/11" */
export function formatarDiaSemana(dia: string) {
  return maiuscula(DIA_SEMANA.format(new Date(`${dia}T12:00:00Z`)));
}

/** "2026-11-20" → "20/11/2026" */
export function formatarDia(dia: string) {
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a}`;
}

/** ISO → "14:30" na Bahia */
export function formatarHora(iso: string) {
  return paraCampoDataHora(iso).slice(11, 16);
}

/** "2026-11-01" → "Novembro de 2026" */
export function formatarMes(primeiroDia: string) {
  return maiuscula(new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${primeiroDia}T12:00:00Z`),
  ));
}

function maiuscula(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
