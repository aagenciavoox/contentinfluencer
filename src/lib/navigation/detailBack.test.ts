import assert from 'node:assert/strict';
import {
  buildDetailBackState,
  resolveContentDetailBack,
  resolveRouteBack,
  withDetailBack,
} from './detailBack.ts';

function backFor(fromPath: string) {
  return resolveContentDetailBack(withDetailBack(fromPath).state);
}

assert.equal(backFor('/criacao?tab=roteiros'), '/criacao?tab=roteiros');
assert.equal(backFor('/calendario?modo=agendar'), '/calendario?modo=agendar');
assert.equal(backFor('/gravacao'), '/gravacao');
assert.equal(backFor('/dashboard'), '/dashboard');
assert.equal(backFor('/'), '/');
assert.equal(backFor('/biblioteca/book-1'), '/biblioteca/book-1');
assert.equal(backFor('/projetos/projeto-1'), '/projetos/projeto-1');
assert.equal(backFor('/configuracoes/series/serie-1'), '/configuracoes/series/serie-1');
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

console.log('detailBack.test.ts passed');
