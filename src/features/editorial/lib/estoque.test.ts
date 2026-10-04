import assert from 'node:assert/strict';
import { contarEstoque, textoEstoque, type EstoqueContent } from './estoque.ts';

function item(partial: Partial<EstoqueContent> & Pick<EstoqueContent, 'id'>): EstoqueContent {
  return {
    status: 'Produção',
    script: '',
    title: partial.id,
    recordedAt: '2026-10-01T12:00:00.000Z',
    postedAt: null,
    publishDate: null,
    tags: [],
    deletedAt: null,
    pilarId: null,
    seriesId: null,
    contaNaGrade: true,
    ...partial,
  };
}

function testContaSoQuemEntraNaGrade() {
  const total = contarEstoque([
    item({ id: 'pronto' }),
    item({ id: 'fora', contaNaGrade: false }),
    item({ id: 'sem-gravacao', recordedAt: null }),
    item({ id: 'roteiro', status: 'Roteiro' }),
    item({ id: 'postado', status: 'Postado' }),
    item({ id: 'apagado', deletedAt: '2026-10-02T00:00:00.000Z' }),
    item({ id: 'editar', tags: ['Editar'] }),
    item({ id: 'sem-flag', contaNaGrade: undefined }),
  ]);
  assert.equal(total, 2);
}

function testTextoNaoInventaAlvo() {
  assert.equal(textoEstoque(3, null), '3 no estoque');
  assert.equal(textoEstoque(3, 9), '3 de 9');
  assert.equal(textoEstoque(0, null).includes('de'), false);
}

testContaSoQuemEntraNaGrade();
testTextoNaoInventaAlvo();

console.log('estoque tests passed');
