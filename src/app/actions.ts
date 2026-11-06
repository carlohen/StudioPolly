"use server";

import { inicioComboMin, ordemTurno, primeiraVagaLivre } from "@/lib/agenda/combo";
import { PROFISSIONAL_MANICURE_ID } from "@/lib/agenda/constants";
import {
  buscarConfigAgenda,
  buscarDataCombo,
  buscarHorariosLivres,
  buscarMapaNomesProfissionais,
  buscarServicoPorId,
  buscarVagasUsadasCombo,
  type DataCombo,
} from "@/lib/agenda/dados";
import { mensagemErroAgendamento } from "@/lib/agenda/erros";
import { agoraEmFortaleza, diaDaSemanaISO, paraMinutos, paraTstzRange } from "@/lib/agenda/time";
import { normalizarNome, normalizarWhats } from "@/lib/agenda/validacao";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function buscarHorariosAction(servicoId: string, data: string, minimoInicioMin = 0): Promise<string[]> {
  return buscarHorariosLivres(servicoId, data, minimoInicioMin);
}

export interface ItemAgendamentoInput {
  servicoId: string;
  hora: string;
}

export interface CriarAgendamentoAvulsoInput {
  nome: string;
  whats: string;
  data: string;
  itens: ItemAgendamentoInput[];
  adicionaisIds?: string[];
}

export type CriarAgendamentoResultado =
  | { ok: true; token: string; total: number }
  | { ok: false; erro: string };

export async function criarAgendamentoAvulso(
  input: CriarAgendamentoAvulsoInput,
): Promise<CriarAgendamentoResultado> {
  try {
    const nome = normalizarNome(input.nome);
    if (!nome) return { ok: false, erro: "Informe seu nome." };
    const whats = normalizarWhats(input.whats);
    if (!whats) return { ok: false, erro: "WhatsApp inválido. Use DDD + número." };

    const data = input.data;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { ok: false, erro: "Data inválida." };

    const config = await buscarConfigAgenda();
    const agora = agoraEmFortaleza();
    if (!config.diasAtendimento.includes(diaDaSemanaISO(data)) || data < agora.data) {
      return { ok: false, erro: "Escolha uma data de atendimento válida." };
    }

    if (!Array.isArray(input.itens) || input.itens.length === 0 || input.itens.length > 8) {
      return { ok: false, erro: "Escolha de 1 a 8 serviços." };
    }

    interface Linha {
      servicoId: string;
      nome: string;
      profissionalId: string;
      inicioMin: number;
      fimMin: number;
      valor: number;
    }
    const linhas: Linha[] = [];
    let fimAnterior = 0;

    for (const item of input.itens) {
      const servico = await buscarServicoPorId(item.servicoId);
      if (!servico || servico.adicional || servico.sobConsulta) {
        return { ok: false, erro: "Serviço inválido." };
      }
      const inicioMin = paraMinutos(item.hora);
      if (inicioMin < fimAnterior) {
        return { ok: false, erro: "Os horários devem seguir a ordem, sem sobreposição." };
      }
      // Revalida contra o banco agora: evita corrida com outra cliente agendando o mesmo horário.
      const livres = await buscarHorariosLivres(servico.id, data, inicioMin);
      if (!livres.includes(item.hora)) {
        return { ok: false, erro: `O horário ${item.hora} (${servico.nome}) acabou de ser ocupado. Escolha outro.` };
      }
      const fimMin = inicioMin + servico.duracaoMin;
      linhas.push({
        servicoId: servico.id,
        nome: servico.nome,
        profissionalId: servico.profissionalId,
        inicioMin,
        fimMin,
        valor: servico.preco,
      });
      fimAnterior = fimMin;
    }

    const servicosAdicionais = await Promise.all((input.adicionaisIds ?? []).map((id) => buscarServicoPorId(id)));
    const adicionais = servicosAdicionais.filter((s): s is NonNullable<typeof s> => !!s && s.adicional);
    if (adicionais.length > 0 && !linhas.some((l) => l.profissionalId === PROFISSIONAL_MANICURE_ID)) {
      return { ok: false, erro: "Adicionais valem só com serviços de manicure/pedicure." };
    }

    const valorAdicionais = adicionais.reduce((soma, s) => soma + s.preco, 0);
    const total = linhas.reduce((soma, l) => soma + l.valor, 0) + valorAdicionais;
    const obs = adicionais.length ? `Adicionais: ${adicionais.map((a) => a.nome).join(", ")}` : null;

    const supabase = createAdminClient();

    const { data: cliente, error: erroCliente } = await supabase
      .from("clientes")
      .upsert({ nome, whats }, { onConflict: "whats" })
      .select("id")
      .single();
    if (erroCliente || !cliente) throw erroCliente ?? new Error("Falha ao gravar cliente.");

    const { data: agendamento, error: erroAgendamento } = await supabase
      .from("agendamentos")
      .insert({ cliente_id: cliente.id, data, tipo: "avulso", valor_total: total, obs })
      .select("id, token")
      .single();
    if (erroAgendamento || !agendamento) throw erroAgendamento ?? new Error("Falha ao gravar agendamento.");

    const itensParaGravar = linhas.map((l, i) => ({
      agendamento_id: agendamento.id,
      servico_id: l.servicoId,
      nome_servico: l.nome,
      profissional_id: l.profissionalId,
      horario: paraTstzRange(data, l.inicioMin, l.fimMin),
      valor: i === 0 ? l.valor + valorAdicionais : l.valor,
    }));

    const { error: erroItens } = await supabase.from("itens_agendamento").insert(itensParaGravar);
    if (erroItens) {
      // Insert em lote: ou gravou tudo, ou nada — só precisamos desfazer a visita.
      await supabase.from("agendamentos").delete().eq("id", agendamento.id);
      return { ok: false, erro: mensagemErroAgendamento(erroItens.code) };
    }

    return { ok: true, token: agendamento.token, total };
  } catch {
    return { ok: false, erro: "Não foi possível concluir o agendamento. Tente novamente." };
  }
}

