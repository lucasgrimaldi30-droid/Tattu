import Link from "next/link";

export default function Inicio() {
  return (
    <div className="space-y-10 py-6">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-amber-400">
          Tatuagem autoral
        </p>
        <h1 className="text-4xl font-bold leading-tight">
          Sua ideia, do esboço à pele.
        </h1>
        <p className="text-lg text-stone-300">
          Conte o que você imagina e mande fotos do local e de referências. Depois
          a gente continua no WhatsApp para fechar valor e data.
        </p>
        <Link href="/orcamento" className="botao text-lg">
          Pedir orçamento
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["1. Conte a ideia", "Descrição, local do corpo, tamanho e fotos de referência."],
          ["2. A gente conversa", "No WhatsApp, para ajustar o desenho, o valor e a data."],
          ["3. Agende e tatue", "Pagamento só no final da sessão: Pix, dinheiro ou cartão."],
        ].map(([titulo, texto]) => (
          <div key={titulo} className="cartao">
            <h2 className="font-semibold">{titulo}</h2>
            <p className="mt-1 text-sm text-stone-400">{texto}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
