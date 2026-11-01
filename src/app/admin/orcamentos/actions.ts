"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { registrarPedido, type ResultadoPedido } from "@/lib/pedidos";
import { criarClienteServidor } from "@/lib/supabase/server";
import { STATUS_ORCAMENTO } from "@/lib/constantes";
import { lerNumero } from "@/lib/numeros";
import { deCampoDataHora } from "@/lib/datas";

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
  return lerNumero(formData.get(campo));
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
  const proposta = deCampoDataHora(String(formData.get("proposta_data") ?? ""));

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

// ---------------------------------------------------------------------
// Pagamento (só no final; pode ter mais de um, ex.: tattoo em 2 sessões)
// ---------------------------------------------------------------------
const FORMAS = ["pix", "dinheiro", "debito", "credito"];

export async function registrarPagamento(
  orcamentoId: string,
  _: { erro?: string; ok?: string },
  formData: FormData,
): Promise<{ erro?: string; ok?: string }> {
  await exigirAdmin();
  const valor = lerNumero(formData.get("valor"));
  const forma = String(formData.get("forma") ?? "");
  const data = String(formData.get("data") ?? "");
  const finalizar = formData.get("finalizar") === "on";

  if (valor == null || Number.isNaN(valor) || valor <= 0) return { erro: "Informe o valor recebido." };
  if (!FORMAS.includes(forma)) return { erro: "Escolha a forma de pagamento." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Data inválida." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("pagamentos")
    .insert({ orcamento_id: orcamentoId, valor, forma, data });
  if (error) return { erro: "Não foi possível registrar o pagamento." };

  if (finalizar) {
    await supabase.from("orcamentos").update({ status: "concluido" }).eq("id", orcamentoId);
  }

  revalidatePath("/admin", "layout");
  return { ok: finalizar ? "Pagamento registrado e tattoo concluída." : "Pagamento registrado." };
}

export async function excluirPagamento(id: string) {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  await supabase.from("pagamentos").delete().eq("id", id);
  revalidatePath("/admin", "layout");
}
