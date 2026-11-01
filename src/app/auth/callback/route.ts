import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/redirecionamento";
import { paginaInicial, type Papel } from "@/lib/auth";

/** Volta do link mágico / confirmação de e-mail: troca o código pela sessão. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const proximo = caminhoSeguro(searchParams.get("proximo"));

  if (code) {
    const supabase = await criarClienteServidor();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: perfil } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      const destino = proximo ?? paginaInicial((perfil?.role as Papel) ?? "cliente");
      return NextResponse.redirect(new URL(destino, origin));
    }
  }

  return NextResponse.redirect(new URL("/entrar?erro=link", origin));
}
