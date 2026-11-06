import type { IntervaloMin } from "./horarios";
import { agoraEmFortaleza } from "./time";

// O Postgres às vezes devolve o offset sem os minutos (ex: "+00"), que o
// Date() do Node não aceita — normaliza para "+00:00" antes de parsear.
function normalizarTimestamptz(valor: string): string {
  const comT = valor.trim().replace(" ", "T");
  return /[+-]\d{2}$/.test(comT) ? `${comT}:00` : comT;
}

// Converte o texto de um tstzrange do Postgres (ex: '["2026-11-10 09:00:00+00","2026-11-10 09:30:00+00")')
// no minuto-do-dia (America/Fortaleza) de início e fim.
export function parseTstzRangeParaMinutos(range: string): IntervaloMin {
  return parseTstzRangeCompleto(range).minutos;
}

// Igual, mas também devolve a data (America/Fortaleza) do início — útil para
// telas que listam bloqueios/itens sem já saber a data de antemão.
export function parseTstzRangeCompleto(range: string): { data: string; minutos: IntervaloMin } {
  const partes = range.match(/"([^"]+)"\s*,\s*"([^"]+)"/);
  if (!partes) throw new Error(`tstzrange inesperado: ${range}`);
  const inicioInstante = new Date(normalizarTimestamptz(partes[1]));
  const fimInstante = new Date(normalizarTimestamptz(partes[2]));
  const inicio = agoraEmFortaleza(inicioInstante);
  const fim = agoraEmFortaleza(fimInstante);
  return { data: inicio.data, minutos: { inicio: inicio.minutos, fim: fim.minutos } };
}
