"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function mudarStatusAction(agendamentoId: string, status: "concluido" | "faltou" | "cancelado") {
  const supabase = await createClient();
  const { error } = await supabase.from("agendamentos").update({ status }).eq("id", agendamentoId);
  if (error) return { ok: false, erro: "Não foi possível atualizar." };
  revalidatePath("/admin");
  return { ok: true };
}
