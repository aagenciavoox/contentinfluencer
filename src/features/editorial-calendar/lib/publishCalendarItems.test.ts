import assert from 'node:assert/strict';
import type { Content, ContentPlataforma } from '../../../lib/database.ts';
import { buildPublishCalendarItems } from './publishCalendarItems.ts';

const INSTAGRAM = 'plat-instagram';
const TIKTOK = 'plat-tiktok';
const platforms = [
  { id: INSTAGRAM, nome: 'Instagram' },
  { id: TIKTOK, nome: 'TikTok' },
];
const series = [{ id: 'serie-1', funcaoPadrao: 'converter' as const }];

function publicacao(
  partial: Partial<ContentPlataforma> & Pick<ContentPlataforma, 'id' | 'platformId'>,
): ContentPlataforma {
  return {
    contentId: 'semana',
    legenda: '',
    hashtags: '',
    publishDate: null,
    publicationKind: 'post',
    status: 'agendada',
    ...partial,
  };
}

function conteudo(partial: Partial<Content> & Pick<Content, 'id'>): Content {
  return {
    userId: 'u',
    title: 'Roteiro da semana',
    status: 'Produção',
    slotType: null,
    seriesId: 'serie-1',
    pilarId: 'pilar-1',
    lookId: null,
    cenarioId: null,
    bibliotecaItemId: null,
    formatoVisual: null,
    energiaNecessaria: null,
    funcao: null,
    funcaoOrigem: 'herdada',
    classificacaoCongeladaEm: null,
    contaNaGrade: true,
    publishDate: '2026-10-05',
    publishTime: null,
    recordingDate: null,
    link: null,
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    deletedAt: null,
    plataformas: [],
    ...partial,
  };
}

function testSemanaMostraInstagramNaGradeETikTokComoExtra() {
  const contents = [
    conteudo({
      id: 'semana',
      plataformas: [
        publicacao({
          id: 'ig',
          contentId: 'semana',
          platformId: 'Instagram',
          publishDate: '2026-10-06',
          publishTime: '18:00',
        }),
        publicacao({
          id: 'tt',
          contentId: 'semana',
          platformId: TIKTOK,
          publishDate: '2026-10-08',
          publishTime: '19:00',
        }),
      ],
    }),
    conteudo({
      id: 'so-tiktok',
      plataformas: [
        publicacao({
          id: 'extra',
          contentId: 'so-tiktok',
          platformId: TIKTOK,
          publishDate: '2026-10-07',
        }),
      ],
    }),
  ];

  const todas = buildPublishCalendarItems({
    contents,
    platforms,
    series,
    redeReferenciaId: INSTAGRAM,
    platformFilter: 'todas',
  });
  assert.deepEqual(todas.map(item => item.contentId), ['semana']);
  assert.equal(todas[0]?.date, '2026-10-06');
  assert.deepEqual(todas[0]?.platformNames, ['Instagram', 'TikTok']);

  const soTikTok = buildPublishCalendarItems({
    contents,
    platforms,
    series,
    redeReferenciaId: INSTAGRAM,
    platformFilter: 'TikTok',
  });
  assert.deepEqual(
    soTikTok.map(item => ({ id: item.contentId, date: item.date?.slice(0, 10) })),
    [
      { id: 'semana', date: '2026-10-08' },
      { id: 'so-tiktok', date: '2026-10-07' },
    ],
  );
  assert.deepEqual(soTikTok[0]?.platformNames, ['TikTok']);
}

function testRepostEntraNaGradeComDataPropria() {
  const itens = buildPublishCalendarItems({
    contents: [
      conteudo({
        id: 'semana',
        plataformas: [
          publicacao({
            id: 'ig',
            contentId: 'semana',
            platformId: INSTAGRAM,
            publishDate: '2026-10-06',
          }),
          publicacao({
            id: 'repost-1',
            contentId: 'semana',
            platformId: INSTAGRAM,
            publicationKind: 'repost',
            publishDate: '2026-10-20',
          }),
        ],
      }),
    ],
    platforms,
    series,
    redeReferenciaId: INSTAGRAM,
    platformFilter: 'todas',
  });
  assert.deepEqual(itens.map(item => item.date), ['2026-10-06', '2026-10-20']);
  assert.equal(itens[1]?.plataformaId, 'repost-1');
  assert.deepEqual(itens[1]?.platformNames, ['Instagram']);
}

testSemanaMostraInstagramNaGradeETikTokComoExtra();
testRepostEntraNaGradeComDataPropria();
console.log('publishCalendarItems tests passed');