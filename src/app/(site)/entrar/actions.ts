"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string };

export async function entrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid login credentials")) return { erro: "E-mail ou senha incorretos." };
    if (msg.includes("rate limit")) return { erro: "Muitas tentativas. Espere um pouco." };
    return { erro: "Não foi possível entrar. Tente de novo." };
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!perfil) {
    await supabase.auth.signOut();
    return { erro: "Esta conta não tem acesso ao sistema." };
  }

  redirect("/admin");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}
