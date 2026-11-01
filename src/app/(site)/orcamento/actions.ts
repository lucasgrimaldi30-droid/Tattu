"use server";

import { registrarPedido, type ResultadoPedido } from "@/lib/pedidos";

/** Pedido vindo do formulário público (sem login). */
export async function enviarPedidoPublico(formData: FormData): Promise<ResultadoPedido> {
  // Campo escondido: só robô preenche. Finge sucesso e não grava nada.
  if (String(formData.get("site_web") ?? "")) {
    return { id: "", numero: 0, uploads: [] };
  }
  return registrarPedido(formData, "site");
}
