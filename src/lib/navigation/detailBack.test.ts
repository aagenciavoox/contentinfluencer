import assert from 'node:assert/strict';
import {
  buildDetailBackState,
  labelForDetailBack,
  resolveContentDetailBack,
  resolveRouteBack,
  withDetailBack,
} from './detailBack.ts';

function backFor(fromPath: string) {
  return resolveContentDetailBack(withDetailBack(fromPath).state);
}

assert.equal(backFor('/criacao?tab=roteiros'), '/criacao?tab=roteiros');
assert.equal(backFor('/criacao/legendas'), '/criacao/legendas');
assert.equal(backFor('/calendario?modo=agendar'), '/calendario?modo=agendar');
assert.equal(backFor('/planejamento'), '/planejamento');
assert.equal(backFor('/gravacao'), '/gravacao');
assert.equal(backFor('/dashboard'), '/dashboard');
assert.equal(backFor('/'), '/');
assert.equal(backFor('/biblioteca/book-1'), '/biblioteca/book-1');
assert.equal(backFor('/projetos/projeto-1'), '/projetos/projeto-1');
assert.equal(backFor('/series/serie-1'), '/series/serie-1');
assert.equal(backFor('/editorial?aba=series'), '/editorial?aba=series');
assert.equal(backFor('/editorial/pilares/pilar-1'), '/editorial/pilares/pilar-1');
assert.equal(backFor('/configuracoes/pilares'), '/configuracoes/pilares');

assert.equal(backFor('/evil'), '/criacao');
assert.equal(backFor('https://evil.com'), '/criacao');
assert.equal(backFor('http://evil.com'), '/criacao');
assert.equal(backFor('//evil.com'), '/criacao');
assert.equal(backFor('javascript:alert(1)'), '/criacao');
assert.equal(backFor('criacao'), '/criacao');

assert.equal(resolveContentDetailBack(null), '/criacao');
assert.equal(resolveContentDetailBack(undefined), '/criacao');
assert.equal(resolveContentDetailBack({}), '/criacao');

assert.deepEqual(buildDetailBackState('/gravacao'), {state: {from: '/gravacao'}});
assert.equal(resolveRouteBack('/conteudos/abc', {from: '/gravacao'}, '/nao-usado'), '/gravacao');
assert.equal(resolveRouteBack('/biblioteca/abc', {from: '/gravacao'}, '/biblioteca'), '/biblioteca');

assert.equal(labelForDetailBack('/series/abc/roteiros', 'Roteiros'), 'Séries');
assert.equal(labelForDetailBack('/projetos/abc', 'Conteúdos'), 'Projetos');
assert.equal(labelForDetailBack('/criacao?tab=roteiros', 'Roteiros'), 'Roteiros');
assert.equal(labelForDetailBack('/calendario', 'Roteiros'), 'Calendário');
assert.equal(labelForDetailBack('/planejamento', 'Roteiros'), 'Planejamento');
assert.equal(labelForDetailBack('/programacao', 'Roteiros'), 'Planejamento');
assert.equal(labelForDetailBack('/editorial?aba=funil', 'Roteiros'), 'Editorial');

console.log('detailBack.test.ts passed');
