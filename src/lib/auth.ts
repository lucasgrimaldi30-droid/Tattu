import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Tatuador = {
  id: string;
  email: string | null;
  nome: string;
};

/**
 * O tatuador logado, ou null. Estar logado não basta: a conta precisa ter
 * linha em `profiles` (criada à mão no SQL Editor).
 */
export const obterTatuador = cache(async (): Promise<Tatuador | null> => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", claims.sub)
    .maybeSingle();
  if (!perfil) return null;

  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    nome: perfil.nome,
  };
});

/** Use no começo de toda página e Server Action do /admin. */
export async function exigirAdmin(): Promise<Tatuador> {
  const tatuador = await obterTatuador();
  if (!tatuador) redirect("/entrar");
  return tatuador;
}
