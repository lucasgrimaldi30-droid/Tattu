import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { LOCAIS_CORPO, type LocalCorpo, type StatusOrcamento } from "@/lib/constantes";
import { formatarDataHora } from "@/lib/formatos";
import { paraCampoDataHora } from "@/lib/datas";
import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";
import { SeloStatus } from "@/components/selo-status";
import { FormularioResposta } from "./formulario-resposta";
import { SecaoSessoes } from "./secao-sessoes";
import { SecaoPagamento } from "./secao-pagamento";

export const metadata: Metadata = { title: "Pedido" };

type Pedido = {
  id: string;
  numero: number;
  origem: string;
  descricao: string;
  local_corpo: string;
  tamanho_cm: number | null;
  colorida: boolean;
  disponibilidade: string | null;
  status: string;
  valor_min: number | null;
  valor_max: number | null;
  tempo_estimado_min: number | null;
  sessoes_previstas: number | null;
  proposta_data: string | null;
  anotacoes: string | null;
  criado_em: string;
  clientes: { nome: string; telefone: string } | null;
  orcamento_fotos: { id: string; tipo: "local" | "referencia"; storage_path: string }[];
};

const ORIGEM: Record<string, string> = { site: "Site", whatsapp: "WhatsApp", manual: "Outro" };

export default async function DetalhePedido({ params }: PageProps<"/admin/orcamentos/[id]">) {
  await exigirAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await criarClienteServidor();
  const { data: pedido } = await supabase
    .from("orcamentos")
    .select("*, clientes(nome, telefone), orcamento_fotos(id, tipo, storage_path)")
    .eq("id", id)
    .maybeSingle<Pedido>();
  if (!pedido) notFound();

  const caminhos = pedido.orcamento_fotos.map((f) => f.storage_path);
  const { data: assinadas } = caminhos.length
    ? await supabase.storage.from("fotos").createSignedUrls(caminhos, 60 * 60)
    : { data: [] };
  const urlDe = new Map(
    (assinadas ?? []).filter((a) => !a.error && a.signedUrl).map((a) => [a.path, a.signedUrl]),
  );

  const cliente = pedido.clientes;
  const primeiroNome = cliente?.nome.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">
            <span className="text-stone-500">#{pedido.numero}</span> {cliente?.nome}
          </h1>
          <SeloStatus status={pedido.status as StatusOrcamento} />
        </div>
        <p className="text-sm text-stone-400">
          Chegou pelo {ORIGEM[pedido.origem]} em {formatarDataHora(pedido.criado_em)}
        </p>
      </div>

      {cliente && (
        <a
          href={linkWhatsApp(cliente.telefone, `Olá, ${primeiroNome}! Sobre o seu pedido de tatuagem #${pedido.numero}…`)}
          target="_blank"
          rel="noreferrer"
          className="botao bg-emerald-500 hover:bg-emerald-400"
        >
          Abrir WhatsApp · {formatarTelefone(cliente.telefone)}
        </a>
      )}

      <section className="cartao space-y-3">
        <h2 className="font-semibold">A ideia</h2>
        <p className="whitespace-pre-wrap text-stone-200">{pedido.descricao}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-stone-500">Local</dt>
            <dd>{LOCAIS_CORPO[pedido.local_corpo as LocalCorpo]}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Tamanho</dt>
            <dd>{pedido.tamanho_cm ? `${String(pedido.tamanho_cm).replace(".", ",")} cm` : "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Cor</dt>
            <dd>{pedido.colorida ? "Colorida" : "Preto e cinza"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-stone-500">Disponibilidade</dt>
            <dd>{pedido.disponibilidade || "—"}</dd>
          </div>
        </dl>
      </section>

      {(["local", "referencia"] as const).map((tipo) => {
        const fotos = pedido.orcamento_fotos.filter((f) => f.tipo === tipo);
        if (!fotos.length) return null;
        return (
          <section key={tipo} className="space-y-2">
            <h2 className="font-semibold">{tipo === "local" ? "Fotos do local" : "Referências"}</h2>
            <div className="grid grid-cols-3 gap-2">
              {fotos.map((f) => {
                const url = urlDe.get(f.storage_path);
                return url ? (
                  <a key={f.id} href={url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg bg-stone-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </a>
                ) : (
                  <div key={f.id} className="flex aspect-square items-center justify-center rounded-lg bg-stone-900 p-2 text-center text-xs text-stone-500">
                    Foto não chegou
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="cartao space-y-4">
        <h2 className="font-semibold">Fechamento</h2>
        <FormularioResposta
          id={pedido.id}
          inicial={{
            status: pedido.status,
            valor_min: pedido.valor_min,
            valor_max: pedido.valor_max,
            tempo_horas: pedido.tempo_estimado_min ? pedido.tempo_estimado_min / 60 : null,
            sessoes_previstas: pedido.sessoes_previstas,
            proposta_data: paraCampoDataHora(pedido.proposta_data),
            anotacoes: pedido.anotacoes ?? "",
          }}
        />
      </section>

      <SecaoSessoes
        orcamentoId={pedido.id}
        tempoEstimadoMin={pedido.tempo_estimado_min}
        propostaData={pedido.proposta_data}
      />

      <SecaoPagamento
        orcamentoId={pedido.id}
        valorSugerido={pedido.valor_max ?? pedido.valor_min}
        concluido={pedido.status === "concluido"}
      />
    </div>
  );
}
