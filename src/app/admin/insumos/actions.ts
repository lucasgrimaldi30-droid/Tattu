"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { CATEGORIAS_INSUMO } from "@/lib/constantes";
import { lerNumero } from "@/lib/numeros";
import type { EstadoAcao } from "@/components/formulario";

function lerInsumo(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "");
  const unidade = String(formData.get("unidade") ?? "").trim();
  const minimo = lerNumero(formData.get("estoque_minimo"));
  if (!nome) return { erro: "Informe o nome." } as const;
  if (!(categoria in CATEGORIAS_INSUMO)) return { erro: "Escolha a categoria." } as const;
  if (!unidade) return { erro: "Informe a unidade (ml, unidade, caixa…)." } as const;
  if (Number.isNaN(minimo)) return { erro: "Estoque mínimo inválido." } as const;
  return { nome, categoria, unidade, estoque_minimo: minimo ?? 0 } as const;
}

export async function criarInsumo(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirAdmin();
  const dados = lerInsumo(formData);
  if ("erro" in dados) return { erro: dados.erro };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("insumos").insert(dados).select("id").single();
  if (error || !data) return { erro: "Não foi possível cadastrar." };

  // Estoque inicial entra como uma compra, para já ter custo médio.
  const qtd = lerNumero(formData.get("estoque_inicial"));
  const valor = lerNumero(formData.get("valor_inicial"));
  if (qtd && qtd > 0 && valor != null && !Number.isNaN(valor)) {
    await supabase
      .from("compras")
      .insert({ insumo_id: data.id, quantidade: qtd, valor_total: valor, fornecedor: "Estoque inicial" });
  }

  revalidatePath("/admin", "layout");
  return { ok: `${dados.nome} cadastrado.` };
}

export async function atualizarInsumo(id: string, _: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirAdmin();
  const dados = lerInsumo(formData);
  if ("erro" in dados) return { erro: dados.erro };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("insumos")
    .update({ ...dados, ativo: formData.get("ativo") === "on" })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };

  revalidatePath("/admin", "layout");
  return { ok: "Salvo." };
}

export async function lancarCompra(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirAdmin();
  const insumoId = String(formData.get("insumo_id") ?? "");
  const quantidade = lerNumero(formData.get("quantidade"));
  const valor = lerNumero(formData.get("valor_total"));
  const data = String(formData.get("data") ?? "");
  const fornecedor = String(formData.get("fornecedor") ?? "").trim() || null;

  if (!insumoId) return { erro: "Escolha o insumo." };
  if (quantidade == null || Number.isNaN(quantidade) || quantidade <= 0) return { erro: "Quantidade inválida." };
  if (valor == null || Number.isNaN(valor)) return { erro: "Informe o valor total pago." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Data inválida." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("compras")
    .insert({ insumo_id: insumoId, quantidade, valor_total: valor, data, fornecedor });
  if (error) return { erro: "Não foi possível lançar a compra." };

  revalidatePath("/admin", "layout");
  return { ok: "Compra lançada: estoque e custo médio atualizados." };
}

export async function excluirCompra(id: string) {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  await supabase.from("compras").delete().eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function criarKit(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Dê um nome ao kit." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("kits").insert({ nome });
  if (error) return { erro: "Não foi possível criar o kit." };
  revalidatePath("/admin", "layout");
  return {};
}

export async function excluirKit(id: string) {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  await supabase.from("kits").delete().eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function adicionarItemKit(kitId: string, _: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirAdmin();
  const insumoId = String(formData.get("insumo_id") ?? "");
  const quantidade = lerNumero(formData.get("quantidade"));
  if (!insumoId) return { erro: "Escolha o insumo." };
  if (quantidade == null || Number.isNaN(quantidade) || quantidade <= 0) return { erro: "Quantidade inválida." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("kit_itens")
    .upsert({ kit_id: kitId, insumo_id: insumoId, quantidade }, { onConflict: "kit_id,insumo_id" });
  if (error) return { erro: "Não foi possível adicionar." };
  revalidatePath("/admin", "layout");
  return {};
}

export async function removerItemKit(id: string) {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  await supabase.from("kit_itens").delete().eq("id", id);
  revalidatePath("/admin", "layout");
}
