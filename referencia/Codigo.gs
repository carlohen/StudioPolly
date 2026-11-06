/**
 * POLLY DESIGNER - Agendamento (Codigo.gs)
 * 1) Crie uma planilha nova e abra Extensões > Apps Script (o script PRECISA estar ligado à planilha).
 * 2) Cole este código e crie os arquivos HTML "Index" e "Admin".
 * 3) Rode UMA vez a função "instalar" pelo editor e autorize.
 * 4) Implantar > Nova implantação > App da Web (Executar como: Eu · Quem pode acessar: Qualquer pessoa).
 * Funções terminadas em "_" são privadas: o site não consegue chamá-las pelo navegador.
 */
const TZ = 'America/Fortaleza', WHATS = '5585994007665';
const G = 15, ABRE = 540, FECHA = 1080, AI = 720, AF = 780; // minutos: 9h, 18h, almoço 12h-13h
const TURNOS = { manha: { ini: 540, blocos: 6 }, tarde: { ini: 780, blocos: 10 } };
// Ordem dos atendimentos do combo (turno da manhã). Carlene (P1) aparece 2x.
const COMBO = [
  { n: 'Manicure (mãos)', prof: 'P1' }, { n: 'Design de sobrancelhas', prof: 'P3' },
  { n: 'Corte de cabelo feminino', prof: 'P5' }, { n: 'Pedicure (pés)', prof: 'P1' },
  { n: 'Depilação', prof: 'P2' }, { n: 'Massagem terapêutica (cortesia)', prof: 'P4' }
];
const CAB_AG = ['id','visita','tipo','criadoEm','cliente','whats','servico','prof','profNome','data','inicio','fim','valor','status','evento','turno','vaga','obs'];
const STATUS = ['confirmado', 'concluído', 'faltou', 'cancelado'];
const CACHE = {}; // cache por execução (evita ler a mesma aba dezenas de vezes)

