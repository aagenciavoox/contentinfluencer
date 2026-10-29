import assert from 'node:assert/strict';
import {
  contarEstoque,
  reservaPronta,
  rotuloCapacidadeSeries,
  textoEstoque,
  type EstoqueContent,
} from './estoque.ts';

function item(partial: Partial<EstoqueContent> & Pick<EstoqueContent, 'id'>): EstoqueContent {
  return {
    status: 'Edição',
    edicaoConcluidaEm: '2026-10-02T12:00:00.000Z',
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

function testContaProntoSemDataDeReferencia() {
  const total = contarEstoque([
    item({ id: 'pronto' }),
    item({ id: 'fora', contaNaGrade: false }),
    item({ id: 'em-edicao', edicaoConcluidaEm: null }),
    item({ id: 'roteiro', status: 'Roteiro' }),
    item({ id: 'postado', status: 'Postado', postedAt: '2026-10-01T12:00:00.000Z' }),
    item({ id: 'apagado', deletedAt: '2026-10-02T00:00:00.000Z' }),
    item({ id: 'em-producao', status: 'Produção' }),
    item({ id: 'sem-flag', contaNaGrade: undefined }),
    item({ id: 'agendado', publishDate: '2026-10-20' }),
    item({
      id: 'na-rede',
      plataformas: [{
        id: 'ig',
        contentId: 'na-rede',
        platformId: 'ig',
        legenda: '',
        hashtags: '',
        publishDate: '2026-10-21',
        publicationKind: 'post',
        status: 'prevista',
      }],
    }),
  ], { redeReferenciaId: 'ig' });
  // 3 inéditos prontos + 1 publicado para reaproveitar
  assert.equal(total, 4);
}

function testSeparaIneditosEReaproveitar() {
  const reserva = reservaPronta([
    item({ id: 'inedito' }),
    item({ id: 'publicado', status: 'Publicado', postedAt: '2026-09-01T12:00:00.000Z' }),
    item({
      id: 'ciclo-pendente',
      status: 'Publicado',
      postedAt: '2026-09-01T12:00:00.000Z',
      plataformas: [{
        id: 'r1',
        contentId: 'ciclo-pendente',
        platformId: 'ig',
        legenda: '',
        hashtags: '',
        publishDate: '2026-11-01',
        publicationKind: 'repost',
        ciclo: 2,
        status: 'prevista',
      }],
    }),
  ], { redeReferenciaId: 'ig' });
  assert.equal(reserva.ineditos, 1);
  assert.equal(reserva.reaproveitar, 1);
  assert.equal(reserva.total, 2);
}

function testTextoNaoInventaAlvo() {
  assert.equal(textoEstoque(3, null), '3 no estoque');
  assert.equal(textoEstoque(3, 9), '3 de 9');
  assert.equal(textoEstoque(0, null).includes('de'), false);
}

function testRotuloCapacidade() {
  assert.equal(
    rotuloCapacidadeSeries({ limite: 8, reservaFora: 3, comSerie: 4, semSerie: 2 }),
    'Séries 4 de 5 · Fora das séries 2 de 3',
  );
  assert.equal(rotuloCapacidadeSeries({ limite: null, reservaFora: 3, comSerie: 1, semSerie: 0 }), null);
}

testContaProntoSemDataDeReferencia();
testSeparaIneditosEReaproveitar();
testTextoNaoInventaAlvo();
testRotuloCapacidade();

console.log('estoque tests passed');
