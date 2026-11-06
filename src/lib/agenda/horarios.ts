import { CONFIG_PADRAO } from "./constants";
import { paraHoraMinuto } from "./time";

export interface IntervaloMin {
  inicio: number; // minutos desde 00:00, inclusive
  fim: number; // minutos desde 00:00, exclusivo
}

export type ConfigAgenda = typeof CONFIG_PADRAO;

export function diaAtendido(data: string, diaDaSemanaISO: number, config: ConfigAgenda = CONFIG_PADRAO): boolean {
  return config.diasAtendimento.includes(diaDaSemanaISO);
}

function sobrepoe(a: IntervaloMin, inicio: number, fim: number): boolean {
  return inicio < a.fim && fim > a.inicio;
}

export interface CalcularHorariosLivresParams {
  data: string;
  diaDaSemanaISO: number;
  duracaoMin: number;
  ocupados: IntervaloMin[]; // já deve incluir almoço, bloqueios, outros agendamentos e reservas do combo
  minimoInicioMin?: number; // fim do serviço anterior, quando a visita tem vários serviços em sequência
  agora?: { data: string; minutos: number }; // instante atual em America/Fortaleza
  config?: ConfigAgenda;
}

// Portado de horarios() no Codigo.gs: devolve os horários "HH:mm" em que o
// serviço cabe inteiro antes do fechamento, sem bater em nenhum ocupado.
export function calcularHorariosLivres({
  data,
  diaDaSemanaISO,
  duracaoMin,
  ocupados,
  minimoInicioMin = 0,
  agora,
  config = CONFIG_PADRAO,
}: CalcularHorariosLivresParams): string[] {
  if (!diaAtendido(data, diaDaSemanaISO, config)) return [];
  if (agora && data < agora.data) return [];

  let inicio = Math.max(config.aberturaMin, minimoInicioMin);
  if (agora && data === agora.data) {
    inicio = Math.max(inicio, agora.minutos + 30);
  }

  const passo = config.granularidadeMin;
  const livres: string[] = [];
  const primeiroSlot = Math.ceil(inicio / passo) * passo;
  for (let t = primeiroSlot; t + duracaoMin <= config.fechamentoMin; t += passo) {
    const conflita = ocupados.some((o) => sobrepoe(o, t, t + duracaoMin));
    if (!conflita) livres.push(paraHoraMinuto(t));
  }
  return livres;
}

export function intervaloAlmoco(config: ConfigAgenda = CONFIG_PADRAO): IntervaloMin {
  return { inicio: config.almocoInicioMin, fim: config.almocoFimMin };
}
