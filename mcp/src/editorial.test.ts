import assert from 'node:assert/strict';
import {
  contaNaGradePadrao,
  gravarFuncao,
  livrosDoConteudo,
  parsePostCode,
  patchPrimeiraPublicacao,
  resolveFuncao,
  unirLivros,
} from './editorial.ts';
import {columnAbsence, stripSelectColumn} from './lib.ts';

function testGrade() {
  assert.equal(contaNaGradePadrao('Reels', 'atrair'), true);
  assert.equal(contaNaGradePadrao('Stories', 'atrair'), false);
  assert.equal(contaNaGradePadrao('Live', null), false);
  assert.equal(contaNaGradePadrao('Reels', 'reter'), false);
}

function testFuncao() {
  const serie = {funcao_padrao: 'converter'};
  assert.deepEqual(resolveFuncao({funcao: null, funcao_origem: 'herdada'}, serie), {
    funcao: 'converter',
    origem: 'herdada',
    congelada: false,
  });
  assert.equal(
    resolveFuncao({funcao: 'converter', funcao_origem: 'herdada', classificacao_congelada_em: '2026-10-01'}, {funcao_padrao: 'acao'}).funcao,
    'converter',
  );
  assert.deepEqual(gravarFuncao({serie}), {funcao: null, funcao_origem: 'herdada', efetiva: 'converter'});
  assert.equal(gravarFuncao({funcao: 'acao', serie}).funcao_origem, 'escolhida');
  assert.throws(() => gravarFuncao({funcao_origem: 'escolhida', funcao: null}));
}

function testLivros() {
  assert.deepEqual(livrosDoConteudo({livro_ids: ['a', 'b'], biblioteca_item_id: 'a'}), ['a', 'b']);
  assert.deepEqual(livrosDoConteudo({biblioteca_item_id: 'so-um'}), ['so-um']);
  assert.deepEqual(unirLivros(['b'], 'a'), ['a', 'b']);
  assert.deepEqual(unirLivros([], null), []);
}

function testPostECongelamento() {
  assert.equal(parsePostCode('https://www.instagram.com/reel/ABC123/'), 'ABC123');
  assert.equal(parsePostCode('https://vm.tiktok.com/ZMabc/'), null);
  const patch = patchPrimeiraPublicacao(
    {funcao: null, funcao_origem: 'herdada', classificacao_congelada_em: null, posted_at: null, link: null},
    {funcao_padrao: 'converter'},
    '2026-10-04T18:00:00.000Z',
    ['2026-10-04T15:00:00.000Z'],
    'https://www.instagram.com/reel/ABC123/',
  );
  assert.equal(patch.funcao, 'converter');
  assert.equal(patch.status, 'Postado');
  assert.equal(patch.classificacao_congelada_em, '2026-10-04T18:00:00.000Z');
  assert.equal(patch.link, 'https://www.instagram.com/reel/ABC123/');

  const deNovo = patchPrimeiraPublicacao(
    {funcao: 'converter', funcao_origem: 'herdada', classificacao_congelada_em: '2026-10-04T18:00:00.000Z', posted_at: '2026-10-04T15:00:00.000Z', link: 'https://www.instagram.com/reel/ABC123/'},
    {funcao_padrao: 'acao'},
    '2026-10-05T18:00:00.000Z',
    ['2026-10-05T15:00:00.000Z'],
    null,
  );
  assert.equal(deNovo.funcao, undefined);
  assert.equal(deNovo.classificacao_congelada_em, undefined);
}

function testSelect() {
  const select = 'id, title, status, livro_ids, content_plataformas(id, status, post_url)';
  assert.equal(
    stripSelectColumn(select, 'status', 'content_plataformas'),
    'id, title, status, livro_ids, content_plataformas(id, post_url)',
  );
  assert.equal(stripSelectColumn(select, 'livro_ids', 'contents'), 'id, title, status, content_plataformas(id, status, post_url)');
  assert.deepEqual(columnAbsence({message: "Could not find the 'livro_ids' column of 'contents' in the schema cache"}), {
    column: 'livro_ids',
    table: 'contents',
  });
  assert.deepEqual(columnAbsence({message: 'column content_plataformas.status does not exist'}), {
    column: 'status',
    table: 'content_plataformas',
  });
}

testGrade();
testFuncao();
testLivros();
testPostECongelamento();
testSelect();
console.log('editorial mcp ok');
