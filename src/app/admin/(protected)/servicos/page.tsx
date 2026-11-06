import { createClient } from "@/lib/supabase/server";
import { salvarServicoAction } from "./actions";

export const dynamic = "force-dynamic";

const INPUT = "rounded-lg border-[1.5px] border-linha bg-white p-1.5 text-sm";

export default async function AdminServicosPage() {
  const supabase = await createClient();
  const [{ data: servicos }, { data: profissionais }] = await Promise.all([
    supabase.from("servicos").select("*").order("profissional_id").order("id"),
    supabase.from("profissionais").select("id, nome").order("ordem"),
  ]);

  return (
    <div>
      <h1 className="mb-4 font-title text-2xl text-marrom">Serviços</h1>

      <div className="space-y-2">
        {(servicos ?? []).map((s) => (
          <form
            key={s.id}
            action={salvarServicoAction}
            className={`flex flex-wrap items-center gap-2 rounded-xl border-[1.5px] bg-white p-3 ${s.ativo ? "border-linha" : "border-linha opacity-50"}`}
          >
            <input type="hidden" name="id" value={s.id} />
            <span className="w-12 text-xs opacity-60">{s.id}</span>
            <input name="nome" defaultValue={s.nome} className={`${INPUT} min-w-[200px] flex-1`} />
            <select name="profissional_id" defaultValue={s.profissional_id} className={INPUT}>
              {(profissionais ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <label className="text-xs">
              min{" "}
              <input type="number" name="duracao_min" defaultValue={s.duracao_min} className={`${INPUT} w-16`} />
            </label>
            <label className="text-xs">
              R${" "}
              <input type="number" step="0.01" name="preco" defaultValue={s.preco} className={`${INPUT} w-20`} />
            </label>
            <label className="text-xs">
              <input type="checkbox" name="a_partir" defaultChecked={s.a_partir} className="mr-1 w-auto" />a partir
            </label>
            <label className="text-xs">
              <input type="checkbox" name="adicional" defaultChecked={s.adicional} className="mr-1 w-auto" />
              adicional
            </label>
            <label className="text-xs">
              <input type="checkbox" name="sob_consulta" defaultChecked={s.sob_consulta} className="mr-1 w-auto" />
              sob consulta
            </label>
            <label className="text-xs">
              <input type="checkbox" name="ativo" defaultChecked={s.ativo} className="mr-1 w-auto" />
              ativo
            </label>
            <button type="submit" className="rounded-full bg-marrom px-3 py-1.5 text-xs font-bold text-white">
              Salvar
            </button>
          </form>
        ))}
      </div>

      <h2 className="mb-2 mt-6 font-title text-lg text-marrom">Novo serviço</h2>
      <form action={salvarServicoAction} className="flex flex-wrap items-center gap-2 rounded-xl border-[1.5px] border-ouro bg-white p-3">
        <input name="id" placeholder="ID (ex: S30)" required className={`${INPUT} w-24`} />
        <input name="nome" placeholder="Nome" required className={`${INPUT} min-w-[200px] flex-1`} />
        <select name="profissional_id" defaultValue={(profissionais ?? [])[0]?.id} className={INPUT}>
          {(profissionais ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <label className="text-xs">
          min <input type="number" name="duracao_min" defaultValue={30} className={`${INPUT} w-16`} />
        </label>
        <label className="text-xs">
          R$ <input type="number" step="0.01" name="preco" defaultValue={0} className={`${INPUT} w-20`} />
        </label>
        <label className="text-xs">
          <input type="checkbox" name="a_partir" className="mr-1 w-auto" />a partir
        </label>
        <label className="text-xs">
          <input type="checkbox" name="adicional" className="mr-1 w-auto" />
          adicional
        </label>
        <label className="text-xs">
          <input type="checkbox" name="sob_consulta" className="mr-1 w-auto" />
          sob consulta
        </label>
        <label className="text-xs">
          <input type="checkbox" name="ativo" defaultChecked className="mr-1 w-auto" />
          ativo
        </label>
        <button type="submit" className="rounded-full bg-marrom px-3 py-1.5 text-xs font-bold text-white">
          Criar
        </button>
      </form>
    </div>
  );
}