const ss = () => SpreadsheetApp.getActiveSpreadsheet();
const toMin = s => { const p = String(s).split(':'); return +p[0] * 60 + +p[1]; };
const toHM = n => ('0' + Math.floor(n / 60)).slice(-2) + ':' + ('0' + (n % 60)).slice(-2);
const hojeStr = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
const dt = d => new Date(d + 'T12:00:00-03:00');
const dow = d => +Utilities.formatDate(dt(d), TZ, 'u'); // 1=seg ... 7=dom
const diaUtil = d => dow(d) >= 2 && dow(d) <= 6; // terça a sábado
function addDias_(d, n) { return Utilities.formatDate(new Date(dt(d).getTime() + n * 864e5), TZ, 'yyyy-MM-dd'); }
function normData_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  v = String(v).trim(); const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? m[3] + '-' + m[2] + '-' + m[1] : v;
}
function ler_(nome) {
  if (CACHE[nome]) return CACHE[nome];
  const sh = ss().getSheetByName(nome);
  if (!sh) throw new Error('Aba "' + nome + '" não encontrada. Rode a função instalar.');
  const v = sh.getDataRange().getValues(), h = v.shift().map(x => String(x).trim()), tz = ss().getSpreadsheetTimeZone();
  // Converte datas/horas que a planilha tenha transformado em Date (evita erros de horário e de envio ao site)
  return CACHE[nome] = v.filter(r => r[0] !== '').map(r => {
    const o = {};
    h.forEach((k, i) => {
      let x = r[i];
      if (x instanceof Date) x = Utilities.formatDate(x, tz, k === 'inicio' || k === 'fim' ? 'HH:mm' : k === 'data' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm');
      o[k] = x;
    });
    return o;
  });
}
function cfg_() { const o = {}; ler_('Config').forEach(r => o[String(r.chave).trim()] = r.valor); return o; }

/** Cria as abas já preenchidas. Rode UMA vez, pelo editor. */
function instalar() {
  const ui = SpreadsheetApp.getUi(); // dá erro se chamada pelo site: ninguém de fora consegue apagar a planilha
  const wb = ss(), ag = wb.getSheetByName('Agendamentos');
  if (ag && ag.getLastRow() > 1 &&
      ui.alert('Já existem agendamentos. Reinstalar APAGA todos eles. Continuar?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  wb.setSpreadsheetTimeZone(TZ);
  const mk = (n, cab, linhas, txt) => {
    const sh = wb.getSheetByName(n) || wb.insertSheet(n); sh.clear();
    if (txt) sh.getRange(1, 1, sh.getMaxRows(), cab.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold');
    if (linhas.length) sh.getRange(2, 1, linhas.length, cab.length).setValues(linhas);
    sh.setFrozenRows(1);
  };
  mk('Profissionais', ['id','nome','funcao'], [
    ['P1','Carlene Felix','Manicure e Pedicure'], ['P2','Amanda Rodrigues','Depilação'],
    ['P3','Naty','Sobrancelhas e cílios'], ['P4','Leon Castello','Massoterapia'], ['P5','Elisette Mello','Cabelo']], false);
  const L = [], s = (id, n, dur, val, p, ap, ad, sc) => L.push([id, n, dur, val, ap || 'nao', ad || 'nao', sc || 'nao', p]);
  s('S01','Unhas das mãos simples',30,25,'P1'); s('S02','Unhas das mãos em gel',30,50,'P1');
  s('S03','Unhas dos pés simples',30,25,'P1'); s('S04','Unhas dos pés em gel',30,50,'P1');
  s('S05','Esmaltação',30,30,'P1'); s('S06','Banho de gel',30,50,'P1');
  s('S07','Postiça realista',30,45,'P1'); s('S08','Postiça simples',30,35,'P1'); s('S09','Spa dos pés',30,85,'P1');
  s('A01','Pedraria',0,10,'P1','nao','sim'); s('A02','Adesivos',0,10,'P1','nao','sim'); s('A03','Etop cold',0,10,'P1','nao','sim');
  s('S10','Buço',15,15,'P2'); s('S11','Axila',30,20,'P2'); s('S12','Perna',30,30,'P2'); s('S13','Coxa',30,40,'P2');
  s('S14','Contorno simples',30,30,'P2'); s('S15','Contorno completo',30,50,'P2'); s('S16','Dedos',10,15,'P2');
  s('S17','Sobrancelha simples',30,20,'P3'); s('S18','Design de sobrancelha com henna',30,40,'P3'); s('S19','Aplicação de cílios',30,40,'P3');
  s('S20','Massagem terapêutica',30,135,'P4'); s('S21','Massagem modeladora',30,130,'P4'); s('S22','Quiropraxia',30,180,'P4');
  s('S23','Drenagem linfática',30,160,'P4'); s('S24','Liberação miofascial',30,190,'P4'); s('S25','Detox Power do Leon',30,185,'P4');
  s('S26','Pump Up',30,115,'P4'); s('S27','Limpeza de pele',30,150,'P4','sim');
  s('S28','Corte de cabelo feminino',30,45,'P5'); s('S29','Demais serviços (sob consulta)',30,0,'P5','nao','nao','sim');
  mk('Servicos', ['id','nome','duracao','valor','aPartir','adicional','sobConsulta','prof'], L, false);
  mk('Agendamentos', CAB_AG, [], true);
  mk('Bloqueios', ['data','prof','inicio','fim','motivo'], [], true); // data AAAA-MM-DD, prof P1..P5 ou TODOS, hora HH:mm
  mk('DatasEspeciais', ['data'], [['2026-11-07']], true);
  mk('Config', ['chave','valor'], [['vagas_manha',3],['vagas_tarde',5],['combo_valor',130],['senha_painel','TROQUE-ESTA-SENHA']], false);
  ui.alert('Pronto! Troque a senha_painel na aba Config e implante o Web App.');
}

// ---------- Regras de agenda ----------
function ehDataCombo(d) {
  if (dow(d) === 2 && +Utilities.formatDate(dt(d), TZ, 'd') <= 7) return true; // 1ª terça do mês
  return ler_('DatasEspeciais').some(r => normData_(r.data) === d);
}
function limites_() { // nunca mais que blocos/2 (capacidade real da escala)
  const c = cfg_(); return { manha: Math.min(+c.vagas_manha || 0, 3), tarde: Math.min(+c.vagas_tarde || 0, 5) };
}
function ordem_(t) { const o = COMBO.slice(); if (t === 'tarde') o.push(o.splice(3, 1)[0]); return o; }
function inicioCombo_(t, k, j) { return TURNOS[t].ini + 30 * ((k + j) % TURNOS[t].blocos); }
function vagasUsadas_(d, t) {
  const s = new Set();
  ler_('Agendamentos').forEach(r => { if (r.tipo === 'combo' && r.status !== 'cancelado' && normData_(r.data) === d && r.turno === t) s.add(Number(r.vaga)); });
  return Array.from(s);
}
function vagasCombo_(d) {
  const L = limites_(), r = {};
  ['manha', 'tarde'].forEach(t => r[t] = { limite: L[t], resta: Math.max(0, L[t] - vagasUsadas_(d, t).length) });
  return r;
}
function ocupacao_(d, prof) {
  const o = [[AI, AF]];
  ler_('Agendamentos').forEach(r => { if (normData_(r.data) === d && r.prof === prof && r.status !== 'cancelado') o.push([toMin(r.inicio), toMin(r.fim)]); });
  ler_('Bloqueios').forEach(r => { if (normData_(r.data) === d && (r.prof === 'TODOS' || r.prof === prof)) o.push([toMin(r.inicio), toMin(r.fim)]); });
  if (ehDataCombo(d)) { // reserva a escala do combo para não haver conflito
    const L = limites_();
    ['manha', 'tarde'].forEach(t => { for (let k = 0; k < L[t]; k++) ordem_(t).forEach((x, j) => {
      if (x.prof === prof) { const i = inicioCombo_(t, k, j); o.push([i, i + 30]); } }); });
  }
  return o;
}
function horarios(sid, d, minIni) {
  const sv = ler_('Servicos').find(x => x.id === sid);
  if (!sv || sv.sobConsulta === 'sim' || sv.adicional === 'sim' || !/^\d{4}-\d{2}-\d{2}$/.test(String(d)) || !diaUtil(d) || d < hojeStr()) return [];
  const oc = ocupacao_(d, sv.prof), dur = +sv.duracao, r = [];
  let ini = Math.max(ABRE, +minIni || 0);
  if (d === hojeStr()) ini = Math.max(ini, +Utilities.formatDate(new Date(), TZ, 'H') * 60 + +Utilities.formatDate(new Date(), TZ, 'm') + 30);
  for (let t = Math.ceil(ini / G) * G; t + dur <= FECHA; t += G)
    if (!oc.some(i => t < i[1] && t + dur > i[0])) r.push(toHM(t));
  return r;
}
function validarCliente_(p) {
  let w = String(p.whats || '').replace(/\D/g, '');
  const nome = String(p.nome || '').trim().replace(/^[=+\-@]+/, '').slice(0, 60); // evita fórmulas na planilha
  if (nome.length < 2) throw new Error('Informe seu nome.');
  if (!/^(55)?\d{10,11}$/.test(w)) throw new Error('WhatsApp inválido. Use DDD + número.');
  if (w.length <= 11) w = '55' + w; // grava sempre com o 55 do Brasil
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.data))) throw new Error('Data inválida.');
  return { w: w, nome: nome };
}
function evento_(titulo, d, ini, fim, desc) {
  return CalendarApp.getDefaultCalendar().createEvent(titulo,
    new Date(d + 'T' + toHM(ini) + ':00-03:00'), new Date(d + 'T' + toHM(fim) + ':00-03:00'), { description: desc }).getId();
}
function gravar_(l) { // l: objeto com as colunas CAB_AG. Grava como texto (exceto valor) para a planilha não converter horas.
  const sh = ss().getSheetByName('Agendamentos'), n = CAB_AG.length, lin = sh.getLastRow() + 1;
  if (lin > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 500);
  const vi = CAB_AG.indexOf('valor') + 1;
  sh.getRange(lin, 1, 1, n).setNumberFormat('@');
  sh.getRange(lin, vi).setNumberFormat('0.00');
  sh.getRange(lin, 1, 1, n).setValues([CAB_AG.map(c => c === 'valor' ? +(l[c] || 0) : (l[c] === undefined ? '' : String(l[c])))]);
  delete CACHE.Agendamentos;
}
const agora_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');

// ---------- Página da cliente ----------
function dadosIniciais() {
  const hoje = hojeStr(), datas = [];
  for (let i = 0; i < 150 && datas.length < 6; i++) { const d = addDias_(hoje, i); if (ehDataCombo(d)) datas.push({ data: d, vagas: vagasCombo_(d) }); }
  return { whats: WHATS, hoje: hoje, comboValor: +cfg_().combo_valor, datas: datas,
    profs: ler_('Profissionais'), servicos: ler_('Servicos') };
}
function agendar(p) { // serviços avulsos (um ou mais, em sequência)
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const c = validarCliente_(p);
    if (!diaUtil(p.data) || p.data < hojeStr()) throw new Error('Escolha uma data de terça a sábado.');
    if (!Array.isArray(p.itens) || !p.itens.length || p.itens.length > 8) throw new Error('Escolha de 1 a 8 serviços.');
    const S = ler_('Servicos'), P = ler_('Profissionais'), vid = 'V' + Date.now(), linhas = [];
    let fimAnt = 0;
    p.itens.forEach(it => {
      const sv = S.find(x => x.id === it.sid);
      if (!sv || sv.adicional === 'sim' || sv.sobConsulta === 'sim') throw new Error('Serviço inválido.');
      const ini = toMin(it.hora);
      if (ini < fimAnt) throw new Error('Os horários devem seguir a ordem, sem sobreposição.');
      if (horarios(sv.id, p.data, ini).indexOf(it.hora) < 0) throw new Error('O horário ' + it.hora + ' (' + sv.nome + ') acabou de ser ocupado. Escolha outro.');
      fimAnt = ini + +sv.duracao; linhas.push({ sv: sv, ini: ini, fim: fimAnt });
    });
    const adds = S.filter(x => x.adicional === 'sim' && (p.adds || []).indexOf(x.id) >= 0);
    if (adds.length && !linhas.some(l => l.sv.prof === 'P1')) throw new Error('Adicionais valem só com serviços de manicure/pedicure.');
    let total = 0;
    linhas.forEach((l, i) => {
      const pn = P.find(x => x.id === l.sv.prof).nome;
      let val = +l.sv.valor; if (i === 0) val += adds.reduce((a, x) => a + +x.valor, 0);
      total += val;
      const ev = evento_(l.sv.nome + ' - ' + c.nome + ' (' + pn + ')', p.data, l.ini, l.fim, 'WhatsApp: ' + c.w);
      gravar_({ id: vid + '-' + (i + 1), visita: vid, tipo: 'avulso', criadoEm: agora_(), cliente: c.nome, whats: c.w,
        servico: l.sv.nome, prof: l.sv.prof, profNome: pn, data: p.data, inicio: toHM(l.ini), fim: toHM(l.fim),
        valor: val, status: 'confirmado', evento: ev, obs: i === 0 && adds.length ? 'Adicionais: ' + adds.map(x => x.nome).join(', ') : '' });
    });
    return { vid: vid, total: total };
  } finally { lock.releaseLock(); }
}
function agendarCombo(p) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const c = validarCliente_(p), t = p.turno;
    if (!TURNOS[t] || !ehDataCombo(p.data) || p.data < hojeStr()) throw new Error('Data ou turno do combo indisponível.');
    if (['Buço', 'Axila'].indexOf(p.depil) < 0) throw new Error('Escolha a depilação (buço ou axila).');
    const L = limites_()[t], usadas = vagasUsadas_(p.data, t); let k = -1;
    for (let i = 0; i < L; i++) if (usadas.indexOf(i) < 0) { k = i; break; }
    if (k < 0) throw new Error('Vagas esgotadas neste turno.');
    const P = ler_('Profissionais'), vid = 'C' + Date.now(), valor = +cfg_().combo_valor, res = [];
    ordem_(t).forEach((x, j) => {
      const ini = inicioCombo_(t, k, j), nome = x.n === 'Depilação' ? 'Depilação (' + p.depil + ')' : x.n;
      const pn = P.find(y => y.id === x.prof).nome;
      const ev = evento_('COMBO: ' + nome + ' - ' + c.nome + ' (' + pn + ')', p.data, ini, ini + 30, 'WhatsApp: ' + c.w);
      gravar_({ id: vid + '-' + (j + 1), visita: vid, tipo: 'combo', criadoEm: agora_(), cliente: c.nome, whats: c.w, servico: nome,
        prof: x.prof, profNome: pn, data: p.data, inicio: toHM(ini), fim: toHM(ini + 30), valor: j === 0 ? valor : 0,
        status: 'confirmado', evento: ev, turno: t, vaga: k, obs: j === 5 ? 'Cortesia: coffee break' : '' });
      res.push({ hora: toHM(ini), servico: nome, prof: pn });
    });
    res.sort((a, b) => a.hora < b.hora ? -1 : 1);
    return { vid: vid, valor: valor, linhas: res };
  } finally { lock.releaseLock(); }
}

