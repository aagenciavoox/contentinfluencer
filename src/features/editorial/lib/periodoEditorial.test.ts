import assert from 'node:assert/strict';
import type { DecisaoPeriodo } from './editorialSettings.ts';
import {
  MODOS_DO_PERIODO,
  quinzenaDe,
  decisaoDoPeriodo,
  limiteDoIntervalo,
  lerPeriodoSalvo,
  limiteProporcional,
  semanaDe,
  trimestreDe,
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

function testSemanaDeSegundaADomingo() {
  // 14/10/2026 é quarta: segunda 12/10 a domingo 18/10.
  assert.deepEqual(semanaDe('2026-10-14'), { inicio: '2026-10-12', fim: '2026-10-18' });
  assert.deepEqual(semanaDe('2026-10-12'), { inicio: '2026-10-12', fim: '2026-10-18' });
  assert.deepEqual(semanaDe('2026-10-18'), { inicio: '2026-10-12', fim: '2026-10-18' });
  // 01/10/2026 é quinta: segunda 28/09 a domingo 04/10.
  assert.deepEqual(semanaDe('2026-10-01'), { inicio: '2026-09-28', fim: '2026-10-04' });
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
    inicio: '2026-10-12',
    fim: '2026-10-18',
  }), 14);
  assert.equal(limiteProporcional(14, 7), 14);
}

function testAjusteSubstituiOProporcional() {
  const ajuste = { inicio: '2026-09-28', fim: '2026-10-04', limite: 10 };
  assert.equal(limiteDoIntervalo({
    limiteSemanal: 14,
    inicio: '2026-10-01',
    fim: '2026-10-03',
    ajustesSemana: [ajuste],
  }), 10);

  assert.equal(limiteDoIntervalo({
    limiteSemanal: 14,
    inicio: '2026-10-12',
    fim: '2026-10-18',
    ajustesSemana: [{ inicio: '2026-10-12', fim: '2026-10-18', limite: 9 }],
  }), 9);

  // Ajuste que não é a semana segunda–domingo não entra.
  assert.equal(limiteDoIntervalo({
    limiteSemanal: 14,
    inicio: '2026-10-01',
    fim: '2026-10-03',
    ajustesSemana: [{ inicio: '2026-10-01', fim: '2026-10-03', limite: 10 }],
  }), 6);
}

function testMesSomaAsSemanasReais() {
  // Outubro/2026 (segunda–domingo): 4 dias + 3 semanas cheias + 6 dias.
  // round(14×4/7) + 14×3 + round(14×6/7) = 8 + 42 + 12 = 62.
  assert.equal(limiteDoIntervalo({
    limiteSemanal: 14,
    inicio: '2026-10-01',
    fim: '2026-10-31',
  }), 62);

  assert.equal(limiteDoIntervalo({
    limiteSemanal: 14,
    inicio: '2026-10-01',
    fim: '2026-10-31',
    ajustesSemana: [{ inicio: '2026-09-28', fim: '2026-10-04', limite: 10 }],
  }), 64);
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
    inicio: '2026-10-12',
    fim: '2026-10-18',
    ajustesSemana: [{ inicio: '2026-10-12', fim: '2026-10-18', limite: 9 }],
  }), 9);

  assert.equal(limiteDoIntervalo({
    limiteSemanal: null,
    inicio: '2026-10-01',
    fim: '2026-10-03',
    ajustesSemana: [{ inicio: '2026-09-28', fim: '2026-10-04', limite: 10 }],
  }), 10);
}

function testDecisaoNaoHerdaDoMes() {
  const periodos = [OUTUBRO, NOVEMBRO];
  assert.equal(decisaoDoPeriodo(periodos, '2026-10-01', '2026-10-31')?.prioridade, 'lançamento');
  assert.deepEqual(decisaoDoPeriodo(periodos, '2026-10-01', '2026-10-31')?.metas, { atrair: 8, converter: 2 });
  assert.equal(decisaoDoPeriodo(periodos, '2026-11-01', '2026-11-30')?.prioridade, 'comunidade');
  assert.equal(decisaoDoPeriodo(periodos, '2026-10-12', '2026-10-18'), null);
  assert.equal(decisaoDoPeriodo(periodos, '2026-10-01', '2026-11-30'), null);
}

