import { describe, expect, it } from "vitest";
import { normalizarNome, normalizarWhats } from "./validacao";

describe("normalizarNome", () => {
  it("aceita nomes válidos e corta em 60 caracteres", () => {
    expect(normalizarNome("Maria")).toBe("Maria");
    expect(normalizarNome("  Maria  ")).toBe("Maria");
    expect(normalizarNome("A".repeat(80))).toHaveLength(60);
  });

  it("rejeita nomes muito curtos", () => {
    expect(normalizarNome("M")).toBeNull();
    expect(normalizarNome("")).toBeNull();
  });
});

describe("normalizarWhats", () => {
  it("aceita número com DDD e adiciona o 55", () => {
    expect(normalizarWhats("85994007665")).toBe("5585994007665");
    expect(normalizarWhats("85 9 9400-7665")).toBe("5585994007665");
  });

  it("aceita número que já vem com 55", () => {
    expect(normalizarWhats("5585994007665")).toBe("5585994007665");
  });

  it("rejeita números inválidos", () => {
    expect(normalizarWhats("123")).toBeNull();
    expect(normalizarWhats("")).toBeNull();
  });
});
