export const GRANULARIDADE_MIN = 15;

// Manicure/pedicure: só com algum serviço dela a visita pode levar adicionais.
export const PROFISSIONAL_MANICURE_ID = "P1";

// Valores padrão (iguais aos de `config` no supabase-schema.sql). A dona pode
// alterá-los pelo painel; a lógica de horários sempre recebe esses números
// como parâmetro, nunca lê a config diretamente.
export const CONFIG_PADRAO = {
  aberturaMin: 9 * 60,
  fechamentoMin: 18 * 60,
  almocoInicioMin: 12 * 60,
  almocoFimMin: 13 * 60,
  diasAtendimento: [2, 3, 4, 5, 6], // terça a sábado
  granularidadeMin: GRANULARIDADE_MIN,
};

export const TURNOS_COMBO = {
  manha: { inicioMin: 9 * 60, blocos: 6 },
  tarde: { inicioMin: 13 * 60, blocos: 10 },
} as const;

export type Turno = keyof typeof TURNOS_COMBO;

// Ordem dos atendimentos do combo no turno da manhã. P1 (manicure/pedicure)
// aparece 2x — por isso o limite de vagas é sempre blocos/2 (ver PROJETO.md).
export const ORDEM_COMBO_MANHA: ReadonlyArray<{
  nome: string;
  profissionalId: string;
}> = [
  { nome: "Manicure (mãos)", profissionalId: "P1" },
  { nome: "Design de sobrancelhas", profissionalId: "P3" },
  { nome: "Corte de cabelo feminino", profissionalId: "P5" },
  { nome: "Pedicure (pés)", profissionalId: "P1" },
  { nome: "Depilação", profissionalId: "P2" },
  { nome: "Massagem terapêutica (cortesia)", profissionalId: "P4" },
];
