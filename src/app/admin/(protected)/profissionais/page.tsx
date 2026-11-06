import { createClient } from "@/lib/supabase/server";
import { salvarProfissionalAction } from "./actions";

export const dynamic = "force-dynamic";

const INPUT = "rounded-lg border-[1.5px] border-linha bg-white p-1.5 text-sm";

export default async function AdminProfissionaisPage() {
  const supabase = await createClient();
  const { data: profissionais } = await supabase.from("profissionais").select("*").order("ordem");

  return (
    <div>
      <h1 className="mb-4 font-title text-2xl text-marrom">Profissionais</h1>

      <div className="space-y-2">
        {(profissionais ?? []).map((p) => (
          <form
            key={p.id}
            action={salvarProfissionalAction}
            className={`flex flex-wrap items-center gap-2 rounded-xl border-[1.5px] bg-white p-3 ${p.ativo ? "border-linha" : "border-linha opacity-50"}`}
          >
            <input type="hidden" name="id" value={p.id} />
            <span className="w-8 text-xs opacity-60">{p.id}</span>
            <input name="nome" defaultValue={p.nome} className={`${INPUT} min-w-[180px] flex-1`} />
            <input name="funcao" defaultValue={p.funcao ?? ""} placeholder="Função" className={`${INPUT} min-w-[160px] flex-1`} />
            <label className="text-xs">
              ordem <input type="number" name="ordem" defaultValue={p.ordem} className={`${INPUT} w-14`} />
            </label>
            <label className="text-xs">
              <input type="checkbox" name="ativo" defaultChecked={p.ativo} className="mr-1 w-auto" />
              ativo
            </label>
            <button type="submit" className="rounded-full bg-marrom px-3 py-1.5 text-xs font-bold text-white">
              Salvar
            </button>
          </form>
        ))}
      </div>

      <h2 className="mb-2 mt-6 font-title text-lg text-marrom">Nova profissional</h2>
      <form action={salvarProfissionalAction} className="flex flex-wrap items-center gap-2 rounded-xl border-[1.5px] border-ouro bg-white p-3">
        <input name="id" placeholder="ID (ex: P6)" required className={`${INPUT} w-24`} />
        <input name="nome" placeholder="Nome" required className={`${INPUT} min-w-[180px] flex-1`} />
        <input name="funcao" placeholder="Função" className={`${INPUT} min-w-[160px] flex-1`} />
        <label className="text-xs">
          ordem <input type="number" name="ordem" defaultValue={0} className={`${INPUT} w-14`} />
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
