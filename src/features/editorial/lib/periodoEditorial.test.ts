import assert from 'node:assert/strict';
import type { DecisaoPeriodo } from './editorialSettings.ts';
import {
  decisaoDoPeriodo,
  limiteDoIntervalo,
  limiteProporcional,
  semanaDe,
} from './periodoEditorial.ts';

const OUTUBRO: DecisaoPeriodo = {
  inicio: '2026-10-01',
  fim: '2026-10-31',
  prioridade: 'lançamento',
  metas: { atrair: 8, converter: 2 },
  ajustesSemana: [],
};

const NOVEMBRO: DecisaoPeriodo = {
  inicio: '2026-11-01',
  fim: '2026-11-30',
  prioridade: 'comunidade',
  metas: { comunidade: 4 },
  ajustesSemana: [],
};

function testSemanaDeDomingoASabado() {
  assert.deepEqual(semanaDe('2026-10-14'), { inicio: '2026-10-11', fim: '2026-10-17' });
  assert.deepEqual(semanaDe('2026-10-11'), { inicio: '2026-10-11', fim: '2026-10-17' });
  assert.deepEqual(semanaDe('2026-10-17'), { inicio: '2026-10-11', fim: '2026-10-17' });
  assert.deepEqual(semanaDe('2026-10-01'), { inicio: '2026-09-27', fim: '2026-10-03' });
}

function testProporcionalDeTresDias() {
  assert.equal(limiteProporcional(14, 3), 6);
  assert.equal(limiteDoIntervalo({
    limiteSemanal: 14,
    inicio: '2026-10-01',
    fim: '2026-10-03',
  }), 6);
}

function testSemanaCheiaIgualAoLimite() {
  assert.equal(limiteDoIntervalo({
    limiteSemanal: 14,
    inicio: '2026-10-11',
    fim: '2026-10-17',
  }), 14);
  assert.equal(limiteProporcional(14, 7), 14);
}

function testAjusteSubstituiOProporcional() {
  const ajuste = { inicio: '2026-09-27', fim: '2026-10-03', limite: 10 };
  assert.equal(limiteDoIntervalo({
    limiteSemanal: 14,
    inicio: '2026-10-01',
    fim: '2026-10-03',
    ajustesSemana: [ajuste],
  }), 10);

  assert.equal(limiteDoIntervalo({
    limiteSemanal: 14,
    inicio: '2026-10-11',
    fim: '2026-10-17',
    ajustesSemana: [{ inicio: '2026-10-11', fim: '2026-10-17', limite: 9 }],
  }), 9);

  // Ajuste que não é a semana domingo–sábado não entra.
  assert.equal(limiteDoIntervalo({
    limiteSemanal: 14,
    inicio: '2026-10-01',
    fim: '2026-10-03',
    ajustesSemana: [{ inicio: '2026-10-01', fim: '2026-10-03', limite: 10 }],
  }), 6);
}

function testMesSomaAsSemanasReais() {
  // Outubro/2026: 3 dias + quatro semanas cheias. 6 + 14 × 4.
  assert.equal(limiteDoIntervalo({
    limiteSemanal: 14,
    inicio: '2026-10-01',
    fim: '2026-10-31',
  }), 62);

  assert.equal(limiteDoIntervalo({
    limiteSemanal: 14,
    inicio: '2026-10-01',
    fim: '2026-10-31',
    ajustesSemana: [{ inicio: '2026-09-27', fim: '2026-10-03', limite: 10 }],
  }), 66);
}

function testCicloDeQuatroSemanas() {
  assert.equal(limiteDoIntervalo({
    limiteSemanal: 14,
    inicio: '2026-10-04',
    fim: '2026-10-31',
  }), 56);
}

function testSemLimiteNaoViraZero() {
  assert.equal(limiteDoIntervalo({
    limiteSemanal: null,
    inicio: '2026-10-01',
    fim: '2026-10-03',
  }), null);

  assert.equal(limiteDoIntervalo({
    limiteSemanal: null,
    inicio: '2026-10-01',
    fim: '2026-10-31',
    ajustesSemana: [{ inicio: '2026-10-04', fim: '2026-10-10', limite: 8 }],
  }), null);

  assert.equal(limiteDoIntervalo({
    limiteSemanal: null,
    inicio: '2026-10-11',
    fim: '2026-10-17',
    ajustesSemana: [{ inicio: '2026-10-11', fim: '2026-10-17', limite: 9 }],
  }), 9);

  assert.equal(limiteDoIntervalo({
    limiteSemanal: null,
    inicio: '2026-10-01',
    fim: '2026-10-03',
    ajustesSemana: [{ inicio: '2026-09-27', fim: '2026-10-03', limite: 10 }],
  }), 10);
}

function testDecisaoNaoHerdaDoMes() {
  const periodos = [OUTUBRO, NOVEMBRO];
  assert.equal(decisaoDoPeriodo(periodos, '2026-10-01', '2026-10-31')?.prioridade, 'lançamento');
  assert.deepEqual(decisaoDoPeriodo(periodos, '2026-10-01', '2026-10-31')?.metas, { atrair: 8, converter: 2 });
  assert.equal(decisaoDoPeriodo(periodos, '2026-11-01', '2026-11-30')?.prioridade, 'comunidade');
  assert.equal(decisaoDoPeriodo(periodos, '2026-10-11', '2026-10-17'), null);
  assert.equal(decisaoDoPeriodo(periodos, '2026-10-01', '2026-11-30'), null);
}

testSemanaDeDomingoASabado();
testProporcionalDeTresDias();
testSemanaCheiaIgualAoLimite();
testAjusteSubstituiOProporcional();
testMesSomaAsSemanasReais();
testCicloDeQuatroSemanas();
testSemLimiteNaoViraZero();
testDecisaoNaoHerdaDoMes();

console.log('periodoEditorial tests passed');
