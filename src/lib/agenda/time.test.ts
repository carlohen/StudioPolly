import { describe, expect, it } from "vitest";
import { agoraEmFortaleza, diaDaSemanaISO, paraHoraMinuto, paraMinutos, somarDias } from "./time";

describe("diaDaSemanaISO", () => {
  it("retorna 2 para terça-feira e 6 para sábado", () => {
    // 2026-11-10 é uma terça-feira; 2026-11-14 é um sábado
    expect(diaDaSemanaISO("2026-11-10")).toBe(2);
    expect(diaDaSemanaISO("2026-11-14")).toBe(6);
  });

  it("retorna 7 para domingo e 1 para segunda", () => {
    expect(diaDaSemanaISO("2026-11-15")).toBe(7);
    expect(diaDaSemanaISO("2026-11-16")).toBe(1);
  });
});

describe("somarDias", () => {
  it("soma dias sem pular por causa de fuso", () => {
    expect(somarDias("2026-11-07", 1)).toBe("2026-11-08");
    expect(somarDias("2026-11-30", 1)).toBe("2026-12-01");
  });
});

describe("paraMinutos / paraHoraMinuto", () => {
  it("convertem nos dois sentidos", () => {
    expect(paraMinutos("09:30")).toBe(570);
    expect(paraHoraMinuto(570)).toBe("09:30");
    expect(paraHoraMinuto(paraMinutos("18:00"))).toBe("18:00");
  });
});

describe("agoraEmFortaleza", () => {
  it("calcula a data e os minutos do dia em UTC-3, independente do fuso do servidor", () => {
    // 2026-11-05T14:05:00Z = 2026-11-05 11:05 em Fortaleza (UTC-3)
    const r = agoraEmFortaleza(new Date("2026-11-05T14:05:00Z"));
    expect(r.data).toBe("2026-11-05");
    expect(r.minutos).toBe(11 * 60 + 5);
  });

  it("vira o dia corretamente perto da meia-noite UTC", () => {
    // 2026-11-05T02:30:00Z = 2026-11-04 23:30 em Fortaleza
    const r = agoraEmFortaleza(new Date("2026-11-05T02:30:00Z"));
    expect(r.data).toBe("2026-11-04");
    expect(r.minutos).toBe(23 * 60 + 30);
  });
});
