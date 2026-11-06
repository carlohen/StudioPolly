"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { mudarStatusAction } from "./actions";

const OPCOES = [
  { valor: "concluido", label: "Concluído" },
  { valor: "faltou", label: "Faltou" },
  { valor: "cancelado", label: "Cancelado" },
] as const;

export function StatusButtons({ agendamentoId, statusAtual }: { agendamentoId: string; statusAtual: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function mudar(status: "concluido" | "faltou" | "cancelado") {
    if (status === "cancelado" && !window.confirm("Cancelar esta visita? Isso libera todos os horários dela.")) return;
    startTransition(async () => {
      await mudarStatusAction(agendamentoId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {OPCOES.filter((o) => o.valor !== statusAtual).map((o) => (
        <button
          key={o.valor}
          type="button"
          disabled={pending}
          onClick={() => mudar(o.valor)}
          className="rounded-full border-[1.5px] border-ouro px-2.5 py-1 text-xs font-semibold text-marrom disabled:opacity-50"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