// ---------- Painel da dona (protegido por senha da aba Config) ----------
function chk_(pin) { if (String(pin) !== String(cfg_().senha_painel)) throw new Error('Senha incorreta.'); }
function adminAgenda(pin, d) {
  chk_(pin);
  return ler_('Agendamentos').filter(r => normData_(r.data) === d).sort((a, b) => a.inicio < b.inicio ? -1 : 1).map(r =>
    ({ id: String(r.id), hora: r.inicio + '–' + r.fim, cliente: r.cliente, whats: String(r.whats), servico: r.servico, prof: r.profNome, status: r.status, tipo: r.tipo, valor: r.valor }));
}
function adminStatus(pin, id, st) {
  chk_(pin);
  if (STATUS.indexOf(st) < 0) throw new Error('Status inválido.');
  const sh = ss().getSheetByName('Agendamentos'), v = sh.getDataRange().getValues(), h = v[0];
  const ci = h.indexOf('id'), si = h.indexOf('status'), ei = h.indexOf('evento'), vi = h.indexOf('visita'), ti = h.indexOf('tipo');
  const alvo = v.findIndex((r, i) => i > 0 && String(r[ci]) === String(id));
  if (alvo < 0) throw new Error('Agendamento não encontrado.');
  const visitaToda = st === 'cancelado' && v[alvo][ti] === 'combo'; // cancelar combo libera a vaga inteira
  for (let i = 1; i < v.length; i++) {
    if (i !== alvo && !(visitaToda && v[i][vi] === v[alvo][vi])) continue;
    sh.getRange(i + 1, si + 1).setValue(st);
    if (st === 'cancelado' && v[i][ei]) { try { CalendarApp.getDefaultCalendar().getEventById(v[i][ei]).deleteEvent(); } catch (e) {} }
  }
  return true;
}
function adminEscala(pin) { // mostra a escala do combo e a conta de capacidade
  chk_(pin); const L = limites_(), r = {};
  ['manha', 'tarde'].forEach(t => { r[t] = { vagas: L[t], clientes: [] };
    for (let k = 0; k < L[t]; k++) r[t].clientes.push(ordem_(t).map((x, j) => ({ hora: toHM(inicioCombo_(t, k, j)), n: x.n })).sort((a, b) => a.hora < b.hora ? -1 : 1)); });
  return r;
}
function doGet(e) {
  const adm = e && e.parameter && e.parameter.p === 'admin';
  return HtmlService.createHtmlOutputFromFile(adm ? 'Admin' : 'Index').setTitle('Polly Designer')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
