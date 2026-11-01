import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { FormularioPedido } from "@/components/formulario-pedido";
import { lancarPedido } from "../actions";

export const metadata: Metadata = { title: "Lançar pedido" };

export default async function NovoPedido() {
  await exigirAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lançar pedido</h1>
        <p className="mt-1 text-stone-400">Para pedidos que chegaram pelo WhatsApp ou pessoalmente.</p>
      </div>
      <FormularioPedido enviar={lancarPedido} modo="admin" />
    </div>
  );
}
