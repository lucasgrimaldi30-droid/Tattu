import "server-only";
import { criarClienteServico } from "@/lib/supabase/admin";
import { normalizarTelefone } from "@/lib/telefone";
import { LOCAIS_CORPO, type LocalCorpo } from "@/lib/constantes";

export const MAX_FOTOS_POR_TIPO = 6;
export const MAX_BYTES_FOTO = 10 * 1024 * 1024;

export type FotoPedida = { tipo: "local" | "referencia"; mime: string; tamanho: number };

export type ResultadoPedido =
  | { erro: string }
  | { id: string; numero: number; uploads: { path: string; token: string }[] };

type Origem = "site" | "whatsapp" | "manual";

const EXTENSOES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

/** Valida o formulário e grava cliente + orçamento + fotos (URLs de upload). */
export async function registrarPedido(
  formData: FormData,
  origem: Origem,
): Promise<ResultadoPedido> {
  const nome = texto(formData, "nome");
  const telefone = normalizarTelefone(texto(formData, "telefone"));
  const descricao = texto(formData, "descricao");
  const local = texto(formData, "local_corpo");
  const tamanhoTxt = texto(formData, "tamanho_cm").replace(",", ".");
  const colorida = texto(formData, "colorida") === "sim";
  const disponibilidade = texto(formData, "disponibilidade");

  if (nome.length < 2 || nome.length > 100) return { erro: "Informe seu nome." };
  if (!telefone) return { erro: "Informe um WhatsApp válido, com DDD." };
  if (descricao.length < 5) return { erro: "Conte um pouco mais sobre a ideia." };
  if (descricao.length > 3000) return { erro: "A descrição está muito longa." };
  if (!(local in LOCAIS_CORPO)) return { erro: "Escolha o local do corpo." };
  if (disponibilidade.length > 500) return { erro: "A disponibilidade está muito longa." };

  let tamanho: number | null = null;
  if (tamanhoTxt) {
    tamanho = Number(tamanhoTxt);
    if (!Number.isFinite(tamanho) || tamanho <= 0 || tamanho > 300) {
      return { erro: "Tamanho inválido (em cm)." };
    }
  }

  let fotos: FotoPedida[] = [];
  try {
    fotos = JSON.parse(texto(formData, "fotos") || "[]");
    if (!Array.isArray(fotos)) throw new Error();
  } catch {
    return { erro: "Não foi possível ler as fotos. Tente de novo." };
  }
  for (const tipo of ["local", "referencia"] as const) {
    if (fotos.filter((f) => f?.tipo === tipo).length > MAX_FOTOS_POR_TIPO) {
      return { erro: `Mande no máximo ${MAX_FOTOS_POR_TIPO} fotos de cada tipo.` };
    }
  }
  for (const f of fotos) {
    if (
      (f?.tipo !== "local" && f?.tipo !== "referencia") ||
      !EXTENSOES[f.mime] ||
      typeof f.tamanho !== "number" ||
      f.tamanho > MAX_BYTES_FOTO
    ) {
      return { erro: "Envie só fotos (JPG, PNG, WEBP ou HEIC) de até 10 MB." };
    }
  }

  const supabase = criarClienteServico();
  const { data, error } = await supabase
    .rpc("registrar_orcamento", {
      p_nome: nome,
      p_telefone: telefone,
      p_origem: origem,
      p_descricao: descricao,
      p_local_corpo: local as LocalCorpo,
      p_tamanho_cm: tamanho,
      p_colorida: colorida,
      p_disponibilidade: disponibilidade,
    })
    .single<{ id: string; numero: number }>();

  if (error || !data) {
    console.error("registrar_orcamento", error);
    return { erro: "Não foi possível enviar agora. Tente de novo em instantes." };
  }

  const uploads: { path: string; token: string }[] = [];
  for (const f of fotos) {
    const path = `${data.id}/${f.tipo}-${crypto.randomUUID()}.${EXTENSOES[f.mime]}`;
    const { data: assinado, error: erroUpload } = await supabase.storage
      .from("fotos")
      .createSignedUploadUrl(path);
    if (erroUpload || !assinado) {
      console.error("createSignedUploadUrl", erroUpload);
      continue;
    }
    uploads.push({ path, token: assinado.token });
  }

  if (uploads.length) {
    const { error: erroFotos } = await supabase.from("orcamento_fotos").insert(
      uploads.map((u) => ({
        orcamento_id: data.id,
        tipo: u.path.split("/")[1].startsWith("local") ? "local" : "referencia",
        storage_path: u.path,
      })),
    );
    if (erroFotos) console.error("orcamento_fotos", erroFotos);
  }

  return { id: data.id, numero: data.numero, uploads };
}
