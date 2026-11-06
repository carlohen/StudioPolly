import { describe, expect, it } from "vitest";
import { ORDEM_COMBO_MANHA } from "./constants";
import { calcularHorariosLivres, intervaloAlmoco, type IntervaloMin } from "./horarios";
import { diaDaSemanaISO } from "./time";

const TERCA = "2026-11-10"; // terça-feira, dia de combo (ver supabase-schema.sql)
const DOMINGO = "2026-11-15";

describe("calcularHorariosLivres", () => {
  it("devolve slots de 15 em 15 min dentro do expediente quando não há ocupação", () => {
    const livres = calcularHorariosLivres({
      data: TERCA,
      diaDaSemanaISO: diaDaSemanaISO(TERCA),
      duracaoMin: 30,
      ocupados: [intervaloAlmoco()],
    });
    expect(livres[0]).toBe("09:00");
    expect(livres).toContain("09:15");
    expect(livres).not.toContain("09:10"); // fora da granularidade de 15 min
  });

  it("não devolve nada em dia que o salão não atende (domingo)", () => {
    const livres = calcularHorariosLivres({
      data: DOMINGO,
      diaDaSemanaISO: diaDaSemanaISO(DOMINGO),
      duracaoMin: 30,
      ocupados: [],
    });
    expect(livres).toEqual([]);
  });

  it("não oferece horário que não cabe inteiro antes do fechamento (18h)", () => {
    const livres = calcularHorariosLivres({
      data: TERCA,
      diaDaSemanaISO: diaDaSemanaISO(TERCA),
      duracaoMin: 45,
      ocupados: [],
    });
    expect(livres).toContain("17:15");
    expect(livres).not.toContain("17:30"); // 17:30 + 45min = 18:15, passa do fechamento
  });

  it("bloqueia o horário de almoço (12h-13h)", () => {
    const livres = calcularHorariosLivres({
      data: TERCA,
      diaDaSemanaISO: diaDaSemanaISO(TERCA),
      duracaoMin: 30,
      ocupados: [intervaloAlmoco()],
    });
    expect(livres).not.toContain("11:45"); // terminaria 12:15, dentro do almoço
    expect(livres).not.toContain("12:30");
    expect(livres).toContain("13:00");
  });

  it("bloqueia horários já ocupados por outro agendamento ou bloqueio", () => {
    const ocupados: IntervaloMin[] = [intervaloAlmoco(), { inicio: 570, fim: 600 }]; // 09:30-10:00
    const livres = calcularHorariosLivres({
      data: TERCA,
      diaDaSemanaISO: diaDaSemanaISO(TERCA),
      duracaoMin: 30,
      ocupados,
    });
    expect(livres).not.toContain("09:15"); // terminaria 09:45, sobrepõe 09:30-10:00
    expect(livres).not.toContain("09:30");
    expect(livres).toContain("10:00");
  });

  it("respeita o início mínimo para serviços em sequência na mesma visita", () => {
    const livres = calcularHorariosLivres({
      data: TERCA,
      diaDaSemanaISO: diaDaSemanaISO(TERCA),
      duracaoMin: 30,
      ocupados: [intervaloAlmoco()],
      minimoInicioMin: 600, // serviço anterior terminou às 10:00
    });
    expect(livres[0]).toBe("10:00");
  });

  it("no dia de hoje, só mostra horários a partir de agora + 30 min", () => {
    const livres = calcularHorariosLivres({
      data: TERCA,
      diaDaSemanaISO: diaDaSemanaISO(TERCA),
      duracaoMin: 30,
      ocupados: [intervaloAlmoco()],
      agora: { data: TERCA, minutos: 9 * 60 + 40 }, // 09:40 -> próximo slot só a partir de 10:10 -> arredonda p/ 10:15
    });
    expect(livres[0]).toBe("10:15");
  });

  it("nunca mostra horários de uma data passada", () => {
    const livres = calcularHorariosLivres({
      data: TERCA,
      diaDaSemanaISO: diaDaSemanaISO(TERCA),
      duracaoMin: 30,
      ocupados: [],
      agora: { data: "2026-11-11", minutos: 0 },
    });
    expect(livres).toEqual([]);
  });

  it("não adiciona almoço como ocupação extra se o chamador não passar", () => {
    const livres = calcularHorariosLivres({
      data: TERCA,
      diaDaSemanaISO: diaDaSemanaISO(TERCA),
      duracaoMin: 30,
      ocupados: [],
    });
    expect(livres).toContain("12:00"); // sem o intervalo de almoço, o meio-dia fica livre
  });

  it("usa a mesma ordem de serviços do combo como referência (sanity check dos dados)", () => {
    expect(ORDEM_COMBO_MANHA.map((i) => i.profissionalId)).toEqual(["P1", "P3", "P5", "P1", "P2", "P4"]);
  });
});
