import assert from 'node:assert/strict';
import { comFrequencia, frequenciaDoRascunho, rascunhoDaFrequencia, textoDoChip } from './frequenciaChip.ts';

// Texto do chip.
assert.equal(textoDoChip({ frequenciaVezes: 2, frequenciaUnidade: 'semana' }), '2 por semana');
assert.equal(textoDoChip({}), 'Sem meta definida');
assert.equal(textoDoChip({ frequenciaRecomendada: 'Sob demanda' }), 'Sob demanda');

// Ida e volta: o rascunho lê a série e grava nos mesmos campos.
{
  const serie = { id: 's', name: 'Diário', frequenciaVezes: 3, frequenciaUnidade: 'mes', frequenciaAPartirDe: '2026-11-01', frequenciaRecomendada: '3 por mês' };
  const rascunho = rascunhoDaFrequencia(serie);
  assert.deepEqual(rascunho, { vezes: '3', unidade: 'mes', aPartirDe: '2026-11-01' });
  const gravada = frequenciaDoRascunho({ ...rascunho, vezes: '1', unidade: 'semana' }, 'serie');
  assert.ok(!('erro' in gravada));
  const nova = comFrequencia(serie, gravada);
  assert.equal(nova.name, 'Diário');
  assert.deepEqual([nova.frequenciaVezes, nova.frequenciaUnidade, nova.frequenciaRecomendada], [1, 'semana', 'Semanal']);
}

// Quinzena sem início não grava; quantidade vazia tira a meta (quadro fica sob demanda).
assert.ok('erro' in frequenciaDoRascunho({ vezes: '1', unidade: 'quinzena', aPartirDe: '' }, 'serie'));
{
  const sem = frequenciaDoRascunho({ vezes: '', unidade: 'semana', aPartirDe: '' }, 'quadro');
  assert.ok(!('erro' in sem));
  assert.deepEqual(sem, { vezes: null, unidade: null, aPartirDe: null, recomendada: 'Sob demanda' });
}

console.log('frequenciaChip: ok');
