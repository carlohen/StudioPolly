export function normalizarNome(nome: string): string | null {
  const limpo = String(nome ?? "").trim().slice(0, 60);
  return limpo.length >= 2 ? limpo : null;
}

// Sempre grava com 55 + DDD (ver PROJETO.md · Segurança).
export function normalizarWhats(whats: string): string | null {
  const digitos = String(whats ?? "").replace(/\D/g, "");
  if (!/^(55)?\d{10,11}$/.test(digitos)) return null;
  return digitos.length <= 11 ? `55${digitos}` : digitos;
}