export interface CriarAgendamentoComboInput {
  nome: string;
  whats: string;
  data: string;
  turno: "manha" | "tarde";
  depilacao: "Buço" | "Axila";
}

export type CriarAgendamentoComboResultado =
  | { ok: true; token: string; valor: number; linhas: Array<{ hora: string; servico: string; profissionalNome: string }> }
  | { ok: false; erro: string };

export async function criarAgendamentoCombo(
  input: CriarAgendamentoComboInput,
): Promise<CriarAgendamentoComboResultado> {
  try {
    const nome = normalizarNome(input.nome);
    if (!nome) return { ok: false, erro: "Informe seu nome." };
    const whats = normalizarWhats(input.whats);
    if (!whats) return { ok: false, erro: "WhatsApp inválido. Use DDD + número." };
    if (input.turno !== "manha" && input.turno !== "tarde") return { ok: false, erro: "Escolha o turno." };
    if (input.depilacao !== "Buço" && input.depilacao !== "Axila") return { ok: false, erro: "Escolha a depilação (buço ou axila)." };

    const data = input.data;
    const agora = agoraEmFortaleza();
    let dataCombo: DataCombo | null = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(data) && data >= agora.data) {
      dataCombo = await buscarDataCombo(data);
    }
    if (!dataCombo) return { ok: false, erro: "Data ou turno do combo indisponível." };

    const vagasConfiguradas = input.turno === "manha" ? dataCombo.vagasManha : dataCombo.vagasTarde;
    const vagasUsadas = await buscarVagasUsadasCombo(data, input.turno);
    const vaga = primeiraVagaLivre(vagasUsadas, Math.min(vagasConfiguradas, ordemTurno(input.turno).length));
    if (vaga < 0) return { ok: false, erro: "Vagas esgotadas neste turno." };

    const profissionais = await buscarMapaNomesProfissionais();

    const supabase = createAdminClient();
    const { data: cliente, error: erroCliente } = await supabase
      .from("clientes")
      .upsert({ nome, whats }, { onConflict: "whats" })
      .select("id")
      .single();
    if (erroCliente || !cliente) throw erroCliente ?? new Error("Falha ao gravar cliente.");

    const { data: agendamento, error: erroAgendamento } = await supabase
      .from("agendamentos")
      .insert({
        cliente_id: cliente.id,
        data,
        tipo: "combo",
        turno: input.turno,
        vaga,
        valor_total: dataCombo.valor,
        obs: `Depilação (${input.depilacao}). Cortesia: coffee break.`,
      })
      .select("id, token")
      .single();
    if (erroAgendamento || !agendamento) {
      return { ok: false, erro: mensagemErroAgendamento(erroAgendamento?.code) };
    }

    const ordem = ordemTurno(input.turno);
    const itens = ordem.map((item, indice) => {
      const inicioMin = inicioComboMin(input.turno, vaga, indice);
      const nomeServico = item.nome === "Depilação" ? `Depilação (${input.depilacao})` : item.nome;
      return { ...item, indice, inicioMin, nomeServico };
    });

    const itensParaGravar = itens.map(({ indice, inicioMin, nomeServico, profissionalId }) => ({
      agendamento_id: agendamento.id,
      servico_id: null,
      nome_servico: nomeServico,
      profissional_id: profissionalId,
      horario: paraTstzRange(data, inicioMin, inicioMin + 30),
      valor: indice === 0 ? dataCombo.valor : 0,
    }));

    const { error: erroItens } = await supabase.from("itens_agendamento").insert(itensParaGravar);
    if (erroItens) {
      await supabase.from("agendamentos").delete().eq("id", agendamento.id);
      return { ok: false, erro: mensagemErroAgendamento(erroItens.code) };
    }

    const linhas = [...itens]
      .sort((a, b) => a.inicioMin - b.inicioMin)
      .map((e) => ({
        hora: `${String(Math.floor(e.inicioMin / 60)).padStart(2, "0")}:${String(e.inicioMin % 60).padStart(2, "0")}`,
        servico: e.nomeServico,
        profissionalNome: profissionais.get(e.profissionalId) ?? e.profissionalId,
      }));

    return { ok: true, token: agendamento.token, valor: dataCombo.valor, linhas };
  } catch {
    return { ok: false, erro: "Não foi possível concluir o agendamento. Tente novamente." };
  }
}

export async function cancelarAgendamentoAction(token: string): Promise<{ ok: boolean; erro?: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agendamentos")
    .update({ status: "cancelado" })
    .eq("token", token)
    .eq("status", "confirmado")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, erro: "Não foi possível cancelar. Tente novamente." };
  if (!data) return { ok: false, erro: "Agendamento não encontrado ou já não está mais confirmado." };

  revalidatePath(`/meu-agendamento/${token}`);
  return { ok: true };
}
