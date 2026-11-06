import { describe, expect, it } from "vitest";
import {
  escalaDaVaga,
  inicioComboMin,
  limitarVagas,
  limiteMaximoVagas,
  ordemTurno,
  primeiraVagaLivre,
  reservasComboPorProfissional,
} from "./combo";

describe("ordemTurno", () => {
  it("mantém a ordem original de manhã", () => {
    expect(ordemTurno("manha").map((i) => i.profissionalId)).toEqual(["P1", "P3", "P5", "P1", "P2", "P4"]);
  });

  it("move a pedicure (índice 3) para o fim à tarde", () => {
    const tarde = ordemTurno("tarde");
    expect(tarde.map((i) => i.nome)).toEqual([
      "Manicure (mãos)",
      "Design de sobrancelhas",
      "Corte de cabelo feminino",
      "Depilação",
      "Massagem terapêutica (cortesia)",
      "Pedicure (pés)",
    ]);
  });
});

describe("limiteMaximoVagas / limitarVagas", () => {
  it("é sempre blocos/2 (P1 aparece 2x na escala)", () => {
    expect(limiteMaximoVagas("manha")).toBe(3);
    expect(limiteMaximoVagas("tarde")).toBe(5);
  });

  it("nunca deixa a dona configurar mais vagas do que o limite real", () => {
    expect(limitarVagas("manha", 10)).toBe(3);
    expect(limitarVagas("tarde", 10)).toBe(5);
    expect(limitarVagas("manha", 1)).toBe(1);
    expect(limitarVagas("manha", -5)).toBe(0);
  });
});

describe("primeiraVagaLivre", () => {
  it("acha a primeira vaga livre e retorna -1 se lotado", () => {
    expect(primeiraVagaLivre(new Set(), 3)).toBe(0);
    expect(primeiraVagaLivre(new Set([0]), 3)).toBe(1);
    expect(primeiraVagaLivre(new Set([0, 1, 2]), 3)).toBe(-1);
  });
});

describe("inicioComboMin / escala sem conflito", () => {
  it("nunca sobrepõe os horários da mesma profissional (P1) entre vagas diferentes", () => {
    const limite = limiteMaximoVagas("manha");
    const ocupadosPorProf: Record<string, number[]> = {};
    for (let vaga = 0; vaga < limite; vaga++) {
      escalaDaVaga("manha", vaga).forEach(({ profissionalId, inicioMin }) => {
        ocupadosPorProf[profissionalId] ??= [];
        expect(ocupadosPorProf[profissionalId]).not.toContain(inicioMin);
        ocupadosPorProf[profissionalId].push(inicioMin);
      });
    }
  });

  it("mesma checagem para o turno da tarde (10 blocos, 5 vagas)", () => {
    const limite = limiteMaximoVagas("tarde");
    const ocupadosPorProf: Record<string, number[]> = {};
    for (let vaga = 0; vaga < limite; vaga++) {
      escalaDaVaga("tarde", vaga).forEach(({ profissionalId, inicioMin }) => {
        ocupadosPorProf[profissionalId] ??= [];
        expect(ocupadosPorProf[profissionalId]).not.toContain(inicioMin);
        ocupadosPorProf[profissionalId].push(inicioMin);
      });
    }
  });

  it("escalaDaVaga vem ordenada por horário", () => {
    const escala = escalaDaVaga("manha", 0);
    const horarios = escala.map((i) => i.inicioMin);
    expect(horarios).toEqual([...horarios].sort((a, b) => a - b));
  });
});

describe("reservasComboPorProfissional", () => {
  it("reserva 2 blocos por vaga da manhã para P1 (manicure + pedicure)", () => {
    const reservas = reservasComboPorProfissional({ manha: 3, tarde: 0 });
    expect(reservas["P1"]).toHaveLength(3 * 2);
  });

  it("não reserva nada para um turno com 0 vagas configuradas", () => {
    const reservas = reservasComboPorProfissional({ manha: 0, tarde: 0 });
    expect(reservas).toEqual({});
  });

  it("soma manhã e tarde para a mesma profissional", () => {
    const reservas = reservasComboPorProfissional({ manha: 3, tarde: 5 });
    // P1: 2 blocos x 3 vagas de manhã + 2 blocos x 5 vagas de tarde
    expect(reservas["P1"]).toHaveLength(3 * 2 + 5 * 2);
  });
});

describe("inicioComboMin", () => {
  it("fica dentro da janela do turno", () => {
    for (let vaga = 0; vaga < 5; vaga++) {
      for (let indice = 0; indice < 6; indice++) {
        const inicio = inicioComboMin("tarde", vaga, indice);
        expect(inicio).toBeGreaterThanOrEqual(13 * 60);
        expect(inicio).toBeLessThan(18 * 60);
      }
    }
  });
});
