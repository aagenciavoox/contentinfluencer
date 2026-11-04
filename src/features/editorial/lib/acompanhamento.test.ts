import assert from 'node:assert/strict';
import { acompanhaNoGeral, coberturaNoGeral, comAcompanhamentoGeral, idsComAncestrais, serieAcompanhada } from './acompanhamento.ts';

const antiga = { id: 's', acompanharContinuidade: true };
assert.equal(acompanhaNoGeral(antiga), true);
const nova = { id: 's', acompanharContinuidade: true, acompanhamentos: [] };
assert.equal(acompanhaNoGeral(nova), false, 'tabela nova manda');
const ligada = comAcompanhamentoGeral(nova, true, () => 'g1');
assert.equal(acompanhaNoGeral(ligada), true);
assert.equal(ligada.acompanhamentos.length, 1);
const desligada = comAcompanhamentoGeral(ligada, false, () => 'x');
assert.equal(acompanhaNoGeral(desligada), false);
assert.equal(desligada.acompanhamentos.length, 1);
const porConta = { id: 's', acompanhamentos: [{ id: 'c', serieId: 's', escopo: 'conta' as const, platformId: 'ig', formato: null, ativo: true, inicio: null, termino: null, distanciaMaxDias: null, evitarDiasSeguidos: false }] };
assert.equal(acompanhaNoGeral(porConta), false);
assert.equal(serieAcompanhada(porConta), true);

// --- Janela no acompanhamento geral: a mesma regra dos escopos.
{
  const semana = { inicio: '2026-11-08', fim: '2026-11-14' };
  const ids = new Set(['s']);
  const pausa = (inicio: string, fim: string) => ({ id: inicio, inicio, fim, escopo: 'serie' as const, platformId: null, serieId: 's', nota: '' });
  assert.equal(coberturaNoGeral(semana, null, [], ids), 'integral');
  assert.equal(coberturaNoGeral(semana, { inicio: '2026-11-15', termino: null }, [], ids), 'fora', 'antes do início não conta');
  assert.equal(coberturaNoGeral(semana, { inicio: '2026-11-10', termino: null }, [], ids), 'parcial', 'começa no meio da semana');
  assert.equal(coberturaNoGeral(semana, { inicio: null, termino: '2026-11-07' }, [], ids), 'fora', 'depois do término não conta');
  assert.equal(coberturaNoGeral(semana, null, [pausa('2026-11-09', '2026-11-13')], ids), 'parcial', 'cinco dias de pausa não cobram a semana');
  assert.equal(coberturaNoGeral(semana, null, [pausa('2026-11-08', '2026-11-14')], ids), 'pausada');
  assert.equal(coberturaNoGeral(semana, null, [pausa('2026-11-09', '2026-11-13')], new Set(['outra'])), 'integral', 'pausa de outra série não vale');
}

// --- Pausa da série vale para os quadros dela.
assert.deepEqual([...idsComAncestrais('q', [{ id: 'q', parentId: 's' }, { id: 's', parentId: 'f' }, { id: 'f', parentId: null }])], ['q', 's', 'f']);

console.log('acompanhamento: ok');
