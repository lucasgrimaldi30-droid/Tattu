/**
 * Normaliza para só dígitos com DDI 55: "(71) 99999-8888" → "5571999998888".
 * Devolve null se não parecer um telefone.
 */
export function normalizarTelefone(valor: string): string | null {
  let digitos = valor.replace(/\D/g, "");
  if (digitos.startsWith("0")) digitos = digitos.replace(/^0+/, "");
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (digitos.length < 12 || digitos.length > 15) return null;
  return digitos;
}

/** "5571999998888" → "(71) 99999-8888" */
export function formatarTelefone(digitos: string) {
  const local = digitos.startsWith("55") ? digitos.slice(2) : digitos;
  const m = local.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : `+${digitos}`;
}

/** Link que abre a conversa no WhatsApp, com texto opcional. */
export function linkWhatsApp(digitos: string, texto?: string) {
  const base = `https://wa.me/${digitos.replace(/\D/g, "")}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}
