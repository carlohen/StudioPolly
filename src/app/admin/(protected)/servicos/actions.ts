"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function salvarServicoAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const profissionalId = String(formData.get("profissional_id") ?? "");
  if (!id || !nome || !profissionalId) return;

  const supabase = await createClient();
  await supabase.from("servicos").upsert(
    {
      id,
      nome,
      duracao_min: Number(formData.get("duracao_min") ?? 0),
      preco: Number(formData.get("preco") ?? 0),
      profissional_id: profissionalId,
      a_partir: formData.get("a_partir") === "on",
      adicional: formData.get("adicional") === "on",
      sob_consulta: formData.get("sob_consulta") === "on",
      ativo: formData.get("ativo") === "on",
    },
    { onConflict: "id" },
  );
  revalidatePath("/admin/servicos");
}
