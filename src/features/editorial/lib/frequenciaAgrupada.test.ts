import assert from 'node:assert/strict';
import { contarSerieAgrupada, textoDaContagemSerie } from './frequenciaAgrupada.ts';

const series = [
  {
    id: 'familia',
    name: 'Descomplicando',
    parentId: null,
    frequenciaRecomendada: 'Semanal',
    frequenciaVezes: 3,
    frequenciaUnidade: 'semana',
    frequenciaAPartirDe: null,
  },
  {
    id: 'branbran',
    name: 'Branbran',
    parentId: 'familia',
    frequenciaRecomendada: 'Sob demanda',
    frequenciaVezes: null,
    frequenciaUnidade: null,
    frequenciaAPartirDe: null,
  },
  {
    id: 'comece',
    name: 'Por onde começo?',
    parentId: 'branbran',
    frequenciaRecomendada: 'Sob demanda',
    frequenciaVezes: null,
    frequenciaUnidade: null,
    frequenciaAPartirDe: null,
  },
  {
    id: 'tolkien',
    name: 'Tolkien',
    parentId: 'familia',
    frequenciaRecomendada: 'Semanal',
    frequenciaVezes: 1,
    frequenciaUnidade: 'semana',
    frequenciaAPartirDe: null,
  },
];

const semana = { inicio: '2026-10-26', fim: '2026-11-01' };

const itens = [
  { serieId: 'comece', espacoId: 'c1:original', contentId: 'c1' },
  { serieId: 'comece', espacoId: 'c2:original', contentId: 'c2' },
  { serieId: 'branbran', espacoId: 'c3:original', contentId: 'c3' },
  { serieId: 'tolkien', espacoId: 'c4:original', contentId: 'c4' },
  // Mesmo espaço visto no pai e no filho conta uma vez.
  { serieId: 'comece', espacoId: 'c1:original', contentId: 'c1' },
];

const familia = contarSerieAgrupada({
  serie: series[0],
  series,
  itens,
  ...semana,
});

assert.equal(familia.expectativa, 3);
assert.equal(familia.diretos, 0);
assert.equal(familia.filhos.length, 2);
const branbran = familia.filhos.find(f => f.serieId === 'branbran');
const tolkien = familia.filhos.find(f => f.serieId === 'tolkien');
assert.equal(branbran?.quantidade, 3); // 2 comece + 1 branbran
assert.equal(tolkien?.quantidade, 1);
assert.equal(familia.total, 4);
assert.equal(familia.somaRecortesFilhos, 1); // só Tolkien tem número
assert.equal(familia.recorteIncompativel, true);

const texto = textoDaContagemSerie(familia);
assert.equal(texto, '4 de 3');

// Neto não entra de novo na soma do pai além da contribuição do filho.
const branbranConta = contarSerieAgrupada({
  serie: series[1],
  series,
  itens,
  ...semana,
});
assert.equal(branbranConta.expectativa, null);
assert.equal(branbranConta.diretos, 1);
assert.equal(branbranConta.filhos[0]?.quantidade, 2);
assert.equal(branbranConta.total, 3);

console.log('ok - frequenciaAgrupada');
