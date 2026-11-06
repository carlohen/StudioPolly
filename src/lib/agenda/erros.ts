export function mensagemErroAgendamento(codigoPostgres: string | undefined): string {
  if (codigoPostgres === "23P01") return "Esse horário acabou de ser ocupado. Escolha outro.";
  if (codigoPostgres === "23505") return "Essa vaga acabou de ser preenchida. Escolha outra.";
  return "Não foi possível concluir o agendamento. Tente novamente.";
}
