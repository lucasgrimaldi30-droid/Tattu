import type { Metadata } from "next";
import { FormularioPedido } from "@/components/formulario-pedido";
import { enviarPedidoPublico } from "./actions";

export const metadata: Metadata = { title: "Pedir orçamento" };

export default function PaginaOrcamento() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedir orçamento</h1>
        <p className="mt-1 text-stone-400">
          Leva 2 minutos. Depois de enviar, a gente continua a conversa no WhatsApp.
        </p>
      </div>
      <FormularioPedido enviar={enviarPedidoPublico} modo="publico" />
    </div>
  );
}
