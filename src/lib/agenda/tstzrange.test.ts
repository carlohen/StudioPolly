import { describe, expect, it } from "vitest";
import { parseTstzRangeCompleto, parseTstzRangeParaMinutos } from "./tstzrange";

describe("parseTstzRangeParaMinutos", () => {
  it("lê o formato que o Postgres devolve, com offset sem minutos (+00)", () => {
    const r = parseTstzRangeParaMinutos('["2026-11-12 12:00:00+00","2026-11-12 12:30:00+00")');
    // 12:00 UTC = 09:00 em Fortaleza (UTC-3)
    expect(r).toEqual({ inicio: 9 * 60, fim: 9 * 60 + 30 });
  });

  it("também aceita offset completo (+00:00)", () => {
    const r = parseTstzRangeParaMinutos('["2026-11-12 12:00:00+00:00","2026-11-12 12:30:00+00:00")');
    expect(r).toEqual({ inicio: 9 * 60, fim: 9 * 60 + 30 });
  });
});

describe("parseTstzRangeCompleto", () => {
  it("também devolve a data (America/Fortaleza) do início", () => {
    const r = parseTstzRangeCompleto('["2026-11-12 12:00:00+00","2026-11-12 12:30:00+00")');
    expect(r.data).toBe("2026-11-12");
    expect(r.minutos).toEqual({ inicio: 9 * 60, fim: 9 * 60 + 30 });
  });

  it("vira o dia corretamente perto da meia-noite UTC", () => {
    // 2026-11-12 02:00 UTC = 2026-11-11 23:00 em Fortaleza
    const r = parseTstzRangeCompleto('["2026-11-12 02:00:00+00","2026-11-12 02:30:00+00")');
    expect(r.data).toBe("2026-11-11");
  });
});
