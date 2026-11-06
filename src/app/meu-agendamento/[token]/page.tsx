import { notFound } from "next/navigation";
import { buscarVisitaPorToken } from "@/lib/agenda/dados";
import { brl, fmtData } from "@/lib/formato";
import { CancelarButton } from "./cancelar-button";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  confirmado: "Confirmado",
  concluido: "Concluído",
  faltou: "Faltou",
  cancelado: "Cancelado",
};

export default async function MeuAgendamentoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const visita = await buscarVisitaPorToken(token);
  if (!visita) notFound();

  return (
    <main className="flex-1 bg-gradient-to-b from-creme to-[#F3EADA]">
      <div className="mx-auto max-w-[560px] px-4 pb-16 pt-7">
        <h1 className="text-center font-title text-[28px] tracking-wide text-marrom">Polly Designer</h1>
        <p className="mb-5 mt-1 text-center text-[13px] tracking-[2px]">MEU AGENDAMENTO</p>

        <div className="rounded-2xl border-[1.5px] border-ouro bg-white p-4">
          <h2 className="mb-2 font-title text-marrom">
            {fmtData(visita.data)} · {visita.tipo === "combo" ? "Combo Inauguração" : "Avulso"}
          </h2>
          <p className="mb-3">
            Status: <b>{STATUS_LABEL[visita.status] ?? visita.status}</b>
          </p>

          {visita.itens.map((item, idx) => (
            <p key={idx} className={item.cancelado ? "text-sm opacity-50 line-through" : "text-sm"}>
              {item.inicio}–{item.fim} · {item.nomeServico} ({item.profissionalNome})
              {item.valor > 0 && ` · ${brl(item.valor)}`}
            </p>
          ))}

          <p className="mt-3 font-bold">Total: {brl(visita.valorTotal)}</p>
          {visita.obs && <p className="mt-2 text-sm opacity-80">{visita.obs}</p>}
        </div>

        {visita.status === "confirmado" && <CancelarButton token={token} />}
      </div>
    </main>
  );
}
