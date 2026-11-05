import assert from 'node:assert/strict';
import { frequenciaParaGravar } from './metaDaOnda.ts';

const vazia = frequenciaParaGravar({ vezes: null, unidade: 'semana', aPartirDe: '2026-11-01', tipo: 'serie' });
assert.ok(!('erro' in vazia));
if (!('erro' in vazia)) {
  assert.equal(vazia.vezes, null);
  assert.equal(vazia.recomendada, null);
}

const quadro = frequenciaParaGravar({ vezes: null, unidade: 'semana', aPartirDe: null, tipo: 'quadro' });
assert.ok(!('erro' in quadro) && quadro.recomendada === 'Sob demanda');

const quinzena = frequenciaParaGravar({ vezes: 1, unidade: 'quinzena', aPartirDe: null, tipo: 'temporada' });
assert.ok('erro' in quinzena);

const ok = frequenciaParaGravar({ vezes: 2, unidade: 'semana', aPartirDe: '2026-11-04', tipo: 'serie' });
assert.ok(!('erro' in ok));
if (!('erro' in ok)) {
  assert.equal(ok.vezes, 2);
  assert.equal(ok.unidade, 'semana');
  assert.equal(ok.aPartirDe, '2026-11-04');
  assert.equal(ok.recomendada, '2 por semana');
}

console.log('metaDaOnda: ok');
