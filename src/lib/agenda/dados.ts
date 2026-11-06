import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitarVagas, reservasComboPorProfissional } from "./combo";
import { CONFIG_PADRAO, type Turno } from "./constants";
import { calcularHorariosLivres, intervaloAlmoco, type ConfigAgenda, type IntervaloMin } from "./horarios";
import { agoraEmFortaleza, diaDaSemanaISO, paraHoraMinuto } from "./time";
import { parseTstzRangeParaMinutos } from "./tstzrange";

export interface Profissional {
  id: string;
  nome: string;
  funcao: string | null;
  ordem: number;
}

export interface Servico {
  id: string;
  nome: string;
  duracaoMin: number;
  preco: number;
  aPartir: boolean;
  adicional: boolean;
  sobConsulta: boolean;
  profissionalId: string;
}

export interface DataCombo {
  data: string;
  vagasManha: number;
  vagasTarde: number;
  valor: number;
}

async function buscarLinhaConfig(chave: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("config").select("valor").eq("chave", chave).maybeSingle();
  if (error) throw error;
  return data?.valor ?? null;
}

export async function buscarConfigAgenda(): Promise<ConfigAgenda> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("config")
    .select("chave, valor")
    .in("chave", ["abre", "fecha", "almoco_inicio", "almoco_fim", "dias_semana"]);
  if (error) throw error;

  const porChave = new Map((data ?? []).map((r) => [r.chave, r.valor]));
  const paraMin = (hhmm: string | undefined, padrao: number) => {
    if (!hhmm) return padrao;
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  const diasSemanaStr = porChave.get("dias_semana");
  return {
    aberturaMin: paraMin(porChave.get("abre"), CONFIG_PADRAO.aberturaMin),
    fechamentoMin: paraMin(porChave.get("fecha"), CONFIG_PADRAO.fechamentoMin),
    almocoInicioMin: paraMin(porChave.get("almoco_inicio"), CONFIG_PADRAO.almocoInicioMin),
    almocoFimMin: paraMin(porChave.get("almoco_fim"), CONFIG_PADRAO.almocoFimMin),
    diasAtendimento: diasSemanaStr ? diasSemanaStr.split(",").map(Number) : CONFIG_PADRAO.diasAtendimento,
    granularidadeMin: CONFIG_PADRAO.granularidadeMin,
  };
}

export async function buscarWhatsSalao(): Promise<string> {
  return (await buscarLinhaConfig("whats_salao")) ?? "";
}

export async function buscarMapaNomesProfissionais(): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("profissionais").select("id, nome");
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id, p.nome]));
}

export async function buscarProfissionaisAtivos(): Promise<Profissional[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profissionais")
    .select("id, nome, funcao, ordem")
    .eq("ativo", true)
    .order("ordem");
  if (error) throw error;
  return data ?? [];
}

function mapearServico(r: {
  id: string;
  nome: string;
  duracao_min: number;
  preco: number;
  a_partir: boolean;
  adicional: boolean;
  sob_consulta: boolean;
  profissional_id: string;
}): Servico {
  return {
    id: r.id,
    nome: r.nome,
    duracaoMin: r.duracao_min,
    preco: Number(r.preco),
    aPartir: r.a_partir,
    adicional: r.adicional,
    sobConsulta: r.sob_consulta,
    profissionalId: r.profissional_id,
  };
}

export async function buscarServicosAtivos(): Promise<Servico[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("servicos")
    .select("id, nome, duracao_min, preco, a_partir, adicional, sob_consulta, profissional_id")
    .eq("ativo", true);
  if (error) throw error;
  return (data ?? []).map(mapearServico);
}

export async function buscarServicoPorId(id: string): Promise<Servico | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("servicos")
    .select("id, nome, duracao_min, preco, a_partir, adicional, sob_consulta, profissional_id")
    .eq("id", id)
    .eq("ativo", true)
    .maybeSingle();
  if (error) throw error;
  return data ? mapearServico(data) : null;
}

export async function buscarDataCombo(data: string): Promise<DataCombo | null> {
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("datas_combo")
    .select("data, vagas_manha, vagas_tarde, valor")
    .eq("data", data)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;
  return { data: row.data, vagasManha: row.vagas_manha, vagasTarde: row.vagas_tarde, valor: Number(row.valor) };
}

export async function ehDataCombo(data: string): Promise<boolean> {
  return (await buscarDataCombo(data)) !== null;
}

export async function buscarVagasUsadasCombo(data: string, turno: Turno): Promise<Set<number>> {
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("agendamentos")
    .select("vaga")
    .eq("data", data)
    .eq("turno", turno)
    .eq("tipo", "combo")
    .neq("status", "cancelado");
  if (error) throw error;
  return new Set((rows ?? []).map((r) => Number(r.vaga)));
}

async function buscarItensAgendadosProfissional(data: string, profissionalId: string): Promise<IntervaloMin[]> {
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("itens_agendamento")
    .select("horario, agendamentos!inner(data)")
    .eq("profissional_id", profissionalId)
    .eq("cancelado", false)
    .eq("agendamentos.data", data);
  if (error) throw error;
  return (rows ?? []).map((r) => parseTstzRangeParaMinutos(r.horario as unknown as string));
}

