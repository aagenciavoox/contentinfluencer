import assert from 'node:assert/strict';
import { atualizarPreferencias, atualizarProporcao, DEFAULT_EDITORIAL_SETTINGS, type EditorialSettings } from './editorialSettings.ts';
import { contarPeriodo } from './gradeCounts.ts';
import { limiteDoIntervalo } from './periodoEditorial.ts';
import {
  agendarVigencia,
  desfazerMudanca,
  diretrizNoInicio,
  alinharComVigenciaAgendada,
  iniciosParaVigencia,
  limiteDaSemanaNoPeriodo,
  limiteSemanalDoPeriodo,
  limiteSemanalNaSemana,
  metaComAjuste,
  mudancasAgendadas,
  periodoVigente,
  proporcaoDoIntervalo,
  proximaMudanca,
  registrarVigencia,
  vigenciaNaSemana,
} from './vigencias.ts';

// Sexta, 30/10/2026. A semana começa na segunda 26/10.
const HOJE = new Date(2026, 9, 30, 12);

function comLimite(limite: number, vigencias: EditorialSettings['vigencias'] = []): EditorialSettings {
  return { ...atualizarPreferencias({ ...DEFAULT_EDITORIAL_SETTINGS, vigencias }, { limiteSemanal: limite }), vigencias };
}

function testRegistraAPartirDoDomingo() {
  const settings = registrarVigencia(comLimite(14), HOJE);
  assert.deepEqual(settings.vigencias, [{ vigenteDesde: '2026-10-26', limiteSemanal: 14, proporcaoFuncoes: null }]);
}

function testSemMudancaNaoCriaLinha() {
  const antes = comLimite(14, [{ vigenteDesde: '2000-01-02', limiteSemanal: 14, proporcaoFuncoes: null }]);
  assert.equal(registrarVigencia(antes, HOJE), antes);
}

function testMudancaPreservaOPassado() {
  const antes = comLimite(10, [{ vigenteDesde: '2000-01-02', limiteSemanal: 14, proporcaoFuncoes: null }]);
  const depois = registrarVigencia(antes, HOJE);
  assert.equal(depois.vigencias?.length, 2);
  assert.equal(limiteSemanalNaSemana({ limiteSemanal: 10, vigencias: depois.vigencias }, '2026-10-19'), 14);
  assert.equal(limiteSemanalNaSemana({ limiteSemanal: 10, vigencias: depois.vigencias }, '2026-10-26'), 10);
  assert.equal(limiteSemanalNaSemana({ limiteSemanal: 10, vigencias: depois.vigencias }, '2026-11-02'), 10);
}

function testMudarDuasVezesNaSemanaSubstitui() {
  const primeira = registrarVigencia(comLimite(10, [{ vigenteDesde: '2000-01-02', limiteSemanal: 14, proporcaoFuncoes: null }]), HOJE);
  const segunda = registrarVigencia({ ...comLimite(12, primeira.vigencias) }, HOJE);
  assert.deepEqual(segunda.vigencias?.map(item => [item.vigenteDesde, item.limiteSemanal]), [
    ['2000-01-02', 14],
    ['2026-10-26', 12],
  ]);
}

function testAntesDaPrimeiraLinhaValeAPrimeira() {
  const vigencias = [{ vigenteDesde: '2026-10-26', limiteSemanal: 10, proporcaoFuncoes: null }];
  assert.equal(vigenciaNaSemana(vigencias, '2026-01-04')?.limiteSemanal, 10);
  assert.equal(vigenciaNaSemana([], '2026-01-04'), null);
}

function testOutubroUsaOLimiteDeOutubro() {
  // Outubro de 2026: 3 dias na semana de 27/09 e 4 semanas inteiras.
  const vigencias = [
    { vigenteDesde: '2000-01-02', limiteSemanal: 14, proporcaoFuncoes: null },
    { vigenteDesde: '2026-11-01', limiteSemanal: 7, proporcaoFuncoes: null },
  ];
  const semVigencia = limiteDoIntervalo({ limiteSemanal: 7, inicio: '2026-10-01', fim: '2026-10-31' });
  const comVigencia = limiteDoIntervalo({
    limiteSemanal: 7,
    inicio: '2026-10-01',
    fim: '2026-10-31',
    limiteDaSemana: inicio => limiteSemanalNaSemana({ limiteSemanal: 7, vigencias }, inicio),
  });
  assert.equal(semVigencia, 31);
  assert.equal(comVigencia, 62);
}

