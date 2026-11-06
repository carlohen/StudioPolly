import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente privilegiado (secret key): só em código de servidor (Server Actions,
// Route Handlers). Ignora a RLS — usar para gravar/consultar agendamentos e
// clientes, sempre revalidando as regras de negócio antes.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
