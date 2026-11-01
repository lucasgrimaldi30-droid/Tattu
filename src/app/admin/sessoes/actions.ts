"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { deCampoDataHora } from "@/lib/datas";
import { lerNumero } from "@/lib/numeros";
import type { EstadoAcao } from "@/components/formulario";

const STATUS_SESSAO = ["agendada", "realizada", "cancelada"] as const;

function lerSessao(formData: FormData) {
  const inicio = deCampoDataHora(String(formData.get("inicio") ?? ""));
  const horas = lerNumero(formData.get("duracao_horas"));
  if (!inicio) return { erro: "Informe data e hora da sessão." } as const;
  if (horas == null || Number.isNaN(horas) || horas <= 0 || horas > 24) {
    return { erro: "Duração inválida (em horas)." } as const;
  }
  return { inicio, duracao_min: Math.round(horas * 60) } as const;
}

export async function criarSessao(
  orcamentoId: string,
  _: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  await exigirAdmin();
  const dados = lerSessao(formData);
  if ("erro" in dados) return { erro: dados.erro };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("sessoes").insert({ orcamento_id: orcamentoId, ...dados });
  if (error) return { erro: "Não foi possível agendar." };

  // Primeira sessão marcada: o pedido passa para "agendado".
  await supabase
    .from("orcamentos")
    .update({ status: "agendado" })
    .eq("id", orcamentoId)
    .in("status", ["novo", "em_conversa", "orcado", "aceito"]);

  revalidatePath("/admin", "layout");
  return { ok: "Sessão agendada." };
}

export async function atualizarSessao(
  id: string,
  _: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  await exigirAdmin();
  const dados = lerSessao(formData);
  if ("erro" in dados) return { erro: dados.erro };
  const status = String(formData.get("status") ?? "");
  if (!STATUS_SESSAO.includes(status as (typeof STATUS_SESSAO)[number])) {
    return { erro: "Situação inválida." };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("sessoes")
    .update({
      ...dados,
      status,
      observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };

  revalidatePath("/admin", "layout");
  return { ok: "Sessão salva." };
}

export async function marcarRealizada(id: string) {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  await supabase.from("sessoes").update({ status: "realizada" }).eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function excluirSessao(id: string, orcamentoId: string) {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  // Os insumos lançados voltam para o estoque (gatilho no banco).
  await supabase.from("sessoes").delete().eq("id", id);
  revalidatePath("/admin", "layout");
  redirect(`/admin/orcamentos/${orcamentoId}`);
}

// ---------------------------------------------------------------------
// Insumos usados na sessão
// ---------------------------------------------------------------------
export async function adicionarConsumo(
  sessaoId: string,
  _: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  await exigirAdmin();
  const insumoId = String(formData.get("insumo_id") ?? "");
  const quantidade = lerNumero(formData.get("quantidade"));
  if (!insumoId) return { erro: "Escolha o insumo." };
  if (quantidade == null || Number.isNaN(quantidade) || quantidade <= 0) {
    return { erro: "Quantidade inválida." };
  }

  const supabase = await criarClienteServidor();
  const { data: existente } = await supabase
    .from("consumos")
    .select("id, quantidade")
    .eq("sessao_id", sessaoId)
    .eq("insumo_id", insumoId)
    .maybeSingle();

  const { error } = existente
    ? await supabase
        .from("consumos")
        .update({ quantidade: Number(existente.quantidade) + quantidade })
        .eq("id", existente.id)
    : await supabase
        .from("consumos")
        .insert({ sessao_id: sessaoId, insumo_id: insumoId, quantidade });
  if (error) return { erro: "Não foi possível lançar." };

  revalidatePath("/admin", "layout");
  return {};
}

export async function removerConsumo(id: string) {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  await supabase.from("consumos").delete().eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function aplicarKit(sessaoId: string, kitId: string) {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  await supabase.rpc("aplicar_kit", { p_sessao_id: sessaoId, p_kit_id: kitId });
  revalidatePath("/admin", "layout");
}
