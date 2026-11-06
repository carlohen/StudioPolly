// Fuso fixo America/Fortaleza (UTC-3, sem horário de verão) — ver PROJETO.md.
const OFFSET = "-03:00";

export function paraInstante(data: string, minutosDoDia = 12 * 60): Date {
  const hh = String(Math.floor(minutosDoDia / 60)).padStart(2, "0");
  const mm = String(minutosDoDia % 60).padStart(2, "0");
  return new Date(`${data}T${hh}:${mm}:00${OFFSET}`);
}

// 1=segunda ... 6=sábado, 7=domingo (mesma convenção do Codigo.gs original)
export function diaDaSemanaISO(data: string): number {
  const dia = paraInstante(data).getDay();
  return dia === 0 ? 7 : dia;
}

export function somarDias(data: string, dias: number): string {
  const instante = paraInstante(data);
  instante.setDate(instante.getDate() + dias);
  return formatarData(instante);
}

export function formatarData(instante: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

export function agoraEmFortaleza(instante: Date = new Date()): {
  data: string;
  minutos: number;
} {
  const data = formatarData(instante);
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Fortaleza",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instante);
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? 0);
  const minuto = Number(partes.find((p) => p.type === "minute")?.value ?? 0);
  return { data, minutos: hora * 60 + minuto };
}

export function paraMinutos(horaMinuto: string): number {
  const [h, m] = horaMinuto.split(":").map(Number);
  return h * 60 + m;
}

export function paraHoraMinuto(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Literal de tstzrange pro Postgres, ex: "[2026-11-10T09:00:00-03:00,2026-11-10T09:30:00-03:00)"
export function paraTstzRange(data: string, inicioMin: number, fimMin: number): string {
  return `[${data}T${paraHoraMinuto(inicioMin)}:00${OFFSET},${data}T${paraHoraMinuto(fimMin)}:00${OFFSET})`;
}
