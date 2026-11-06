import { parseTstzRangeCompleto } from "@/lib/agenda/tstzrange";
import { paraHoraMinuto } from "@/lib/agenda/time";
import { fmtData } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import { criarBloqueioAction, excluirBloqueioAction } from "./actions";

export const dynamic = "force-dynamic";

const INPUT = "rounded-lg border-[1.5px] border-linha bg-white p-1.5 text-sm";

export default async function AdminBloqueiosPage() {
  const supabase = await createClient();
  const [{ data: bloqueios }, { data: profissionais }] = await Promise.all([
    supabase.from("bloqueios").select("id, profissional_id, horario, motivo"),
    supabase.from("profissionais").select("id, nome").order("ordem"),
  ]);

  const nomesProf = new Map((profissionais ?? []).map((p) => [p.id, p.nome]));

  const linhas = (bloqueios ?? [])
    .map((b) => {
      const { data, minutos } = parseTstzRangeCompleto(b.horario);
      return { id: b.id, data, inicio: paraHoraMinuto(minutos.inicio), fim: paraHoraMinuto(minutos.fim), profissionalId: b.profissional_id, motivo: b.motivo };
    })
    .sort((a, b) => (a.data + a.inicio < b.data + b.inicio ? -1 : 1));

  return (
    <div>
      <h1 className="mb-4 font-title text-2xl text-marrom">Bloqueios</h1>

      <div className="space-y-2">
        {linhas.length === 0 && <p>Nenhum bloqueio cadastrado.</p>}
        {linhas.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-[1.5px] border-linha bg-white p-3 text-sm">
            <span>
              {fmtData(b.data)} · {b.inicio}–{b.fim} · {b.profissionalId ? nomesProf.get(b.profissionalId) ?? b.profissionalId : "Salão todo"}
              {b.motivo ? ` · ${b.motivo}` : ""}
            </span>
            <form action={excluirBloqueioAction}>
              <input type="hidden" name="id" value={b.id} />
              <button type="submit" className="rounded-full border-[1.5px] border-ouro px-3 py-1 text-xs font-semibold text-marrom">
                Excluir
              </button>
            </form>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-6 font-title text-lg text-marrom">Novo bloqueio</h2>
      <form action={criarBloqueioAction} className="flex flex-wrap items-center gap-2 rounded-xl border-[1.5px] border-ouro bg-white p-3">
        <input type="date" name="data" required className={INPUT} />
        <input type="time" name="inicio" required defaultValue="09:00" className={INPUT} />
        <input type="time" name="fim" required defaultValue="18:00" className={INPUT} />
        <select name="profissional_id" defaultValue="" className={INPUT}>
          <option value="">Salão todo</option>
          {(profissionais ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <input name="motivo" placeholder="Motivo (opcional)" className={`${INPUT} min-w-[180px] flex-1`} />
        <button type="submit" className="rounded-full bg-marrom px-3 py-1.5 text-xs font-bold text-white">
          Criar
        </button>
      </form>
    </div>
  );
}
