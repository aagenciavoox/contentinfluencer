import assert from 'node:assert/strict';
import {assuntosEmUso, conteudoTemAssunto, idsDeObras, nomesDasObras, nomesDosAssuntos} from './assuntosObras.ts';

function testIdsDeObrasPrefereLista() {
  assert.deepEqual(idsDeObras({bibliotecaItemId: 'a', livroIds: ['b', 'c']}), ['b', 'c']);
  assert.deepEqual(idsDeObras({bibliotecaItemId: 'a', livroIds: []}), ['a']);
  assert.deepEqual(idsDeObras(null), []);
}

function testAssuntosSoDoCatalogo() {
  assert.deepEqual(
    nomesDosAssuntos({temaIds: ['t1', 't2']}, [{id: 't1', nome: 'Halloween'}, {id: 't2', nome: '  '}]),
    ['Halloween'],
  );
}

function testObrasPorTitulo() {
  assert.deepEqual(
    nomesDasObras({bibliotecaItemId: 'o1'}, [{id: 'o1', titulo: 'Sanderson'}]),
    ['Sanderson'],
  );
}

function testAssuntosEmUso() {
  const usados = assuntosEmUso(
    [{contentId: 'c1'}, {contentId: null}],
    [{id: 'c1', temaIds: ['t1']}],
    [{id: 't1', nome: 'Romance'}, {id: 't2', nome: 'Fantasia'}],
  );
  assert.deepEqual(usados.map(tema => tema.id), ['t1']);
  assert.equal(conteudoTemAssunto({temaIds: ['t1']}, 't1'), true);
  assert.equal(conteudoTemAssunto({temaIds: ['t1']}, 't2'), false);
  assert.equal(conteudoTemAssunto(null, null), true);
}

testIdsDeObrasPrefereLista();
testAssuntosSoDoCatalogo();
testObrasPorTitulo();
testAssuntosEmUso();
