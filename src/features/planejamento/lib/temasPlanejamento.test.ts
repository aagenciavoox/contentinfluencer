import assert from 'node:assert/strict';
import {conteudoTemTema, nomesDosTemas, temasEmUso} from './temasPlanejamento.ts';

const catalogo = [
  {id: 'tema-h', nome: 'Halloween'},
  {id: 'tema-a', nome: 'Autoras nacionais'},
  {id: 'tema-n', nome: 'Natal'},
];

function testNomesIgnoramTemaQueSaiuDoCatalogo() {
  assert.deepEqual(nomesDosTemas(['tema-h', 'tema-removido', 'tema-a'], catalogo), ['Halloween', 'Autoras nacionais']);
  assert.deepEqual(nomesDosTemas(undefined, catalogo), []);
}

function testTemasEmUsoSoContaConteudoPuxado() {
  const contents = [
    {id: 'c1', temaIds: ['tema-h']},
    {id: 'c2', temaIds: ['tema-a', 'tema-h']},
    {id: 'c3', temaIds: ['tema-n']},
  ];
  const postIts = [{contentId: 'c1'}, {contentId: 'c2'}, {contentId: null}];
  assert.deepEqual(
    temasEmUso(postIts, contents, catalogo).map(tema => tema.id),
    ['tema-a', 'tema-h'],
  );
}

function testFiltroPorTema() {
  assert.equal(conteudoTemTema({temaIds: ['tema-h']}, 'tema-h'), true);
  assert.equal(conteudoTemTema({temaIds: ['tema-a']}, 'tema-h'), false);
  assert.equal(conteudoTemTema(null, 'tema-h'), false);
  assert.equal(conteudoTemTema(null, null), true);
}

testNomesIgnoramTemaQueSaiuDoCatalogo();
testTemasEmUsoSoContaConteudoPuxado();
testFiltroPorTema();
