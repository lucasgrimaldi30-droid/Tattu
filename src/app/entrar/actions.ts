"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/redirecionamento";
import { paginaInicial, type Papel } from "@/lib/auth";

export type EstadoForm = { erro?: string; aviso?: string };

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

async function urlDoSite() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocolo = h.get("x-forwarded-proto") ?? "http";
  return `${protocolo}://${host}`;
}

async function linkDeRetorno(proximo: string | null) {
  const base = `${await urlDoSite()}/auth/callback`;
  return proximo ? `${base}?proximo=${encodeURIComponent(proximo)}` : base;
}

function traduzirErro(mensagem: string) {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já tem cadastro. Use a aba Entrar.";
  if (m.includes("password") && m.includes("characters"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "Muitas tentativas. Espere um pouco e tente de novo.";
  return "Não foi possível concluir. Tente de novo.";
}

export async function entrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = texto(formData, "email");
  const senha = String(formData.get("senha") ?? "");
  const proximo = caminhoSeguro(formData.get("proximo"));
  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: traduzirErro(error.message) };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  redirect(proximo ?? paginaInicial((perfil?.role as Papel) ?? "cliente"));
}

export async function cadastrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const nome = texto(formData, "nome");
  const telefone = texto(formData, "telefone");
  const email = texto(formData, "email");
  const senha = String(formData.get("senha") ?? "");
  const proximo = caminhoSeguro(formData.get("proximo"));

  if (!nome || !email || !senha) return { erro: "Preencha nome, e-mail e senha." };
  if (senha.length < 6) return { erro: "A senha precisa ter pelo menos 6 caracteres." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome, telefone: telefone || null },
      emailRedirectTo: await linkDeRetorno(proximo),
    },
  });
  if (error) return { erro: traduzirErro(error.message) };

  // Com confirmação de e-mail ligada, ainda não há sessão.
  if (!data.session) {
    return { aviso: "Cadastro feito! Abra o e-mail que enviamos para confirmar a conta." };
  }
  redirect(proximo ?? "/meus-orcamentos");
}

export async function enviarLinkMagico(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = texto(formData, "email");
  const proximo = caminhoSeguro(formData.get("proximo"));
  if (!email) return { erro: "Informe seu e-mail." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: await linkDeRetorno(proximo) },
  });
  if (error) return { erro: traduzirErro(error.message) };

  return { aviso: "Pronto! Enviamos um link de acesso para o seu e-mail." };
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/");
}
