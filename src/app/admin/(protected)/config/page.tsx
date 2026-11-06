import { createClient } from "@/lib/supabase/server";
import { salvarConfigAction } from "./actions";

export const dynamic = "force-dynamic";

const INPUT = "rounded-lg border-[1.5px] border-linha bg-white p-2 text-sm";

const DIAS = [
  { valor: 1, label: "Seg" },
  { valor: 2, label: "Ter" },
  { valor: 3, label: "Qua" },
  { valor: 4, label: "Qui" },
  { valor: 5, label: "Sex" },
  { valor: 6, label: "Sáb" },
  { valor: 7, label: "Dom" },
];

export default async function AdminConfigPage() {
  const supabase = await createClient();
  const { data: linhas } = await supabase.from("config").select("chave, valor");
  const cfg = new Map((linhas ?? []).map((l) => [l.chave, l.valor]));
  const diasAtivos = (cfg.get("dias_semana") ?? "").split(",").map(Number);

  return (
    <div>
      <h1 className="mb-4 font-title text-2xl text-marrom">Configurações</h1>

      <form action={salvarConfigAction} className="max-w-md space-y-4 rounded-2xl border-[1.5px] border-ouro bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-semibold">WhatsApp do salão</label>
          <input name="whats_salao" defaultValue={cfg.get("whats_salao") ?? ""} placeholder="5585999999999" className={`${INPUT} w-full`} />
        </div>

        <div className="flex gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Abre</label>
            <input type="time" name="abre" defaultValue={cfg.get("abre") ?? "09:00"} className={INPUT} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Fecha</label>
            <input type="time" name="fecha" defaultValue={cfg.get("fecha") ?? "18:00"} className={INPUT} />
          </div>
        </div>

        <div className="flex gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Almoço início</label>
            <input type="time" name="almoco_inicio" defaultValue={cfg.get("almoco_inicio") ?? "12:00"} className={INPUT} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Almoço fim</label>
            <input type="time" name="almoco_fim" defaultValue={cfg.get("almoco_fim") ?? "13:00"} className={INPUT} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">Dias de atendimento</label>
          <div className="flex flex-wrap gap-3">
            {DIAS.map((d) => (
              <label key={d.valor} className="text-sm">
                <input type="checkbox" name="dias_semana" value={d.valor} defaultChecked={diasAtivos.includes(d.valor)} className="mr-1 w-auto" />
                {d.label}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="rounded-full bg-marrom px-4 py-2 text-sm font-bold text-white">
          Salvar
        </button>
      </form>
    </div>
  );
}
