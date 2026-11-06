"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelarAgendamentoAction } from "@/app/actions";

export function CancelarButton({ token }: { token: string }) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [cancelando, startTransition] = useTransition();

  function cancelar() {
    if (!window.confirm("Cancelar este agendamento? Essa ação não pode ser desfeita.")) return;
    setErro("");
    startTransition(async () => {
      const r = await cancelarAgendamentoAction(token);
      if (!r.ok) {
        setErro(r.erro ?? "Não foi possível cancelar.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={cancelar}
        disabled={cancelando}
        className="w-full rounded-full border-[1.5px] border-ouro bg-white py-3.5 font-bold text-marrom disabled:opacity-60"
      >
        Cancelar agendamento
      </button>
      {erro && <p className="mt-2.5 font-semibold text-red-800">{erro}</p>}
    </div>
  );
}
