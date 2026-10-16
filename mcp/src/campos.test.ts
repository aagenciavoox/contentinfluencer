import assert from 'node:assert/strict';
import {
  aplicarFicha,
  horaEscolhida,
  listaDeFormatos,
  primeiroFormato,
  janelaDaHora,
  lerFicha,
  resolverTemas,
} from './campos.ts';

function testJanela() {
  assert.equal(janelaDaHora(null), null);
  assert.equal(janelaDaHora('04:30'), 'noite');
  assert.equal(janelaDaHora('05:00:00'), 'manha');
  assert.equal(janelaDaHora('11:59'), 'manha');
  assert.equal(janelaDaHora('12:00'), 'tarde');
  assert.equal(janelaDaHora('17:59'), 'tarde');
  assert.equal(janelaDaHora('18:00'), 'noite');
  assert.equal(horaEscolhida(undefined, 'manha'), '09:00');
  assert.equal(horaEscolhida('15:10', 'manha'), '15:10');
  assert.equal(horaEscolhida(null, 'tarde'), null);
  assert.equal(horaEscolhida(undefined, undefined), undefined);
  assert.equal(horaEscolhida(undefined, null), null);
}

function testTemas() {
  const catalogo = [{id: 't1', nome: 'Halloween'}];
  let seq = 0;
  const resolved = resolverTemas(catalogo, ['halloween', 'Natal', 'Natal', ''], () => `novo-${++seq}`);
  assert.deepEqual(resolved.ids, ['t1', 'novo-1']);
  assert.deepEqual(resolved.criados, [{id: 'novo-1', nome: 'Natal'}]);
  assert.equal(catalogo.length, 1);

  const porId = resolverTemas(catalogo, ['t1'], () => 'nao');
  assert.deepEqual(porId, {ids: ['t1'], criados: []});
}

function testFicha() {
  assert.deepEqual(lerFicha({
    editora: 'Companhia',
    quemIndicou: '  podcast  ',
    tagsPersonalizadas: ['clássico', ''],
    colecaoStatus: 'sim',
    isbn: '',
  }), {
    editora: 'Companhia',
    quem_indicou: 'podcast',
    tags: ['clássico'],
    colecao_status: 'sim',
  });

  const stored = aplicarFicha(
    {editora: 'Companhia', quem_indicou: 'podcast'},
    {quem_indicou: null, ano_publicacao: '2020', tags: []},
  );
  assert.deepEqual(stored, {editora: 'Companhia', anoPublicacao: '2020'});
}

testJanela();
testTemas();
testFicha();

assert.deepEqual(listaDeFormatos('Reels'), ['Reels']);
assert.deepEqual(listaDeFormatos(['Reels', ' reels ', '', 'Carrossel']), ['Reels', 'Carrossel']);
assert.deepEqual(listaDeFormatos('["Reels","Stories"]'), ['Reels', 'Stories']);
assert.deepEqual(listaDeFormatos(null), []);
assert.equal(primeiroFormato(['Carrossel', 'Reels']), 'Carrossel');
assert.equal(primeiroFormato(''), null);
console.log('campos mcp ok');