function testContagemUsaAVigencia() {
  const vigencias = [
    { vigenteDesde: '2000-01-02', limiteSemanal: 14, proporcaoFuncoes: null },
    { vigenteDesde: '2026-11-01', limiteSemanal: 7, proporcaoFuncoes: null },
  ];
  const contagem = contarPeriodo({
    entries: [],
    pilares: [],
    settings: { preferencias: { ...DEFAULT_EDITORIAL_SETTINGS.preferencias, limiteSemanal: 7 }, vigencias },
    periodo: { inicio: '2026-10-19', fim: '2026-10-25' },
  });
  assert.equal(contagem.limite, 14);
}

function testProporcaoPesaPeloLimite() {
  const antiga = { atrair: 100 };
  const nova = { atrair: 0, aprofundar: 100 };
  const vigencias = [
    { vigenteDesde: '2000-01-02', limiteSemanal: 10, proporcaoFuncoes: antiga },
    { vigenteDesde: '2026-10-26', limiteSemanal: 10, proporcaoFuncoes: nova },
  ];
  const proporcao = proporcaoDoIntervalo({
    semanas: [{ inicio: '2026-10-19', limite: 10 }, { inicio: '2026-10-26', limite: 10 }],
    proporcaoAtual: nova,
    vigencias,
  });
  assert.deepEqual(proporcao, { atrair: 50, aprofundar: 50 });
  const umaSo = proporcaoDoIntervalo({ semanas: [{ inicio: '2026-10-19', limite: 10 }], proporcaoAtual: nova, vigencias });
  assert.equal(umaSo, antiga);
}

function testProporcaoTambemRegistra() {
  const base = comLimite(14, [{ vigenteDesde: '2000-01-02', limiteSemanal: 14, proporcaoFuncoes: null }]);
  const depois = registrarVigencia(atualizarProporcao(base, { atrair: 60, aprofundar: 40 }), HOJE);
  assert.deepEqual(depois.vigencias?.at(-1), {
    vigenteDesde: '2026-10-26',
    limiteSemanal: 14,
    proporcaoFuncoes: { atrair: 60, aprofundar: 40 },
  });
}

const tests = [
  ['records from the Sunday of the change', testRegistraAPartirDoDomingo],
  ['no change records nothing', testSemMudancaNaoCriaLinha],
  ['a change keeps past weeks on the old limit', testMudancaPreservaOPassado],
  ['changing twice in a week replaces that week', testMudarDuasVezesNaSemanaSubstitui],
  ['before the first row the first row applies', testAntesDaPrimeiraLinhaValeAPrimeira],
  ['October keeps the October limit after a November change', testOutubroUsaOLimiteDeOutubro],
  ['period count uses the vigência', testContagemUsaAVigencia],
  ['proportion is weighted by each week limit', testProporcaoPesaPeloLimite],
  ['changing the proportion records a vigência', testProporcaoTambemRegistra],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}

// O período definido manda: vigente usa o ritmo atual; encerrado mantém o histórico; ajuste escrito vence.
{
  const ritmo = { limiteSemanal: 10, vigencias: [
    { vigenteDesde: '2000-01-02', limiteSemanal: 8, proporcaoFuncoes: null },
    { vigenteDesde: '2026-11-01', limiteSemanal: 10, proporcaoFuncoes: null },
  ] };
  const vigente = { inicio: '2026-10-16', fim: '2026-12-30' };
  assert.equal(periodoVigente(vigente, '2026-11-02'), true);
  assert.equal(limiteSemanalDoPeriodo(ritmo, vigente, '2026-11-02'), 10);
  assert.equal(limiteSemanalDoPeriodo(ritmo, { inicio: '2027-01-01', fim: '2027-01-31' }, '2026-11-02'), 10);
  assert.equal(limiteSemanalDoPeriodo(ritmo, { inicio: '2026-10-01', fim: '2026-10-31' }, '2026-11-02'), 8);
  assert.equal(metaComAjuste(25, 40), 25);
  assert.equal(metaComAjuste(undefined, 40), 40);
  assert.equal(metaComAjuste(null, null), null);
  // Contagem do Planejamento segue a mesma regra.
  const base = { ...DEFAULT_EDITORIAL_SETTINGS, preferencias: { ...DEFAULT_EDITORIAL_SETTINGS.preferencias, limiteSemanal: 10 }, vigencias: ritmo.vigencias };
  const periodo = { inicio: '2026-11-01', fim: '2026-11-14' };
  const cv = contarPeriodo({ entries: [], pilares: [], settings: base as never, periodo: periodo as never, hoje: '2026-11-02' });
  const cp = contarPeriodo({ entries: [], pilares: [], settings: { ...base, vigencias: [ritmo.vigencias[0], { vigenteDesde: '2026-11-08', limiteSemanal: 4, proporcaoFuncoes: null }] } as never, periodo: periodo as never, hoje: '2026-12-01' });
  assert.equal(cv.limite, 20);
  assert.equal(cp.limite, 13); // segunda–domingo: 8 dias a 8/7 + 6 dias a 4/7 = 13
  console.log('vigencias (período vigente): ok');
}

