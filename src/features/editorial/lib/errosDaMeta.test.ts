import assert from 'node:assert/strict';
import { errosDaMeta, ID_META } from './errosDaMeta.ts';

const base = { vezes: '1', unidade: 'semana', inicio: '', tipo: 'serie' as const, comEscopos: false };

assert.deepEqual(errosDaMeta(base), []);
assert.deepEqual(errosDaMeta({ ...base, vezes: '', unidade: 'quinzena' }), []);

const muito = errosDaMeta({ ...base, vezes: '99' });
assert.equal(muito[0]?.id, ID_META.quantidade);
const zero = errosDaMeta({ ...base, vezes: '0' });
assert.equal(zero[0]?.id, ID_META.quantidade);

const quinzena = errosDaMeta({ ...base, unidade: 'quinzena' });
assert.equal(quinzena.length, 1);
assert.equal(quinzena[0].id, ID_META.inicio);
assert.match(quinzena[0].mensagem, /14 dias/);

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
  ID_META.inicio,
  'geral-termino',
  'escopo-l1-conta',
  'escopo-l1-termino',
  'escopo-l1-meta-inicio',
]);

console.log('errosDaMeta: ok');
