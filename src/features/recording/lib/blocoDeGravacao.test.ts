import assert from 'node:assert/strict';
import type { Content, RecordingBlock } from '../../../lib/database.ts';
import { montarBlocoDeGravacao, motivoForaDoBloco, prontoParaGravar, tagsDoTexto } from './blocoDeGravacao.ts';

const conteudo = (id: string, extra: Partial<Content> = {}): Content => ({
  id,
  title: `Roteiro ${id}`,
  status: 'Roteiro',
  script: '<p>Texto</p>',
  notes: null,
  tags: [],
  plataformas: [],
  archivedAt: null,
  deletedAt: null,
  recordedAt: null,
  ...extra,
} as unknown as Content);

const blocos = [{ id: 'b1', name: 'Terça', contents: [{ blockId: 'b1', contentId: 'no-bloco', ordem: 0, gravado: false }] }] as unknown as RecordingBlock[];

function testMotivos() {
  assert.equal(motivoForaDoBloco(conteudo('a'), blocos), null);
  assert.equal(motivoForaDoBloco(conteudo('a', { status: 'Produção', script: '' }), blocos), null);
  assert.equal(motivoForaDoBloco(conteudo('no-bloco'), blocos), 'ja-em-bloco');
  assert.equal(motivoForaDoBloco(conteudo('a', { status: 'Ideia' }), blocos), 'etapa');
  assert.equal(motivoForaDoBloco(conteudo('a', { status: 'Publicado' }), blocos), 'etapa');
  assert.equal(motivoForaDoBloco(conteudo('a', { script: '' }), blocos), 'sem-texto');
  // Corpo ainda não carregado (select leve): entra, e quem grava confere depois.
  assert.equal(motivoForaDoBloco(conteudo('a', { script: undefined, notes: undefined }), blocos), null);
  assert.equal(motivoForaDoBloco(conteudo('a', { writingMode: 'carrossel' }), blocos), 'carrossel');
  assert.equal(motivoForaDoBloco(conteudo('a', { archivedAt: '2026-01-01' }), blocos), 'arquivado');
}

function testProntoParaGravar() {
  const subiu = prontoParaGravar(conteudo('a'), '2026-11-04T12:00:00Z');
  assert.equal(subiu.status, 'Produção');
  assert.ok(subiu.tags.includes('gravar'));
  assert.equal(prontoParaGravar(conteudo('a', { script: '' })).status, 'Roteiro');
  assert.equal(prontoParaGravar(conteudo('a', { status: 'Produção' })).status, 'Produção');
}

function testMontarBloco() {
  const { block, blockContents } = montarBlocoDeGravacao({
    id: 'novo',
    userId: 'u',
    nome: '  Quinta  ',
    contents: [conteudo('a', { tags: ['look casa', 'gravar'] }), conteudo('b', { tags: ['Look Casa'], recordedAt: '2026-01-01' })],
    now: '2026-11-04T12:00:00Z',
  });
  assert.equal(block.name, 'Quinta');
  assert.deepEqual(block.metadata, { recordingTags: ['look casa', 'gravar'], sourceContentIds: ['a', 'b'] });
  assert.deepEqual(blockContents, [
    { blockId: 'novo', contentId: 'a', ordem: 0, gravado: false },
    { blockId: 'novo', contentId: 'b', ordem: 1, gravado: true },
  ]);
  const comTags = montarBlocoDeGravacao({ id: 'x', userId: 'u', nome: 'X', tags: tagsDoTexto('mesa, luz\n mesa'), contents: [conteudo('a', { tags: ['ignorada'] })] });
  assert.deepEqual(comTags.block.metadata.recordingTags, ['mesa', 'luz']);
}

testMotivos();
testProntoParaGravar();
testMontarBloco();