function testPeriodoSalvoVoltaComoFoiConfirmado() {
  assert.deepEqual(
    lerPeriodoSalvo({ modo: 'mes', inicio: '2026-11-01', fim: '2026-11-30' }),
    { modo: 'mes', inicio: '2026-11-01', fim: '2026-11-30' },
  );
  assert.deepEqual(
    lerPeriodoSalvo({ modo: 'intervalo', inicio: '2026-10-05', fim: '2026-10-20' }),
    { modo: 'intervalo', inicio: '2026-10-05', fim: '2026-10-20' },
  );
  // Semana antiga com datas fora de segunda–domingo abre como personalizado, com as datas salvas.
  assert.deepEqual(
    lerPeriodoSalvo({ modo: 'semana', inicio: '2026-10-14', fim: '2026-10-14' }),
    { modo: 'intervalo', inicio: '2026-10-14', fim: '2026-10-14' },
  );
  assert.deepEqual(
    lerPeriodoSalvo({ modo: 'semana', inicio: '2026-10-11', fim: '2026-10-17' }),
    { modo: 'intervalo', inicio: '2026-10-11', fim: '2026-10-17' },
  );
  // Semana nova (segunda a domingo) volta como semana.
  assert.deepEqual(
    lerPeriodoSalvo({ modo: 'semana', inicio: '2026-10-12', fim: '2026-10-18' }),
    { modo: 'semana', inicio: '2026-10-12', fim: '2026-10-18' },
  );
  // Semana antiga que a migração passou para intervalo continua personalizada, mesmo de segunda a domingo.
  assert.deepEqual(
    lerPeriodoSalvo({ modo: 'intervalo', inicio: '2026-10-12', fim: '2026-10-18' }),
    { modo: 'intervalo', inicio: '2026-10-12', fim: '2026-10-18' },
  );
  // Quinzena é gravada como intervalo de 14 dias a partir da segunda e volta como quinzena.
  assert.deepEqual(
    lerPeriodoSalvo({ modo: 'intervalo', inicio: '2026-11-09', fim: '2026-11-22' }),
    { modo: 'quinzena', inicio: '2026-11-09', fim: '2026-11-22' },
  );
  assert.deepEqual(
    lerPeriodoSalvo({ modo: 'intervalo', inicio: '2026-11-10', fim: '2026-11-23' }),
    { modo: 'intervalo', inicio: '2026-11-10', fim: '2026-11-23' },
  );
  assert.deepEqual(
    lerPeriodoSalvo({ modo: 'mes', inicio: '2026-10-15', fim: '2026-10-15' }),
    { modo: 'mes', inicio: '2026-10-01', fim: '2026-10-31' },
  );
}

function testTrimestreDoCalendario() {
  assert.deepEqual(trimestreDe('2026-11-02'), { inicio: '2026-10-01', fim: '2026-12-31' });
  assert.deepEqual(trimestreDe('2026-01-01'), { inicio: '2026-01-01', fim: '2026-03-31' });
  assert.deepEqual(trimestreDe('2026-06-30'), { inicio: '2026-04-01', fim: '2026-06-30' });
}

/** O banco grava o trimestre como intervalo; na leitura ele volta a ser trimestre. */
function testTrimestreSalvoComoIntervaloVoltaComoTrimestre() {
  assert.deepEqual(
    lerPeriodoSalvo({ modo: 'intervalo', inicio: '2026-10-01', fim: '2026-12-31' }),
    { modo: 'trimestre', inicio: '2026-10-01', fim: '2026-12-31' },
  );
  assert.deepEqual(
    lerPeriodoSalvo({ modo: 'trimestre', inicio: '2026-11-15', fim: '2026-11-15' }),
    { modo: 'trimestre', inicio: '2026-10-01', fim: '2026-12-31' },
  );
  // Intervalo que não fecha um trimestre continua personalizado.
  assert.deepEqual(
    lerPeriodoSalvo({ modo: 'intervalo', inicio: '2026-10-01', fim: '2026-11-30' }),
    { modo: 'intervalo', inicio: '2026-10-01', fim: '2026-11-30' },
  );
}

function testPeriodoSalvoQuebradoNaoVale() {
  assert.equal(lerPeriodoSalvo(undefined), null);
  assert.equal(lerPeriodoSalvo('semana'), null);
  assert.equal(lerPeriodoSalvo({ modo: 'ano', inicio: '2026-01-01', fim: '2026-12-31' }), null);
  assert.equal(lerPeriodoSalvo({ modo: 'intervalo', inicio: '2026-10-20', fim: '2026-10-05' }), null);
  assert.equal(lerPeriodoSalvo({ modo: 'intervalo', inicio: '2026-02-30', fim: '2026-03-05' }), null);
}

function testSeletorOfereceSemanaEQuinzena() {
  assert.deepEqual(MODOS_DO_PERIODO.map(modo => modo.rotulo), ['Semana', 'Quinzena', 'Mês', 'Trimestre', 'Personalizado']);
  // Quinzena começa na segunda da semana da data, qualquer que seja o dia.
  assert.deepEqual(quinzenaDe('2026-11-11'), { inicio: '2026-11-09', fim: '2026-11-22' });
  assert.deepEqual(quinzenaDe('2026-11-15'), { inicio: '2026-11-09', fim: '2026-11-22' });
  assert.deepEqual(quinzenaDe('2026-11-09'), { inicio: '2026-11-09', fim: '2026-11-22' });
  assert.equal(new Date(`${quinzenaDe('2026-12-31').inicio}T12:00:00`).getDay(), 1);
  assert.equal(new Date(`${semanaDe('2026-12-31').inicio}T12:00:00`).getDay(), 1);
}

testSeletorOfereceSemanaEQuinzena();
testSemanaDeSegundaADomingo();
testPeriodoSalvoVoltaComoFoiConfirmado();
testPeriodoSalvoQuebradoNaoVale();
testTrimestreDoCalendario();
testTrimestreSalvoComoIntervaloVoltaComoTrimestre();
testProporcionalDeTresDias();
testSemanaCheiaIgualAoLimite();
testAjusteSubstituiOProporcional();
testMesSomaAsSemanasReais();
testCicloDeQuatroSemanas();
testSemLimiteNaoViraZero();
testDecisaoNaoHerdaDoMes();

console.log('periodoEditorial tests passed');
