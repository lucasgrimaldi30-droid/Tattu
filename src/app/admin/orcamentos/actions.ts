"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { registrarPedido, type ResultadoPedido } from "@/lib/pedidos";
import { criarClienteServidor } from "@/lib/supabase/server";
import { STATUS_ORCAMENTO } from "@/lib/constantes";

/** Pedido lançado pelo tatuador (ex.: chegou pelo WhatsApp). */
export async function lancarPedido(formData: FormData): Promise<ResultadoPedido> {
  await exigirAdmin();
  const origem = formData.get("origem") === "manual" ? "manual" : "whatsapp";
  const resultado = await registrarPedido(formData, origem);
  revalidatePath("/admin", "layout");
  return resultado;
}

export type EstadoResposta = { erro?: string; ok?: boolean };

function numero(formData: FormData, campo: string) {
  let v = String(formData.get(campo) ?? "").trim().replace(/^R\$\s*/, "");
  // "1.200,50" (pt-BR) → "1200.50"; "1200.50" fica como está.
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

/** "2026-11-20T14:30" digitado no fuso da Bahia → ISO com -03:00. */
function dataHoraLocal(valor: string) {
  if (!valor) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return undefined;
  // America/Bahia não tem horário de verão: sempre UTC−3.
  return `${valor}:00-03:00`;
}

export async function responderOrcamento(
  id: string,
  _: EstadoResposta,
  formData: FormData,
): Promise<EstadoResposta> {
  await exigirAdmin();

  const valorMin = numero(formData, "valor_min");
  const valorMax = numero(formData, "valor_max");
  const horas = numero(formData, "tempo_horas");
  const sessoes = numero(formData, "sessoes_previstas");
  const status = String(formData.get("status") ?? "");
  const proposta = dataHoraLocal(String(formData.get("proposta_data") ?? ""));

  if ([valorMin, valorMax, horas, sessoes].some((n) => Number.isNaN(n))) {
    return { erro: "Confira os números (valores, horas e sessões)." };
  }
  if (valorMin != null && valorMax != null && valorMax < valorMin) {
    return { erro: "O valor máximo precisa ser maior ou igual ao mínimo." };
  }
  if (sessoes != null && (!Number.isInteger(sessoes) || sessoes < 1)) {
    return { erro: "Número de sessões inválido." };
  }
  if (!(status in STATUS_ORCAMENTO)) return { erro: "Status inválido." };
  if (proposta === undefined) return { erro: "Data proposta inválida." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("orcamentos")
    .update({
      valor_min: valorMin,
      valor_max: valorMax ?? valorMin,
      tempo_estimado_min: horas ? Math.round(horas * 60) : null,
      sessoes_previstas: sessoes,
      proposta_data: proposta,
      status,
      anotacoes: String(formData.get("anotacoes") ?? "").trim() || null,
    })
    .eq("id", id);

  if (error) {
    console.error("responderOrcamento", error);
    return { erro: "Não foi possível salvar." };
  }

  revalidatePath("/admin", "layout");
  return { ok: true };
}
