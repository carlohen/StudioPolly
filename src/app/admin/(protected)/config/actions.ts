"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function salvarConfigAction(formData: FormData) {
  const diasSemana = formData.getAll("dias_semana").map(String).join(",");
  const linhas = [
    { chave: "whats_salao", valor: String(formData.get("whats_salao") ?? "").replace(/\D/g, "") },
    { chave: "abre", valor: String(formData.get("abre") ?? "") },
    { chave: "fecha", valor: String(formData.get("fecha") ?? "") },
    { chave: "almoco_inicio", valor: String(formData.get("almoco_inicio") ?? "") },
    { chave: "almoco_fim", valor: String(formData.get("almoco_fim") ?? "") },
    { chave: "dias_semana", valor: diasSemana },
  ];

  const supabase = await createClient();
  await supabase.from("config").upsert(linhas, { onConflict: "chave" });
  revalidatePath("/admin/config");
}
