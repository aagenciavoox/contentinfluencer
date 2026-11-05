import assert from 'node:assert/strict';
import { periodoDaSemana, rotuloDoPeriodo } from './periodoPlanejamento.ts';
import { INICIO_DA_SEMANA } from '../../../lib/semana.ts';

function testSemanaComecaNaSegunda() {
  assert.equal(INICIO_DA_SEMANA, 1);
  // 04/11/2026 é quarta: a semana vai de segunda 02/11 a domingo 08/11.
  assert.deepEqual(periodoDaSemana(new Date(2026, 10, 4)), { inicio: '2026-11-02', fim: '2026-11-08' });
}

function testRotuloDoPeriodo() {
  assert.equal(rotuloDoPeriodo({ inicio: '2026-11-02', fim: '2026-11-08' }, 'semana'), 'na semana de 02/11 a 08/11');
  assert.equal(rotuloDoPeriodo({ inicio: '2026-11-01', fim: '2026-11-30' }, 'mes'), 'em novembro de 2026');
  assert.equal(rotuloDoPeriodo({ inicio: '', fim: '' }, 'mes'), 'no período');
}

testSemanaComecaNaSegunda();
testRotuloDoPeriodo();
console.log('periodoPlanejamento.test.ts ok');
