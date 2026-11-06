"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function salvarDataComboAction(formData: FormData) {
  const data = String(formData.get("data") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return;

  const supabase = await createClient();
  await supabase.from("datas_combo").upsert(
    {
      data,
      vagas_manha: Math.max(0, Math.min(3, Number(formData.get("vagas_manha") ?? 0))),
      vagas_tarde: Math.max(0, Math.min(5, Number(formData.get("vagas_tarde") ?? 0))),
      valor: Number(formData.get("valor") ?? 0),
    },
    { onConflict: "data" },
  );
  revalidatePath("/admin/combo");
}

export async function excluirDataComboAction(formData: FormData) {
  const data = String(formData.get("data") ?? "");
  if (!data) return;
  const supabase = await createClient();
  await supabase.from("datas_combo").delete().eq("data", data);
  revalidatePath("/admin/combo");
}
