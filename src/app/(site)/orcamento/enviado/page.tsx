import type { Metadata } from "next";
import { linkWhatsApp } from "@/lib/telefone";

export const metadata: Metadata = { title: "Pedido enviado", robots: { index: false } };

export default async function PedidoEnviado({ searchParams }: PageProps<"/orcamento/enviado">) {
  const { n } = await searchParams;
  const numero = typeof n === "string" && /^\d+$/.test(n) && n !== "0" ? n : null;
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_TATUADOR;

  const mensagem = numero
    ? `Olá! Acabei de enviar o pedido de orçamento #${numero} pelo site.`
    : "Olá! Acabei de enviar um pedido de orçamento pelo site.";

  return (
    <div className="space-y-6 py-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-3xl text-emerald-400">
        ✓
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Pedido recebido!</h1>
        {numero && <p className="text-stone-300">Seu número de pedido é <strong>#{numero}</strong>.</p>}
        <p className="text-stone-400">
          Agora é só chamar no WhatsApp para a gente combinar valor e data.
        </p>
      </div>
      {whatsapp && (
        <a href={linkWhatsApp(whatsapp, mensagem)} className="botao bg-emerald-500 text-lg hover:bg-emerald-400">
          Continuar no WhatsApp
        </a>
      )}
    </div>
  );
}
