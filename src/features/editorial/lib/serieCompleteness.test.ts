import assert from 'node:assert/strict';
import { formatOpenItems, getSerieOpenItems } from './serieCompleteness.ts';

function testQuickSerieHasEverythingOpen() {
  const items = getSerieOpenItems({
    pilarIds: [],
    funcaoPadrao: null,
    frequenciaRecomendada: null,
    formatoVisualPadrao: null,
    energiaPadrao: null,
  });

  assert.deepEqual(
    items.map(item => item.key),
    ['pilar', 'funcao', 'frequencia', 'formato', 'energia'],
  );
  assert.equal(formatOpenItems(items), 'pilar, função, recorrência, formato e esforço');
}

function testCompleteSerieHasNothingOpen() {
  const items = getSerieOpenItems({
    pilarIds: ['pilar-1'],
    funcaoPadrao: 'aprofundar',
    frequenciaRecomendada: 'Semanal',
    formatoVisualPadrao: 'Reels',
    energiaPadrao: 'baixa',
  });
  assert.equal(items.length, 0);
}

function testBlankTextCountsAsOpen() {
  const items = getSerieOpenItems({
    pilarIds: ['pilar-1'],
    funcaoPadrao: 'atrair',
    frequenciaRecomendada: '  ',
    formatoVisualPadrao: '',
    energiaPadrao: 'alta',
  });
  assert.deepEqual(items.map(item => item.key), ['frequencia', 'formato']);
  assert.equal(formatOpenItems(items), 'recorrência e formato');
  assert.equal(formatOpenItems(items.slice(0, 1)), 'recorrência');
}

testQuickSerieHasEverythingOpen();
testCompleteSerieHasNothingOpen();
testBlankTextCountsAsOpen();

console.log('serieCompleteness tests passed');