import assert from 'node:assert/strict';
import { errosDaMeta, ID_META } from './errosDaMeta.ts';

const base = { vezes: '1', unidade: 'semana', inicio: '', tipo: 'serie' as const, comEscopos: false };

assert.deepEqual(errosDaMeta(base), []);
assert.deepEqual(errosDaMeta({ ...base, vezes: '', unidade: 'quinzena' }), []);

const muito = errosDaMeta({ ...base, vezes: '99' });
assert.equal(muito[0]?.id, ID_META.quantidade);
const zero = errosDaMeta({ ...base, vezes: '0' });
assert.equal(zero[0]?.id, ID_META.quantidade);

// Meta a cada 14 dias sem início grava: o ciclo usa a segunda da semana da ativação.
const quinzena = errosDaMeta({ ...base, unidade: 'quinzena' });
assert.deepEqual(quinzena, []);

const trimestre = errosDaMeta({ ...base, unidade: 'trimestre' });
assert.deepEqual(trimestre, []);

const juntos = errosDaMeta({
  vezes: '1',
  unidade: 'quinzena',
  inicio: '',
  tipo: 'serie',
  comEscopos: true,
  janelaGeral: { inicio: '2026-12-01', termino: '2026-11-01' },
  linhas: [{
    id: 'l1',
    escopo: 'conta',
    platformId: null,
    formato: null,
    inicio: '2026-12-01',
    termino: '2026-10-01',
    metaVezes: '1',
    metaUnidade: 'quinzena',
    metaAPartirDe: '',
    rotulo: 'Instagram',
  }],
});
assert.deepEqual(juntos.map(erro => erro.id), [
  'geral-termino',
  'escopo-l1-conta',
  'escopo-l1-termino',
]);

console.log('errosDaMeta: ok');

// --- Regra de Ouro: 2 por semana numa série barra no campo da quantidade; numa conta, no campo da linha.
{
  assert.equal(errosDaMeta({ ...base, vezes: '2' })[0]?.id, ID_META.quantidade);
  assert.match(errosDaMeta({ ...base, vezes: '2' })[0]?.mensagem ?? '', /Regra de Ouro/);
  assert.deepEqual(errosDaMeta({ ...base, vezes: '4', unidade: 'mes' }), []);
  const naConta = errosDaMeta({
    ...base,
    comEscopos: true,
    linhas: [{
      id: 'l2', escopo: 'conta', platformId: 'ig', formato: null, inicio: '', termino: '',
      metaVezes: '3', metaUnidade: 'semana', metaAPartirDe: '', rotulo: 'Instagram',
    }],
  });
  assert.deepEqual(naConta.map(erro => erro.id), ['escopo-l2-meta-vezes']);
  assert.match(naConta[0].mensagem, /^Em Instagram: Regra de Ouro/);
  console.log('errosDaMeta (regra de ouro): ok');
}
