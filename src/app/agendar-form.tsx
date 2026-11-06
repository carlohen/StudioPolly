"use client";

import { useMemo, useState, useTransition } from "react";
import type { DataComboComVagas, Profissional, Servico } from "@/lib/agenda/dados";
import { brl, fmtData } from "@/lib/formato";
import { buscarHorariosAction, criarAgendamentoAvulso, criarAgendamentoCombo } from "./actions";

interface Props {
  profissionais: Profissional[];
  servicos: Servico[];
  whatsSalao: string;
  datasCombo: DataComboComVagas[];
  hoje: string;
}

interface ItemSelecionado {
  servicoId: string;
  nome: string;
  profissionalId: string;
  profissionalNome: string;
  hora: string;
  valor: number;
  fimMin: number;
}

type Resultado =
  | { tipo: "avulso"; data: string; itens: ItemSelecionado[]; total: number; token: string; nome: string }
  | {
      tipo: "combo";
      data: string;
      valor: number;
      token: string;
      nome: string;
      linhas: Array<{ hora: string; servico: string; profissionalNome: string }>;
    };

const LABEL = "mb-1 mt-4 block text-sm font-semibold";
const INPUT = "w-full rounded-xl border-[1.5px] border-linha bg-white p-3 text-[16px] text-texto";

function paraMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function waHref(whatsSalao: string, texto: string): string {
  return `https://wa.me/${whatsSalao}?text=${encodeURIComponent(texto)}`;
}

