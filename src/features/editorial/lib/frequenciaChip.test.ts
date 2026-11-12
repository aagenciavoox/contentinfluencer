import assert from 'node:assert/strict';
import { cliqueDentroDoPainel, comFrequencia, frequenciaDoRascunho, rascunhoDaFrequencia, textoDoChip } from './frequenciaChip.ts';

// Texto do chip.
// Regra de Ouro: série gravada com 2 por semana mostra o que vale (1 por semana).
assert.equal(textoDoChip({ frequenciaVezes: 2, frequenciaUnidade: 'semana' }), '1 por semana');
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

// Quinzena sem início grava (a âncora vem da ativação); quantidade vazia tira a meta (quadro fica sob demanda).
assert.ok(!('erro' in frequenciaDoRascunho({ vezes: '1', unidade: 'quinzena', aPartirDe: '' }, 'serie')));
{
  const sem = frequenciaDoRascunho({ vezes: '', unidade: 'semana', aPartirDe: '' }, 'quadro');
  assert.ok(!('erro' in sem));
  assert.deepEqual(sem, { vezes: null, unidade: null, aPartirDe: null, recomendada: 'Sob demanda' });
}

// Clique na lista do seletor de período (portal fora do painel) não fecha o popover.
{
  const dentro = { closest: () => null };
  const opcao = { closest: (s: string) => (s === '[role="listbox"]' ? { id: 'periodo-listbox' } : null) };
  const outraLista = { closest: () => ({ id: 'outra-listbox' }) };
  const fora = { closest: () => null };
  const painel = {
    contains: (no: unknown) => no === dentro,
    querySelector: (s: string) => (s === '[aria-controls="periodo-listbox"]' ? {} : null),
  };
  assert.equal(cliqueDentroDoPainel(dentro, painel), true);
  assert.equal(cliqueDentroDoPainel(opcao, painel), true);
  assert.equal(cliqueDentroDoPainel(outraLista, painel), false);
  assert.equal(cliqueDentroDoPainel(fora, painel), false);
  assert.equal(cliqueDentroDoPainel(opcao, null), false);
}

console.log('frequenciaChip: ok');

// Regra de Ouro no chip: família com 2 séries ativas vale até 2; quadro é sempre sob demanda.
assert.equal(textoDoChip({ frequenciaVezes: 3, frequenciaUnidade: 'semana' }, { unidades: 2 }), '2 por semana');
assert.equal(textoDoChip({ frequenciaVezes: 1, frequenciaUnidade: 'semana' }, { quadro: true }), 'Sob demanda');
assert.ok('erro' in frequenciaDoRascunho({ vezes: '2', unidade: 'semana', aPartirDe: '' }, 'serie'));
assert.ok(!('erro' in frequenciaDoRascunho({ vezes: '2', unidade: 'semana', aPartirDe: '' }, 'serie', 2)));
console.log('frequenciaChip (regra de ouro): ok');
