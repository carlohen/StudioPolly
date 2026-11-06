import { createClient } from "@/lib/supabase/server";
import { parseTstzRangeParaMinutos } from "@/lib/agenda/tstzrange";
import { agoraEmFortaleza, paraHoraMinuto } from "@/lib/agenda/time";
import { brl, fmtData } from "@/lib/formato";
import { StatusButtons } from "./status-buttons";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  confirmado: "Confirmado",
  concluido: "Concluído",
  faltou: "Faltou",
  cancelado: "Cancelado",
};

interface ClienteEmbed {
  nome: string;
  whats: string;
}

interface ItemEmbed {
  nome_servico: string;
  profissional_id: string;
  horario: string;
  valor: number;
  cancelado: boolean;
}

export default async function AdminAgendaPage({ searchParams }: PageProps<"/admin">) {
  const sp = ((await searchParams) ?? {}) as { data?: string; prof?: string; todos?: string };
  const data = sp.data ?? agoraEmFortaleza().data;
  const profFiltro = sp.prof ?? "";
  const verTodos = sp.todos === "1";

  const supabase = await createClient();
  let consulta = supabase
    .from("agendamentos")
    .select(
      "id, data, tipo, status, valor_total, clientes(nome, whats), itens_agendamento(nome_servico, profissional_id, horario, valor, cancelado)",
    );
  if (!verTodos) consulta = consulta.eq("data", data);
  const [{ data: visitas, error }, { data: profissionais }] = await Promise.all([
    consulta.order("data").order("criado_em"),
    supabase.from("profissionais").select("id, nome").order("ordem"),
  ]);

  const nomesProf = new Map((profissionais ?? []).map((p) => [p.id, p.nome]));

  const linhas = (visitas ?? [])
    .map((v) => {
      const cliente = v.clientes as unknown as ClienteEmbed | null;
      const itens = ((v.itens_agendamento ?? []) as unknown as ItemEmbed[])
        .map((i) => ({ ...i, intervalo: parseTstzRangeParaMinutos(i.horario) }))
        .sort((a, b) => a.intervalo.inicio - b.intervalo.inicio);
      return {
        id: v.id as string,
        data: v.data as string,
        tipo: v.tipo as string,
        status: v.status as string,
        valorTotal: Number(v.valor_total),
        cliente,
        itens,
      };
    })
    .filter((v) => !profFiltro || v.itens.some((i) => i.profissional_id === profFiltro))
    .sort((a, b) => {
      if (a.data !== b.data) return a.data < b.data ? -1 : 1;
      return (a.itens[0]?.intervalo.inicio ?? 0) - (b.itens[0]?.intervalo.inicio ?? 0);
    });

  // agrupa por data só quando "ver todos" está ligado — no dia único não precisa de subtítulo repetido
  const grupos: Array<{ data: string; visitas: typeof linhas }> = [];
  for (const v of linhas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.data === v.data) ultimo.visitas.push(v);
    else grupos.push({ data: v.data, visitas: [v] });
  }

  return (
    <div>
      <h1 className="mb-4 font-title text-2xl text-marrom">{verTodos ? "Agenda · todos os dias" : `Agenda · ${fmtData(data)}`}</h1>

      <form method="GET" className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold">Data</label>
          <input type="date" name="data" defaultValue={data} className="rounded-xl border-[1.5px] border-linha bg-white p-2" />
          {verTodos && <p className="mt-1 text-xs opacity-60">Ignorado com &quot;ver todos os dias&quot; marcado</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold">Profissional</label>
          <select name="prof" defaultValue={profFiltro} className="rounded-xl border-[1.5px] border-linha bg-white p-2">
            <option value="">Todas</option>
            {(profissionais ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <label className="mb-2 flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="todos" value="1" defaultChecked={verTodos} className="w-auto" />
          Ver todos os dias
        </label>
        <button type="submit" className="rounded-full bg-marrom px-4 py-2 text-sm font-bold text-white">
          {verTodos ? "Ver todos" : "Ver agenda"}
        </button>
      </form>

      {error && <p className="text-red-800">Erro ao carregar a agenda.</p>}

      {linhas.length === 0 ? (
        <p>Sem agendamentos{verTodos ? "" : " neste dia"}.</p>
      ) : (
        <div className="space-y-6">
          {grupos.map((grupo) => (
            <div key={grupo.data}>
              {verTodos && <h2 className="mb-2 font-title text-lg text-marrom">{fmtData(grupo.data)}</h2>}
              <div className="space-y-3">
                {grupo.visitas.map((v) => (
                  <div key={v.id} className={`rounded-xl border-[1.5px] bg-white p-4 ${v.status === "cancelado" ? "border-linha opacity-60" : "border-ouro"}`}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <b>{v.cliente?.nome}</b>{" "}
                        {v.cliente?.whats && (
                          <a className="text-sm text-ouro underline" target="_blank" href={`https://wa.me/${v.cliente.whats}`}>
                            {v.cliente.whats}
                          </a>
                        )}
                        {v.tipo === "combo" && <span className="ml-2 rounded-full bg-creme px-2 py-0.5 text-xs font-semibold text-marrom">combo</span>}
                      </div>
                      <span className="text-sm font-semibold">{STATUS_LABEL[v.status] ?? v.status}</span>
                    </div>

                    {v.itens.map((item, idx) => (
                      <p key={idx} className={`text-sm ${item.cancelado ? "opacity-50 line-through" : ""}`}>
                        {paraHoraMinuto(item.intervalo.inicio)}–{paraHoraMinuto(item.intervalo.fim)} · {item.nome_servico} (
                        {nomesProf.get(item.profissional_id) ?? item.profissional_id})
                      </p>
                    ))}

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold">{brl(v.valorTotal)}</span>
                      {v.status === "confirmado" && <StatusButtons agendamentoId={v.id} statusAtual={v.status} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
