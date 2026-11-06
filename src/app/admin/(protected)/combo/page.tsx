import { fmtData } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import { salvarDataComboAction, excluirDataComboAction } from "./actions";

export const dynamic = "force-dynamic";

const INPUT = "rounded-lg border-[1.5px] border-linha bg-white p-1.5 text-sm";

export default async function AdminComboPage() {
  const supabase = await createClient();
  const { data: datas } = await supabase.from("datas_combo").select("*").order("data");

  return (
    <div>
      <h1 className="mb-4 font-title text-2xl text-marrom">Combo Inauguração · datas</h1>

      <div className="space-y-2">
        {(datas ?? []).length === 0 && <p>Nenhuma data de combo aberta.</p>}
        {(datas ?? []).map((d) => (
          <form key={d.data} action={salvarDataComboAction} className="flex flex-wrap items-center gap-2 rounded-xl border-[1.5px] border-linha bg-white p-3">
            <input type="hidden" name="data" value={d.data} />
            <span className="w-24 text-sm font-semibold">{fmtData(d.data)}</span>
            <label className="text-xs">
              vagas manhã (máx. 3){" "}
              <input type="number" name="vagas_manha" min={0} max={3} defaultValue={d.vagas_manha} className={`${INPUT} w-14`} />
            </label>
            <label className="text-xs">
              vagas tarde (máx. 5){" "}
              <input type="number" name="vagas_tarde" min={0} max={5} defaultValue={d.vagas_tarde} className={`${INPUT} w-14`} />
            </label>
            <label className="text-xs">
              valor R${" "}
              <input type="number" step="0.01" name="valor" defaultValue={d.valor} className={`${INPUT} w-20`} />
            </label>
            <button type="submit" className="rounded-full bg-marrom px-3 py-1.5 text-xs font-bold text-white">
              Salvar
            </button>
            <button
              type="submit"
              formAction={excluirDataComboAction}
              className="rounded-full border-[1.5px] border-ouro px-3 py-1.5 text-xs font-semibold text-marrom"
            >
              Excluir
            </button>
          </form>
        ))}
      </div>

      <h2 className="mb-2 mt-6 font-title text-lg text-marrom">Abrir nova data</h2>
      <form action={salvarDataComboAction} className="flex flex-wrap items-center gap-2 rounded-xl border-[1.5px] border-ouro bg-white p-3">
        <input type="date" name="data" required className={INPUT} />
        <label className="text-xs">
          vagas manhã <input type="number" name="vagas_manha" min={0} max={3} defaultValue={3} className={`${INPUT} w-14`} />
        </label>
        <label className="text-xs">
          vagas tarde <input type="number" name="vagas_tarde" min={0} max={5} defaultValue={5} className={`${INPUT} w-14`} />
        </label>
        <label className="text-xs">
          valor R$ <input type="number" step="0.01" name="valor" defaultValue={130} className={`${INPUT} w-20`} />
        </label>
        <button type="submit" className="rounded-full bg-marrom px-3 py-1.5 text-xs font-bold text-white">
          Abrir
        </button>
      </form>
    </div>
  );
}
