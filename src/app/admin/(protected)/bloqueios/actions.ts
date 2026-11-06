"use server";

import { revalidatePath } from "next/cache";
import { paraMinutos, paraTstzRange } from "@/lib/agenda/time";
import { createClient } from "@/lib/supabase/server";

export async function criarBloqueioAction(formData: FormData) {
  const data = String(formData.get("data") ?? "");
  const inicio = String(formData.get("inicio") ?? "");
  const fim = String(formData.get("fim") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !inicio || !fim) return;

  const profissionalId = String(formData.get("profissional_id") ?? "") || null;
  const motivo = String(formData.get("motivo") ?? "").trim() || null;

  const supabase = await createClient();
  await supabase.from("bloqueios").insert({
    profissional_id: profissionalId,
    horario: paraTstzRange(data, paraMinutos(inicio), paraMinutos(fim)),
    motivo,
  });
  revalidatePath("/admin/bloqueios");
}

export async function excluirBloqueioAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("bloqueios").delete().eq("id", id);
  revalidatePath("/admin/bloqueios");
}