// --- Mudança com data escolhida: desta semana vale já; de uma segunda futura fica agendada.
{
  const hoje = '2026-11-03';
  const base = { ...comLimite(10, [{ vigenteDesde: '2000-01-02', limiteSemanal: 10, proporcaoFuncoes: null }]) };
  const { estaSemana, proxima } = iniciosParaVigencia(hoje);
  assert.deepEqual([estaSemana, proxima], ['2026-11-02', '2026-11-09']);

  const agora = agendarVigencia(base, estaSemana, { limiteSemanal: 14, proporcaoFuncoes: null }, hoje);
  assert.equal(agora.preferencias.limiteSemanal, 14, 'desta semana: vale já');

  const agendada = agendarVigencia(base, proxima, { limiteSemanal: 14, proporcaoFuncoes: null }, hoje);
  assert.equal(agendada.preferencias.limiteSemanal, 10, 'agendada: o ritmo de hoje continua');
  assert.equal(proximaMudanca(agendada.vigencias, hoje)?.vigenteDesde, '2026-11-09');
  // Nunca volta para uma segunda passada.
  assert.equal(agendarVigencia(base, '2026-10-19', { limiteSemanal: 14, proporcaoFuncoes: null }, hoje).vigencias?.at(-1)?.vigenteDesde, '2026-11-02');

  // Período vigente: esta semana pelo ritmo de hoje; as semanas a partir de 09/11 pelo agendado.
  const settings = { limiteSemanal: 10, vigencias: agendada.vigencias };
  assert.equal(limiteDaSemanaNoPeriodo(settings, { fim: '2026-11-30' }, '2026-11-02', hoje), 10);
  assert.equal(limiteDaSemanaNoPeriodo(settings, { fim: '2026-11-30' }, '2026-11-16', hoje), 14);
  // O registro automático não desfaz o agendamento.
  assert.equal(registrarVigencia(agendada, new Date(2026, 10, 3, 12)), agendada);

  // Ao carregar depois da segunda agendada, o ritmo de hoje passa a ser o agendado.
  const depois = alinharComVigenciaAgendada(agendada, '2026-11-03T12:00:00Z', '2026-11-10');
  assert.equal(depois.preferencias.limiteSemanal, 14);
  // Mudança gravada para a semana em curso já estava em dia: nada muda.
  assert.equal(alinharComVigenciaAgendada(agora, '2026-11-03T12:00:00Z', '2026-11-04'), agora);
}

console.log('vigencias agendadas: ok');

// --- Desfazer só uma parte da mudança agendada.
{
  const hoje = '2026-11-03';
  const p1 = { atrair: 50, converter: 50 };
  const p2 = { atrair: 30, converter: 70 };
  const base = { ...comLimite(10, [{ vigenteDesde: '2000-01-02', limiteSemanal: 10, proporcaoFuncoes: p1 }]), proporcaoFuncoes: p1 };
  const agendada = agendarVigencia(base, '2026-11-09', { limiteSemanal: 14, proporcaoFuncoes: p2 }, hoje);
  assert.deepEqual(diretrizNoInicio(agendada, '2026-11-16', hoje), { limiteSemanal: 14, proporcaoFuncoes: p2 });
  assert.deepEqual(diretrizNoInicio(agendada, '2026-11-02', hoje), { limiteSemanal: 10, proporcaoFuncoes: p1 });
  const semLimite = desfazerMudanca(agendada, '2026-11-09', 'limite', hoje);
  assert.deepEqual(semLimite.vigencias?.at(-1), { vigenteDesde: '2026-11-09', limiteSemanal: 10, proporcaoFuncoes: p2 });
  assert.deepEqual(mudancasAgendadas(agendada, hoje), [{ vigenteDesde: '2026-11-09', limite: { de: 10, para: 14 }, proporcao: { de: p1, para: p2 } }]);
  assert.deepEqual(mudancasAgendadas(semLimite, hoje).map(item => item.limite), [null]);
  const nada = desfazerMudanca(semLimite, '2026-11-09', 'proporcao', hoje);
  assert.deepEqual(mudancasAgendadas(nada, hoje), []);
  assert.equal(nada.vigencias?.some(item => item.vigenteDesde === '2026-11-09'), false, 'sem diferença, a linha sai');
}

console.log('vigencias (desfazer): ok');
