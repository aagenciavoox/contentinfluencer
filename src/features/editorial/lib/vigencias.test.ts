import assert from 'node:assert/strict';
import { atualizarPreferencias, atualizarProporcao, DEFAULT_EDITORIAL_SETTINGS, type EditorialSettings } from './editorialSettings.ts';
import { contarPeriodo } from './gradeCounts.ts';
import { limiteDoIntervalo } from './periodoEditorial.ts';
import { limiteSemanalNaSemana, proporcaoDoIntervalo, registrarVigencia, vigenciaNaSemana } from './vigencias.ts';

// Sexta, 30/10/2026. A semana começa no domingo 25/10.
const HOJE = new Date(2026, 9, 30, 12);

function comLimite(limite: number, vigencias: EditorialSettings['vigencias'] = []): EditorialSettings {
  return { ...atualizarPreferencias({ ...DEFAULT_EDITORIAL_SETTINGS, vigencias }, { limiteSemanal: limite }), vigencias };
}

function testRegistraAPartirDoDomingo() {
  const settings = registrarVigencia(comLimite(14), HOJE);
  assert.deepEqual(settings.vigencias, [{ vigenteDesde: '2026-10-25', limiteSemanal: 14, proporcaoFuncoes: null }]);
}

function testSemMudancaNaoCriaLinha() {
  const antes = comLimite(14, [{ vigenteDesde: '2000-01-02', limiteSemanal: 14, proporcaoFuncoes: null }]);
  assert.equal(registrarVigencia(antes, HOJE), antes);
}

function testMudancaPreservaOPassado() {
  const antes = comLimite(10, [{ vigenteDesde: '2000-01-02', limiteSemanal: 14, proporcaoFuncoes: null }]);
  const depois = registrarVigencia(antes, HOJE);
  assert.equal(depois.vigencias?.length, 2);
  assert.equal(limiteSemanalNaSemana({ limiteSemanal: 10, vigencias: depois.vigencias }, '2026-10-18'), 14);
  assert.equal(limiteSemanalNaSemana({ limiteSemanal: 10, vigencias: depois.vigencias }, '2026-10-25'), 10);
  assert.equal(limiteSemanalNaSemana({ limiteSemanal: 10, vigencias: depois.vigencias }, '2026-11-01'), 10);
}

function testMudarDuasVezesNaSemanaSubstitui() {
  const primeira = registrarVigencia(comLimite(10, [{ vigenteDesde: '2000-01-02', limiteSemanal: 14, proporcaoFuncoes: null }]), HOJE);
  const segunda = registrarVigencia({ ...comLimite(12, primeira.vigencias) }, HOJE);
  assert.deepEqual(segunda.vigencias?.map(item => [item.vigenteDesde, item.limiteSemanal]), [
    ['2000-01-02', 14],
    ['2026-10-25', 12],
  ]);
}

function testAntesDaPrimeiraLinhaValeAPrimeira() {
  const vigencias = [{ vigenteDesde: '2026-10-25', limiteSemanal: 10, proporcaoFuncoes: null }];
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
    periodo: { inicio: '2026-10-18', fim: '2026-10-24' },
  });
  assert.equal(contagem.limite, 14);
}

function testProporcaoPesaPeloLimite() {
  const antiga = { atrair: 100 };
  const nova = { atrair: 0, aprofundar: 100 };
  const vigencias = [
    { vigenteDesde: '2000-01-02', limiteSemanal: 10, proporcaoFuncoes: antiga },
    { vigenteDesde: '2026-10-25', limiteSemanal: 10, proporcaoFuncoes: nova },
  ];
  const proporcao = proporcaoDoIntervalo({
    semanas: [{ inicio: '2026-10-18', limite: 10 }, { inicio: '2026-10-25', limite: 10 }],
    proporcaoAtual: nova,
    vigencias,
  });
  assert.deepEqual(proporcao, { atrair: 50, aprofundar: 50 });
  const umaSo = proporcaoDoIntervalo({ semanas: [{ inicio: '2026-10-18', limite: 10 }], proporcaoAtual: nova, vigencias });
  assert.equal(umaSo, antiga);
}

function testProporcaoTambemRegistra() {
  const base = comLimite(14, [{ vigenteDesde: '2000-01-02', limiteSemanal: 14, proporcaoFuncoes: null }]);
  const depois = registrarVigencia(atualizarProporcao(base, { atrair: 60, aprofundar: 40 }), HOJE);
  assert.deepEqual(depois.vigencias?.at(-1), {
    vigenteDesde: '2026-10-25',
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
