import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Papel = "admin" | "cliente";

export type Usuario = {
  id: string;
  email: string | null;
  nome: string;
  telefone: string | null;
  role: Papel;
};

/** Usuário logado (com o perfil do banco) ou null. Uma leitura por requisição. */
export const obterUsuario = cache(async (): Promise<Usuario | null> => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome, telefone, role")
    .eq("id", claims.sub)
    .single();

  if (!perfil) return null;

  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    nome: perfil.nome,
    telefone: perfil.telefone,
    role: perfil.role as Papel,
  };
});

/** Exige login; senão manda para /entrar. */
export async function exigirUsuario(proximo?: string): Promise<Usuario> {
  const usuario = await obterUsuario();
  if (!usuario) {
    redirect(proximo ? `/entrar?proximo=${encodeURIComponent(proximo)}` : "/entrar");
  }
  return usuario;
}

/** Exige o tatuador (admin); cliente volta para os próprios orçamentos. */
export async function exigirAdmin(): Promise<Usuario> {
  const usuario = await exigirUsuario("/admin");
  if (usuario.role !== "admin") redirect("/meus-orcamentos");
  return usuario;
}

/** Página inicial de cada perfil depois do login. */
export function paginaInicial(role: Papel) {
  return role === "admin" ? "/admin" : "/meus-orcamentos";
}
