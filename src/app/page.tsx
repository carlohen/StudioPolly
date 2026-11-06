import { AgendarForm } from "./agendar-form";
import { buscarDatasComboFuturas, buscarProfissionaisAtivos, buscarServicosAtivos, buscarWhatsSalao } from "@/lib/agenda/dados";
import { agoraEmFortaleza } from "@/lib/agenda/time";

// Catálogo e vagas são editados/preenchidos o tempo todo — nunca cachear.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [profissionais, servicos, whatsSalao, datasCombo] = await Promise.all([
    buscarProfissionaisAtivos(),
    buscarServicosAtivos(),
    buscarWhatsSalao(),
    buscarDatasComboFuturas(),
  ]);

  return (
    <main className="flex-1 bg-gradient-to-b from-creme to-[#F3EADA]">
      <AgendarForm
        profissionais={profissionais}
        servicos={servicos}
        whatsSalao={whatsSalao}
        datasCombo={datasCombo}
        hoje={agoraEmFortaleza().data}
      />
    </main>
  );
}
