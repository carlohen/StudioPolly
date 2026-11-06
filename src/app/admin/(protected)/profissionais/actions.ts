"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function salvarProfissionalAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!id || !nome) return;

  const supabase = await createClient();
  await supabase.from("profissionais").upsert(
    {
      id,
      nome,
      funcao: String(formData.get("funcao") ?? "").trim() || null,
      ordem: Number(formData.get("ordem") ?? 0),
      ativo: formData.get("ativo") === "on",
    },
    { onConflict: "id" },
  );
  revalidatePath("/admin/profissionais");
}
