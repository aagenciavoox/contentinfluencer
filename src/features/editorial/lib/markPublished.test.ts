import assert from 'node:assert/strict';
import type { ContentPlataforma } from '../../../lib/database.ts';
import { markPublished } from './markPublished.ts';

function publicacao(partial: Partial<ContentPlataforma> & Pick<ContentPlataforma, 'id'>): ContentPlataforma {
  return {
    contentId: 'c1',
    platformId: 'instagram',
    legenda: '',
    hashtags: '',
    publishDate: null,
    status: 'agendada',
    realizadaManualEm: null,
    realizadaApiEm: null,
    postCodigo: null,
    postUrl: null,
    legendaPropria: false,
    contaNaGrade: true,
    ...partial,
  };
}

const base = {
  status: 'Produção',
  postedAt: null as string | null,
  link: null as string | null,
};

function testCongelaUmaVez() {
  const content = {
    ...base,
    funcao: null,
    funcaoOrigem: 'herdada' as const,
    classificacaoCongeladaEm: null as string | null,
  };
  const pubs = [publicacao({ id: 'p1' })];
  const first = markPublished(
    content,
    pubs,
    [{ id: 'p1', realizadaEm: '2026-10-04T15:00:00.000Z', postUrl: 'https://www.instagram.com/reel/ABC123/' }],
    { serie: { funcaoPadrao: 'converter' }, now: '2026-10-04T18:00:00.000Z' },
  );

  assert.equal(first.content.status, 'Postado');
  assert.equal(first.content.funcao, 'converter');
  assert.equal(first.content.funcaoOrigem, 'herdada');
  assert.equal(first.content.classificacaoCongeladaEm, '2026-10-04T18:00:00.000Z');
  assert.equal(first.publicacoes[0]?.status, 'publicada');
  assert.equal(first.publicacoes[0]?.postCodigo, 'ABC123');
  assert.equal(first.publicacoes[0]?.realizadaManualEm, '2026-10-04T15:00:00.000Z');

  const second = markPublished(
    first.content,
    first.publicacoes,
    [{ id: 'p1', realizadaEm: '2026-10-05T15:00:00.000Z', postUrl: 'https://www.instagram.com/reel/OUTRO/' }],
    { serie: { funcaoPadrao: 'acao' }, now: '2026-10-05T18:00:00.000Z' },
  );

  assert.equal(second.content.funcao, 'converter');
  assert.equal(second.content.funcaoOrigem, 'herdada');
  assert.equal(second.content.classificacaoCongeladaEm, '2026-10-04T18:00:00.000Z');
  assert.equal(second.publicacoes[0]?.postCodigo, 'OUTRO');
}

function testNaoSobrescreveEscolhida() {
  const content = {
    ...base,
    funcao: 'atrair' as const,
    funcaoOrigem: 'escolhida' as const,
    classificacaoCongeladaEm: null as string | null,
  };
  const marked = markPublished(
    content,
    [publicacao({ id: 'p1' })],
    [{ id: 'p1', realizadaEm: '2026-10-02T08:00:00.000Z' }],
    { serie: { funcaoPadrao: 'converter' }, now: '2026-10-02T12:00:00.000Z' },
  );

  assert.equal(marked.content.funcao, 'atrair');
  assert.equal(marked.content.funcaoOrigem, 'escolhida');
  assert.equal(marked.content.classificacaoCongeladaEm, '2026-10-02T12:00:00.000Z');
  assert.equal(marked.content.status, 'Postado');
}

function testDataMinima() {
  const content = {
    ...base,
    funcao: 'acao' as const,
    funcaoOrigem: 'escolhida' as const,
    classificacaoCongeladaEm: '2026-09-01T00:00:00.000Z',
  };
  const marked = markPublished(
    content,
    [
      publicacao({
        id: 'ja',
        status: 'publicada',
        realizadaManualEm: '2026-10-04T15:00:00.000Z',
        realizadaApiEm: '2026-09-20T10:00:00.000Z',
      }),
      publicacao({ id: 'nova' }),
    ],
    [
      { id: 'ja', realizadaEm: '2026-10-06T15:00:00.000Z' },
      { id: 'nova', realizadaEm: '2026-10-03T08:00:00.000Z', postUrl: 'https://vm.tiktok.com/ZMabc/' },
    ],
    { now: '2026-10-06T18:00:00.000Z' },
  );

  assert.equal(marked.content.classificacaoCongeladaEm, '2026-09-01T00:00:00.000Z');
  assert.equal(marked.content.funcao, 'acao');
  assert.equal(marked.publicacoes[0]?.realizadaApiEm, '2026-09-20T10:00:00.000Z');
  assert.equal(marked.publicacoes[0]?.realizadaManualEm, '2026-10-06T15:00:00.000Z');
  assert.equal(marked.publicacoes[1]?.postCodigo, null);
  assert.equal(marked.publicacoes[1]?.postUrl, 'https://vm.tiktok.com/ZMabc/');
  assert.equal(marked.content.postedAt, '2026-09-20T10:00:00.000Z');

  const soManuais = markPublished(
    content,
    [publicacao({ id: 'a' }), publicacao({ id: 'b' })],
    [
      { id: 'a', realizadaEm: '2026-10-04T15:00:00.000Z' },
      { id: 'b', realizadaEm: '2026-10-02T08:00:00.000Z' },
    ],
  );
  assert.equal(soManuais.content.postedAt, '2026-10-02T08:00:00.000Z');
}

testCongelaUmaVez();
testNaoSobrescreveEscolhida();
testDataMinima();

console.log('markPublished tests passed');