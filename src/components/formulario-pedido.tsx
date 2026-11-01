"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { LOCAIS_CORPO } from "@/lib/constantes";
import type { ResultadoPedido } from "@/lib/pedidos";

type TipoFoto = "local" | "referencia";

const MAX_FOTOS = 6;
const LADO_MAXIMO = 1600;

/** Reduz a foto para no máximo 1600 px (JPEG). Se o navegador não conseguir, manda a original. */
async function comprimir(arquivo: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    if (escala === 1 && arquivo.size < 1.5 * 1024 * 1024 && arquivo.type === "image/jpeg") {
      return arquivo;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (!blob) return arquivo;
    return new File([blob], arquivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}

function tipoMime(arquivo: File) {
  if (arquivo.type) return arquivo.type;
  // Alguns celulares mandam HEIC sem tipo.
  return /\.hei[cf]$/i.test(arquivo.name) ? "image/heic" : "";
}

export function FormularioPedido({
  enviar,
  modo,
}: {
  enviar: (formData: FormData) => Promise<ResultadoPedido>;
  modo: "publico" | "admin";
}) {
  const router = useRouter();
  const [fotos, setFotos] = useState<Record<TipoFoto, File[]>>({ local: [], referencia: [] });
  const [erro, setErro] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<string | null>(null);

  function adicionar(tipo: TipoFoto, novos: File[]) {
    if (!novos.length) return;
    setFotos((atual) => ({
      ...atual,
      [tipo]: [...atual[tipo], ...novos].slice(0, MAX_FOTOS),
    }));
  }

  function remover(tipo: TipoFoto, indice: number) {
    setFotos((atual) => ({ ...atual, [tipo]: atual[tipo].filter((_, i) => i !== indice) }));
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // Guardar já: depois de um await o evento não aponta mais para o form.
    const formulario = evento.currentTarget;
    setErro(null);

    try {
      setEtapa("Preparando fotos…");
      const prontas: { tipo: TipoFoto; arquivo: File }[] = [];
      for (const tipo of ["local", "referencia"] as const) {
        for (const f of fotos[tipo]) prontas.push({ tipo, arquivo: await comprimir(f) });
      }

      const formData = new FormData(formulario);
      formData.delete("arquivos_local");
      formData.delete("arquivos_referencia");
      formData.set(
        "fotos",
        JSON.stringify(
          prontas.map(({ tipo, arquivo }) => ({
            tipo,
            mime: tipoMime(arquivo),
            tamanho: arquivo.size,
          })),
        ),
      );

      setEtapa("Enviando pedido…");
      const resultado = await enviar(formData);
      if ("erro" in resultado) {
        setErro(resultado.erro);
        setEtapa(null);
        return;
      }

      if (resultado.uploads.length) {
        const supabase = criarClienteNavegador();
        let falhas = 0;
        for (let i = 0; i < resultado.uploads.length; i++) {
          setEtapa(`Enviando fotos (${i + 1} de ${resultado.uploads.length})…`);
          const { path, token } = resultado.uploads[i];
          const { error } = await supabase.storage
            .from("fotos")
            .uploadToSignedUrl(path, token, prontas[i].arquivo, {
              contentType: tipoMime(prontas[i].arquivo),
            });
          if (error) falhas++;
        }
        if (falhas) console.warn(`${falhas} foto(s) não foram enviadas`);
      }

      router.push(
        modo === "publico"
          ? `/orcamento/enviado?n=${resultado.numero}`
          : `/admin/orcamentos/${resultado.id}`,
      );
    } catch (falha) {
      console.error(falha);
      setErro("Sem conexão? Não foi possível enviar. Tente de novo.");
      setEtapa(null);
    }
  }

  const enviando = etapa !== null;

  return (
    <form onSubmit={aoEnviar} className="space-y-5">
      {modo === "publico" && (
        // Armadilha para robôs: invisível para pessoas.
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
          <label>
            Site <input name="site_web" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="mb-3 text-lg font-semibold">
          {modo === "publico" ? "Seus dados" : "Cliente"}
        </legend>
        <div>
          <label htmlFor="nome" className="rotulo">Nome</label>
          <input id="nome" name="nome" required minLength={2} maxLength={100} autoComplete="name" className="campo" />
        </div>
        <div>
          <label htmlFor="telefone" className="rotulo">WhatsApp com DDD</label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            placeholder="(71) 99999-9999"
            className="campo"
          />
        </div>
        {modo === "admin" && (
          <div>
            <label htmlFor="origem" className="rotulo">Chegou por</label>
            <select id="origem" name="origem" className="campo" defaultValue="whatsapp">
              <option value="whatsapp">WhatsApp</option>
              <option value="manual">Outro (Instagram, presencial…)</option>
            </select>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 text-lg font-semibold">A tatuagem</legend>
        <div>
          <label htmlFor="descricao" className="rotulo">Descreva a ideia</label>
          <textarea
            id="descricao"
            name="descricao"
            required
            minLength={5}
            maxLength={3000}
            rows={4}
            placeholder="Ex.: uma rosa fineline com o nome da minha filha…"
            className="campo"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="local_corpo" className="rotulo">Local do corpo</label>
            <select id="local_corpo" name="local_corpo" required defaultValue="" className="campo">
              <option value="" disabled>Escolha…</option>
              {Object.entries(LOCAIS_CORPO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>{rotulo}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tamanho_cm" className="rotulo">Tamanho (cm)</label>
            <input id="tamanho_cm" name="tamanho_cm" inputMode="decimal" placeholder="Ex.: 15" className="campo" />
          </div>
        </div>
        <div>
          <span className="rotulo">Cor</span>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["nao", "Preto e cinza"],
              ["sim", "Colorida"],
            ].map(([valor, rotulo]) => (
              <label
                key={valor}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-700 px-3 py-2.5 has-checked:border-amber-400 has-checked:bg-amber-400/10"
              >
                <input type="radio" name="colorida" value={valor} defaultChecked={valor === "nao"} className="accent-amber-400" />
                {rotulo}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-semibold">Fotos</legend>
        <CampoFotos
          tipo="local"
          titulo="Do local do corpo"
          arquivos={fotos.local}
          aoAdicionar={adicionar}
          aoRemover={remover}
        />
        <CampoFotos
          tipo="referencia"
          titulo="De referência"
          arquivos={fotos.referencia}
          aoAdicionar={adicionar}
          aoRemover={remover}
        />
      </fieldset>

      <div>
        <label htmlFor="disponibilidade" className="rotulo">Dias e horários que você pode</label>
        <textarea
          id="disponibilidade"
          name="disponibilidade"
          rows={2}
          maxLength={500}
          placeholder="Ex.: sábados à tarde, ou dias de semana depois das 18h"
          className="campo"
        />
      </div>

      {erro && (
        <p role="alert" className="rounded-lg bg-rose-950 px-3 py-2 text-sm text-rose-200">
          {erro}
        </p>
      )}

      <button type="submit" disabled={enviando} className="botao text-lg">
        {etapa ?? (modo === "publico" ? "Enviar pedido" : "Lançar pedido")}
      </button>
    </form>
  );
}

function CampoFotos({
  tipo,
  titulo,
  arquivos,
  aoAdicionar,
  aoRemover,
}: {
  tipo: TipoFoto;
  titulo: string;
  arquivos: File[];
  aoAdicionar: (tipo: TipoFoto, novos: File[]) => void;
  aoRemover: (tipo: TipoFoto, indice: number) => void;
}) {
  const cheio = arquivos.length >= MAX_FOTOS;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="rotulo mb-0">{titulo}</span>
        <span className="text-xs text-stone-500">{arquivos.length}/{MAX_FOTOS}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {arquivos.map((arquivo, i) => (
          <Miniatura key={`${arquivo.name}-${i}`} arquivo={arquivo} aoRemover={() => aoRemover(tipo, i)} />
        ))}
        {!cheio && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-stone-600 text-stone-400 hover:border-amber-400 hover:text-amber-400">
            <span className="text-2xl leading-none">+</span>
            <span className="mt-1 text-xs">Adicionar</span>
            <input
              type="file"
              name={`arquivos_${tipo}`}
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                // Copiar antes de limpar o campo: a FileList é "viva" e esvazia junto.
                aoAdicionar(tipo, Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function Miniatura({ arquivo, aoRemover }: { arquivo: File; aoRemover: () => void }) {
  const [url] = useState(() => URL.createObjectURL(arquivo));
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={aoRemover}
        aria-label="Remover foto"
        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-sm text-white"
      >
        ✕
      </button>
    </div>
  );
}
