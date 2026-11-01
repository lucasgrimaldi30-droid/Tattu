/** Aceita só caminhos internos ("/algo"), para não virar redirecionamento aberto. */
export function caminhoSeguro(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) {
    return null;
  }
  return valor;
}
