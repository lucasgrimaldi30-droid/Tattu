import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave secreta (service role): ignora RLS.
 * Só no servidor, e só depois de validar a entrada ou checar o admin.
 */
export function criarClienteServico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
