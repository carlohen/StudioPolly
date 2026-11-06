import { ORDEM_COMBO_MANHA, TURNOS_COMBO, type Turno } from "./constants";
import type { IntervaloMin } from "./horarios";

export interface ItemCombo {
  nome: string;
  profissionalId: string;
}

// No turno da tarde a Pedicure (P1) vai para o fim da lista — ver PROJETO.md.
export function ordemTurno(turno: Turno): ItemCombo[] {
  const ordem = ORDEM_COMBO_MANHA.map((i) => ({ ...i }));
  if (turno === "tarde") {
    const pedicure = ordem.splice(3, 1)[0];
    ordem.push(pedicure);
  }
  return ordem;
}

// A cliente na vaga `vaga` faz o serviço de índice `indiceServico` às
// inicio_turno + 30 * ((vaga + indiceServico) % blocos). Isso garante zero
// conflito entre vagas (ver PROJETO.md).
export function inicioComboMin(turno: Turno, vaga: number, indiceServico: number): number {
  const t = TURNOS_COMBO[turno];
  return t.inicioMin + 30 * ((vaga + indiceServico) % t.blocos);
}

// O limite real de vagas é sempre blocos/2, porque P1 aparece 2x na escala
// (ela faz manicure e pedicure de cada cliente, sem pausa no turno).
export function limiteMaximoVagas(turno: Turno): number {
  return Math.floor(TURNOS_COMBO[turno].blocos / 2);
}

export function limitarVagas(turno: Turno, vagasConfiguradas: number): number {
  return Math.max(0, Math.min(vagasConfiguradas, limiteMaximoVagas(turno)));
}

// Primeira vaga livre (0-based) dado o conjunto de vagas já usadas; -1 se lotado.
export function primeiraVagaLivre(vagasUsadas: Set<number>, limite: number): number {
  for (let i = 0; i < limite; i++) {
    if (!vagasUsadas.has(i)) return i;
  }
  return -1;
}

export interface ItemEscalaCombo extends ItemCombo {
  indice: number;
  inicioMin: number;
}

// Agenda completa (ordenada por horário) de uma vaga em um turno — usada
// tanto para gravar os itens quanto para mostrar a confirmação à cliente.
export function escalaDaVaga(turno: Turno, vaga: number): ItemEscalaCombo[] {
  return ordemTurno(turno)
    .map((item, indice) => ({ ...item, indice, inicioMin: inicioComboMin(turno, vaga, indice) }))
    .sort((a, b) => a.inicioMin - b.inicioMin);
}

// Para cada profissional, todos os blocos de 30 min reservados pela escala do
// combo (somando as vagas configuradas dos dois turnos). Datas de combo
// bloqueiam esses horários para agendamentos avulsos (ver PROJETO.md).
export function reservasComboPorProfissional(vagasPorTurno: Record<Turno, number>): Record<string, IntervaloMin[]> {
  const porProfissional: Record<string, IntervaloMin[]> = {};
  (Object.keys(TURNOS_COMBO) as Turno[]).forEach((turno) => {
    const limite = limitarVagas(turno, vagasPorTurno[turno]);
    for (let vaga = 0; vaga < limite; vaga++) {
      escalaDaVaga(turno, vaga).forEach(({ profissionalId, inicioMin }) => {
        (porProfissional[profissionalId] ??= []).push({ inicio: inicioMin, fim: inicioMin + 30 });
      });
    }
  });
  return porProfissional;
}