export function AgendarForm({ profissionais, servicos, whatsSalao, datasCombo, hoje }: Props) {
  const [aba, setAba] = useState<"avulso" | "combo">("avulso");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  // --- aba avulso ---
  const [data, setData] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [horarios, setHorarios] = useState<string[]>([]);
  const [buscandoHorarios, setBuscandoHorarios] = useState(false);
  const [itens, setItens] = useState<ItemSelecionado[]>([]);
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<string[]>([]);
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, startTransition] = useTransition();

  // --- aba combo ---
  const [comboSelecionado, setComboSelecionado] = useState<{ data: string; turno: "manha" | "tarde" } | null>(null);
  const [depilacao, setDepilacao] = useState<"Buço" | "Axila">("Buço");
  const [nomeCombo, setNomeCombo] = useState("");
  const [whatsCombo, setWhatsCombo] = useState("");
  const [erroCombo, setErroCombo] = useState("");
  const [enviandoCombo, startTransitionCombo] = useTransition();

  const servicoAtual = servicos.find((s) => s.id === servicoId);
  const podeAdicionais = itens.some((i) => i.profissionalId === "P1");
  const servicosAdicionais = servicos.filter((s) => s.adicional);

  const grupos = useMemo(
    () =>
      profissionais
        .map((p) => ({ profissional: p, servicos: servicos.filter((s) => s.profissionalId === p.id && !s.adicional) }))
        .filter((g) => g.servicos.length > 0),
    [profissionais, servicos],
  );

  async function buscar(novaData: string, novoServicoId: string, minimoInicioMin: number) {
    setErro("");
    setHorarios([]);
    const servico = servicos.find((s) => s.id === novoServicoId);
    if (!novaData || !servico || servico.sobConsulta) return;
    setBuscandoHorarios(true);
    try {
      setHorarios(await buscarHorariosAction(novoServicoId, novaData, minimoInicioMin));
    } finally {
      setBuscandoHorarios(false);
    }
  }

  function handleMudaData(v: string) {
    setData(v);
    setItens([]);
    setAdicionaisSelecionados([]);
    buscar(v, servicoId, 0);
  }

  function handleMudaServico(v: string) {
    setServicoId(v);
    const fimAnterior = itens.length ? itens[itens.length - 1].fimMin : 0;
    buscar(data, v, fimAnterior);
  }

  function adicionarItem(hora: string) {
    const servico = servicos.find((s) => s.id === servicoId);
    const profissional = profissionais.find((p) => p.id === servico?.profissionalId);
    if (!servico || !profissional) return;
    setItens((prev) => [
      ...prev,
      {
        servicoId: servico.id,
        nome: servico.nome,
        profissionalId: servico.profissionalId,
        profissionalNome: profissional.nome,
        hora,
        valor: servico.preco,
        fimMin: paraMinutos(hora) + servico.duracaoMin,
      },
    ]);
    setServicoId("");
    setHorarios([]);
  }

  function removerUltimo() {
    setItens((prev) => prev.slice(0, -1));
  }

  function enviar() {
    setErro("");
    if (!itens.length) {
      setErro("Escolha ao menos um serviço e um horário.");
      return;
    }
    startTransition(async () => {
      const r = await criarAgendamentoAvulso({
        nome,
        whats,
        data,
        itens: itens.map((i) => ({ servicoId: i.servicoId, hora: i.hora })),
        adicionaisIds: adicionaisSelecionados,
      });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setResultado({ tipo: "avulso", data, itens, total: r.total, token: r.token, nome });
    });
  }

  function enviarCombo() {
    setErroCombo("");
    if (!comboSelecionado) {
      setErroCombo("Escolha a data e o turno.");
      return;
    }
    startTransitionCombo(async () => {
      const r = await criarAgendamentoCombo({
        nome: nomeCombo,
        whats: whatsCombo,
        data: comboSelecionado.data,
        turno: comboSelecionado.turno,
        depilacao,
      });
      if (!r.ok) {
        setErroCombo(r.erro);
        return;
      }
      setResultado({ tipo: "combo", data: comboSelecionado.data, valor: r.valor, token: r.token, nome: nomeCombo, linhas: r.linhas });
    });
  }

  if (resultado?.tipo === "avulso") {
    const textoWhats =
      `Olá! Agendei no Polly Designer em ${fmtData(resultado.data)}: ` +
      `${resultado.itens.map((i) => `${i.hora} ${i.nome}`).join("; ")}. Total ${brl(resultado.total)}. Nome: ${resultado.nome}`;
    return (
      <div className="mx-auto max-w-[560px] px-4 pb-16 pt-7">
        <div className="my-3 rounded-2xl border-[1.5px] border-ouro bg-white p-4">
          <h3 className="mb-2 font-title text-marrom">Agendamento confirmado</h3>
          <p>{fmtData(resultado.data)}</p>
          {resultado.itens.map((i, idx) => (
            <p key={idx}>
              {i.hora} · {i.nome} ({i.profissionalNome})
            </p>
          ))}
          <p className="font-bold">Total: {brl(resultado.total)}</p>
        </div>
        <a className="mt-4 block rounded-full bg-ouro py-3.5 text-center font-bold text-white" target="_blank" href={waHref(whatsSalao, textoWhats)}>
          Enviar confirmação pelo WhatsApp
        </a>
        <a className="mt-4 block text-center text-sm font-semibold text-ouro underline" href={`/meu-agendamento/${resultado.token}`}>
          Ver meu agendamento
        </a>
      </div>
    );
  }

  if (resultado?.tipo === "combo") {
    const textoWhats = `Olá! Reservei o Combo Inauguração em ${fmtData(resultado.data)}. Nome: ${resultado.nome}`;
    return (
      <div className="mx-auto max-w-[560px] px-4 pb-16 pt-7">
        <div className="my-3 rounded-2xl border-[1.5px] border-ouro bg-white p-4">
          <h3 className="mb-2 font-title text-marrom">Vaga reservada</h3>
          <p>
            {fmtData(resultado.data)} · {brl(resultado.valor)} tudo em um dia
          </p>
          {resultado.linhas.map((l, idx) => (
            <p key={idx}>
              {l.hora} · {l.servico} ({l.profissionalNome})
            </p>
          ))}
          <p>Cortesia: coffee break.</p>
        </div>
        <a className="mt-4 block rounded-full bg-ouro py-3.5 text-center font-bold text-white" target="_blank" href={waHref(whatsSalao, textoWhats)}>
          Enviar confirmação pelo WhatsApp
        </a>
        <a className="mt-4 block text-center text-sm font-semibold text-ouro underline" href={`/meu-agendamento/${resultado.token}`}>
          Ver meu agendamento
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px] px-4 pb-16 pt-7">
      <h1 className="text-center font-title text-[32px] tracking-wide text-marrom">Polly Designer</h1>
      <p className="mb-5 mt-1 text-center text-[13px] tracking-[2px]">AGENDE SEU HORÁRIO</p>

      <nav className="mb-4 flex gap-2">
        <button
          type="button"
          className={`flex-1 rounded-full border-[1.5px] border-ouro py-3 text-sm font-semibold ${aba === "avulso" ? "bg-marrom text-white" : "text-marrom"}`}
          onClick={() => setAba("avulso")}
        >
          Agendar serviços
        </button>
        <button
          type="button"
          className={`flex-1 rounded-full border-[1.5px] border-ouro py-3 text-sm font-semibold ${aba === "combo" ? "bg-marrom text-white" : "text-marrom"}`}
          onClick={() => setAba("combo")}
        >
          Combo Inauguração
        </button>
      </nav>

      {aba === "avulso" ? (
        <section>
          <label className={LABEL}>Data (terça a sábado)</label>
          <input type="date" min={hoje} value={data} onChange={(e) => handleMudaData(e.target.value)} className={INPUT} />

          <label className={LABEL}>Serviço</label>
          <select value={servicoId} onChange={(e) => handleMudaServico(e.target.value)} className={INPUT}>
            <option value="">Escolha um serviço</option>
            {grupos.map((g) => (
              <optgroup key={g.profissional.id} label={g.profissional.funcao ? `${g.profissional.nome} · ${g.profissional.funcao}` : g.profissional.nome}>
                {g.servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                    {s.sobConsulta ? " (sob consulta)" : ` · ${s.aPartir ? "a partir de " : ""}${brl(s.preco)}`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <div className="my-2.5 flex flex-wrap gap-2">
            {servicoAtual?.sobConsulta ? (
              <a
                className="block w-full rounded-full bg-ouro py-3.5 text-center font-bold text-white"
                target="_blank"
                href={waHref(whatsSalao, `Olá! Gostaria de consultar sobre ${servicoAtual.nome}.`)}
              >
                Consultar pelo WhatsApp
              </a>
            ) : buscandoHorarios ? (
              <p>Buscando horários...</p>
            ) : (
              servicoId &&
              data &&
              (horarios.length ? (
                horarios.map((h) => (
                  <button
                    type="button"
                    key={h}
                    onClick={() => adicionarItem(h)}
                    className="rounded-full border-[1.5px] border-ouro bg-white px-3.5 py-2 text-sm font-semibold text-marrom hover:bg-marrom hover:text-white"
                  >
                    {h}
                  </button>
                ))
              ) : (
                <p className="font-semibold text-red-800">Sem horários livres neste dia para esse serviço.</p>
              ))
            )}
          </div>

          <div>
            {itens.map((i, idx) => (
              <div key={idx} className="my-1.5 flex items-center justify-between rounded-xl border-[1.5px] border-linha bg-white px-3 py-2.5 text-sm">
                <span>
                  {i.hora} · {i.nome} ({i.profissionalNome})
                </span>
                <span>
                  {brl(i.valor)}
                  {idx === itens.length - 1 && (
                    <button type="button" onClick={removerUltimo} className="ml-2 cursor-pointer text-[13px] font-normal text-ouro">
                      remover
                    </button>
                  )}
                </span>
              </div>
            ))}
            {itens.length > 0 && (
              <p className="text-sm font-bold">Para marcar outro serviço, escolha-o acima: só aparecem horários depois do anterior.</p>
            )}
          </div>

          {podeAdicionais && (
            <div className="my-2">
              <label className="mb-1 block text-sm font-semibold">Adicionais (opcional)</label>
              {servicosAdicionais.map((s) => (
                <label key={s.id} className="block text-sm font-medium">
                  <input
                    type="checkbox"
                    className="mr-2 w-auto"
                    checked={adicionaisSelecionados.includes(s.id)}
                    onChange={(e) =>
                      setAdicionaisSelecionados((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)))
                    }
                  />
                  {s.nome} · {brl(s.preco)}
                </label>
              ))}
            </div>
          )}

          <label className={LABEL}>Seu nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className={INPUT} autoComplete="name" />

          <label className={LABEL}>WhatsApp com DDD</label>
          <input
            value={whats}
            onChange={(e) => setWhats(e.target.value)}
            placeholder="85 9XXXX-XXXX"
            inputMode="tel"
            autoComplete="tel"
            className={INPUT}
          />

          <p className="mt-4 text-xs opacity-85">Usamos seu nome e WhatsApp somente para organizar o agendamento e falar sobre o atendimento.</p>

          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            className="mt-5 w-full rounded-full bg-marrom py-4 font-bold tracking-wide text-white disabled:opacity-60"
          >
            Confirmar agendamento
          </button>
          {erro && <p className="mt-2.5 font-semibold text-red-800">{erro}</p>}
        </section>
      ) : (
        <section>
          <div className="my-3 rounded-2xl border-[1.5px] border-ouro bg-white p-4">
            <h3 className="mb-2 font-title text-marrom">Combo Inauguração</h3>
            <ul className="list-disc space-y-0.5 pl-5 text-sm">
              <li>Manicure (mãos) e pedicure (pés)</li>
              <li>Design de sobrancelhas</li>
              <li>Corte de cabelo feminino</li>
              <li>Depilação (buço ou axila)</li>
              <li>Cortesia: massagem terapêutica e coffee break</li>
            </ul>
            <p className="mt-2 text-[13px]">Vagas limitadas. O sistema monta a ordem dos atendimentos para você.</p>
          </div>

          {datasCombo.length === 0 ? (
            <p>Nenhuma data de combo aberta no momento.</p>
          ) : (
            datasCombo.map((d) => (
              <div key={d.data} className="my-3 rounded-2xl border-[1.5px] border-ouro bg-white p-4">
                <b>{fmtData(d.data)}</b> · {brl(d.valor)}
                <div className="my-2.5 flex flex-wrap gap-2">
                  {(["manha", "tarde"] as const).map((t) => {
                    const resta = d.vagas[t].resta;
                    const selecionado = comboSelecionado?.data === d.data && comboSelecionado?.turno === t;
                    return (
                      <button
                        type="button"
                        key={t}
                        disabled={resta < 1}
                        onClick={() => setComboSelecionado({ data: d.data, turno: t })}
                        className={`rounded-full border-[1.5px] border-ouro px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                          selecionado ? "bg-marrom text-white" : "bg-white text-marrom"
                        }`}
                      >
                        {t === "manha" ? "Manhã 09h–12h" : "Tarde 13h–18h"} · {resta < 1 ? "esgotado" : `${resta} vaga(s)`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          <label className={LABEL}>Depilação</label>
          <select value={depilacao} onChange={(e) => setDepilacao(e.target.value as "Buço" | "Axila")} className={INPUT}>
            <option>Buço</option>
            <option>Axila</option>
          </select>

          <label className={LABEL}>Seu nome</label>
          <input value={nomeCombo} onChange={(e) => setNomeCombo(e.target.value)} className={INPUT} autoComplete="name" />

          <label className={LABEL}>WhatsApp com DDD</label>
          <input
            value={whatsCombo}
            onChange={(e) => setWhatsCombo(e.target.value)}
            placeholder="85 9XXXX-XXXX"
            inputMode="tel"
            autoComplete="tel"
            className={INPUT}
          />

          <button
            type="button"
            onClick={enviarCombo}
            disabled={enviandoCombo}
            className="mt-5 w-full rounded-full bg-marrom py-4 font-bold tracking-wide text-white disabled:opacity-60"
          >
            Reservar vaga no combo
          </button>
          {erroCombo && <p className="mt-2.5 font-semibold text-red-800">{erroCombo}</p>}
        </section>
      )}
    </div>
  );
}