async function buscarBloqueiosProfissional(data: string, profissionalId: string): Promise<IntervaloMin[]> {
  const supabase = createAdminClient();
  const inicioDia = `${data}T00:00:00-03:00`;
  const fimDia = `${data}T23:59:59-03:00`;
  const { data: rows, error } = await supabase
    .from("bloqueios")
    .select("horario, profissional_id")
    .or(`profissional_id.eq.${profissionalId},profissional_id.is.null`)
    .overlaps("horario", `[${inicioDia},${fimDia})`);
  if (error) throw error;
  return (rows ?? []).map((r) => parseTstzRangeParaMinutos(r.horario as unknown as string));
}

// Ocupação total de uma profissional num dia: almoço + bloqueios + agendamentos
// já feitos + (se for data de combo) a escala inteira reservada para ela.
export async function buscarOcupacaoProfissional(
  data: string,
  profissionalId: string,
  config: ConfigAgenda,
): Promise<IntervaloMin[]> {
  const [itens, bloqueios, combo] = await Promise.all([
    buscarItensAgendadosProfissional(data, profissionalId),
    buscarBloqueiosProfissional(data, profissionalId),
    buscarDataCombo(data),
  ]);

  const ocupados: IntervaloMin[] = [intervaloAlmoco(config), ...itens, ...bloqueios];

  if (combo) {
    const reservas = reservasComboPorProfissional({ manha: combo.vagasManha, tarde: combo.vagasTarde });
    ocupados.push(...(reservas[profissionalId] ?? []));
  }

  return ocupados;
}

export async function buscarHorariosLivres(servicoId: string, data: string, minimoInicioMin = 0): Promise<string[]> {
  const servico = await buscarServicoPorId(servicoId);
  if (!servico || servico.sobConsulta || servico.adicional) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return [];

  const config = await buscarConfigAgenda();
  const diaSemana = diaDaSemanaISO(data);
  if (!config.diasAtendimento.includes(diaSemana)) return [];

  const ocupados = await buscarOcupacaoProfissional(data, servico.profissionalId, config);

  return calcularHorariosLivres({
    data,
    diaDaSemanaISO: diaSemana,
    duracaoMin: servico.duracaoMin,
    ocupados,
    minimoInicioMin,
    agora: agoraEmFortaleza(),
    config,
  });
}

export interface DataComboComVagas extends DataCombo {
  vagas: Record<Turno, { limite: number; resta: number }>;
}

export async function buscarDatasComboFuturas(limite = 6): Promise<DataComboComVagas[]> {
  const hoje = agoraEmFortaleza().data;
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("datas_combo")
    .select("data, vagas_manha, vagas_tarde, valor")
    .gte("data", hoje)
    .order("data")
    .limit(limite);
  if (error) throw error;

  return Promise.all(
    (rows ?? []).map(async (row) => {
      const [usadasManha, usadasTarde] = await Promise.all([
        buscarVagasUsadasCombo(row.data, "manha"),
        buscarVagasUsadasCombo(row.data, "tarde"),
      ]);
      const limiteManha = limitarVagas("manha", row.vagas_manha);
      const limiteTarde = limitarVagas("tarde", row.vagas_tarde);
      return {
        data: row.data,
        vagasManha: row.vagas_manha,
        vagasTarde: row.vagas_tarde,
        valor: Number(row.valor),
        vagas: {
          manha: { limite: limiteManha, resta: Math.max(0, limiteManha - usadasManha.size) },
          tarde: { limite: limiteTarde, resta: Math.max(0, limiteTarde - usadasTarde.size) },
        },
      };
    }),
  );
}

export interface ItemVisita {
  nomeServico: string;
  profissionalNome: string;
  inicio: string;
  fim: string;
  valor: number;
  cancelado: boolean;
}

export interface Visita {
  data: string;
  tipo: "avulso" | "combo";
  status: "confirmado" | "concluido" | "faltou" | "cancelado";
  valorTotal: number;
  obs: string | null;
  clienteNome: string;
  itens: ItemVisita[];
}

export async function buscarVisitaPorToken(token: string): Promise<Visita | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agendamentos")
    .select(
      "data, tipo, status, valor_total, obs, clientes(nome), itens_agendamento(nome_servico, profissional_id, horario, valor, cancelado)",
    )
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const nomesProfissionais = await buscarMapaNomesProfissionais();
  const cliente = data.clientes as unknown as { nome: string } | null;
  const linhasBrutas = (data.itens_agendamento ?? []) as unknown as Array<{
    nome_servico: string;
    profissional_id: string;
    horario: string;
    valor: number;
    cancelado: boolean;
  }>;

  const itens: ItemVisita[] = linhasBrutas
    .map((i) => {
      const intervalo = parseTstzRangeParaMinutos(i.horario);
      return {
        nomeServico: i.nome_servico,
        profissionalNome: nomesProfissionais.get(i.profissional_id) ?? i.profissional_id,
        inicio: paraHoraMinuto(intervalo.inicio),
        fim: paraHoraMinuto(intervalo.fim),
        valor: Number(i.valor),
        cancelado: i.cancelado,
      };
    })
    .sort((a, b) => (a.inicio < b.inicio ? -1 : 1));

  return {
    data: data.data,
    tipo: data.tipo,
    status: data.status,
    valorTotal: Number(data.valor_total),
    obs: data.obs,
    clienteNome: cliente?.nome ?? "",
    itens,
  };
}
