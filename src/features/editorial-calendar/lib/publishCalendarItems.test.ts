import assert from 'node:assert/strict';
import type { Content, ContentPlataforma } from '../../../lib/database.ts';
import { buildPublishCalendarItems, isScheduledItem, publishItemStatus } from './publishCalendarItems.ts';
import { buildGradeEntries } from '../../editorial/lib/gradeEntries.ts';

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
  assert.deepEqual(
    todas.map(item => ({ id: item.contentId, date: item.date?.slice(0, 10) })),
    [
      { id: 'semana', date: '2026-10-06' },
      { id: 'so-tiktok', date: '2026-10-07' },
    ],
  );
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
  assert.equal(itens[1]?.id, 'semana:ciclo:2');
  assert.equal(itens[1]?.plataformaId, 'repost-1');
  assert.deepEqual(itens[1]?.platformNames, ['Instagram']);
}

function testPublicacaoMarcadaComoPostadaApareceComoPostado() {
  const content = conteudo({
    id: 'semana',
    status: 'Postado',
    postedAt: '2026-10-06T18:00:00.000Z',
    plataformas: [
      publicacao({
        id: 'ig',
        platformId: INSTAGRAM,
        publishDate: '2026-10-06',
        status: 'publicada',
        realizadaManualEm: '2026-10-06T18:00:00.000Z',
      }),
      publicacao({
        id: 'tt',
        platformId: TIKTOK,
        publishDate: '2026-10-06',
        status: 'nao_publicada',
      }),
      publicacao({
        id: 'repost-1',
        platformId: INSTAGRAM,
        publicationKind: 'repost',
        publishDate: '2026-10-20',
      }),
    ],
  });
  const base = { contents: [content], platforms, series, redeReferenciaId: INSTAGRAM };

  const todas = buildPublishCalendarItems({ ...base, platformFilter: 'todas' });
  assert.deepEqual(todas.map(item => item.posted), [true, false]);
  // Repost futuro sem status programada continua Prevista, não Programado.
  assert.deepEqual(todas.map(item => publishItemStatus(content, item, '2026-10-14')), ['Publicado', 'Prevista']);
  assert.deepEqual(todas.map(item => publishItemStatus(content, item, '2026-10-25')), ['Publicado', 'Prevista']);
  assert.equal(isScheduledItem(todas[1]!, content), false);
  assert.equal(todas[1]?.programada, false);

  const soTikTok = buildPublishCalendarItems({ ...base, platformFilter: 'TikTok' });
  assert.equal(soTikTok[0]?.posted, false);
  assert.equal(soTikTok[0]?.cancelled, true);
  assert.equal(publishItemStatus(content, soTikTok[0]!, '2026-10-01'), 'Não publicada');
  assert.equal(isScheduledItem(soTikTok[0]!, content), false);
}

function testRoteiroPostadoSemMarcaNaRedeApareceComoPostado() {
  const content = conteudo({
    id: 'semana',
    status: 'Postado',
    plataformas: [
      publicacao({ id: 'ig', platformId: INSTAGRAM, publishDate: '2026-10-06' }),
    ],
  });
  const semRede = conteudo({ id: 'sem-rede', status: 'Postado' });
  const emProducao = conteudo({
    id: 'producao',
    plataformas: [
      publicacao({ id: 'ig-2', platformId: INSTAGRAM, publishDate: '2026-10-07' }),
    ],
  });
  const itens = buildPublishCalendarItems({
    contents: [content, semRede, emProducao],
    platforms,
    series,
    redeReferenciaId: INSTAGRAM,
    platformFilter: 'todas',
  });
  assert.deepEqual(
    itens.map(item => [item.contentId, item.posted]),
    [['semana', true], ['sem-rede', true], ['producao', false]],
  );

  const soInstagram = buildPublishCalendarItems({
    contents: [content],
    platforms,
    series,
    redeReferenciaId: INSTAGRAM,
    platformFilter: 'Instagram',
  });
  assert.equal(soInstagram[0]?.posted, true);
}

function testPostadoFicaNoDiaEmQueFoiAoAr() {
  const content = conteudo({
    id: 'postado',
    status: 'Postado',
    publishDate: null,
    postedAt: '2026-10-10T15:00:00.000Z',
    plataformas: [
      publicacao({
        id: 'ig',
        contentId: 'postado',
        platformId: INSTAGRAM,
        status: 'publicada',
        realizadaManualEm: '2026-10-11T15:00:00.000Z',
      }),
      publicacao({
        id: 'tt',
        contentId: 'postado',
        platformId: TIKTOK,
        status: 'publicada',
        realizadaManualEm: '2026-10-10T15:00:00.000Z',
      }),
    ],
  });
  const base = { contents: [content], platforms, series, redeReferenciaId: INSTAGRAM };

  const todas = buildPublishCalendarItems({ ...base, platformFilter: 'todas' });
  assert.equal(todas[0]?.date, '2026-10-11');
  assert.equal(todas[0]?.posted, true);

  const soTikTok = buildPublishCalendarItems({ ...base, platformFilter: 'TikTok' });
  assert.equal(soTikTok[0]?.date, '2026-10-10');
}

function testPostadoPeloStatusUsaDataPlanejadaAntesDaMudanca() {
  const planejado = conteudo({
    id: 'planejado',
    status: 'Postado',
    publishDate: '2026-10-09',
    postedAt: '2026-10-14T15:00:00.000Z',
  });
  const semData = conteudo({
    id: 'sem-data',
    status: 'Postado',
    publishDate: null,
    postedAt: '2026-10-07T15:00:00.000Z',
  });
  const itens = buildPublishCalendarItems({
    contents: [planejado, semData],
    platforms,
    series,
    redeReferenciaId: INSTAGRAM,
    platformFilter: 'todas',
  });
  assert.deepEqual(itens.map(item => item.date), ['2026-10-09', '2026-10-07']);
}

function testSemRedeDeReferenciaCadaRoteiroAparece() {
  const contents = [
    conteudo({
      id: 'com-redes',
      status: 'Postado',
      publishDate: null,
      plataformas: [
        publicacao({
          id: 'ig',
          contentId: 'com-redes',
          platformId: INSTAGRAM,
          status: 'publicada',
          realizadaManualEm: '2026-10-11T15:00:00.000Z',
        }),
        publicacao({
          id: 'tt',
          contentId: 'com-redes',
          platformId: TIKTOK,
          status: 'publicada',
          realizadaManualEm: '2026-10-10T15:00:00.000Z',
        }),
        publicacao({
          id: 'repost-1',
          contentId: 'com-redes',
          platformId: INSTAGRAM,
          publicationKind: 'repost',
          publishDate: '2026-10-20',
        }),
      ],
    }),
    conteudo({
      id: 'agendado',
      publishDate: null,
      plataformas: [
        publicacao({ id: 'tt-2', contentId: 'agendado', platformId: TIKTOK, publishDate: '2026-10-16', publishTime: '19:00:00' }),
      ],
    }),
  ];
  const itens = buildPublishCalendarItems({
    contents,
    platforms,
    series,
    redeReferenciaId: null,
    platformFilter: 'todas',
  });
  assert.deepEqual(
    itens.map(item => ({ id: item.id, date: item.date, posted: item.posted, redes: item.platformNames })),
    [
      { id: 'com-redes:original', date: '2026-10-10', posted: true, redes: ['Instagram', 'TikTok'] },
      { id: 'com-redes:ciclo:2', date: '2026-10-20', posted: false, redes: ['Instagram'] },
      { id: 'agendado:original', date: '2026-10-16', posted: false, redes: ['TikTok'] },
    ],
  );
  assert.equal(itens[2]?.time, '19:00');
}

function testPublicadoEmDiaDiferenteDoPlanejadoUsaODiaReal() {
  const content = conteudo({
    id: 'mudou-de-dia',
    status: 'Postado',
    publishDate: '2026-10-09',
    plataformas: [
      publicacao({
        id: 'ig',
        contentId: 'mudou-de-dia',
        platformId: INSTAGRAM,
        publishDate: '2026-10-09',
        status: 'publicada',
        realizadaManualEm: '2026-10-11T15:00:00.000Z',
      }),
    ],
  });
  const itens = buildPublishCalendarItems({
    contents: [content],
    platforms,
    series,
    redeReferenciaId: INSTAGRAM,
    platformFilter: 'todas',
  });
  assert.equal(itens[0]?.date, '2026-10-11');
  assert.notEqual(itens[0]?.date, content.publishDate);
}

function testMesmoConteudoCaiNoMesmoDiaNaGradeENoCalendario() {
  const content = conteudo({
    id: 'consistente',
    status: 'Postado',
    publishDate: '2026-10-09',
    plataformas: [
      publicacao({
        id: 'ig',
        contentId: 'consistente',
        platformId: INSTAGRAM,
        publishDate: '2026-10-09',
        status: 'publicada',
        realizadaManualEm: '2026-10-11T15:00:00.000Z',
      }),
    ],
  });
  const [gradeEntry] = buildGradeEntries({
    contents: [content],
    series,
    settings: { redeReferenciaId: INSTAGRAM },
    platforms,
  });
  const [calendarItem] = buildPublishCalendarItems({
    contents: [content],
    platforms,
    series,
    redeReferenciaId: INSTAGRAM,
    platformFilter: 'todas',
  });
  assert.ok(gradeEntry);
  assert.ok(calendarItem);
  assert.equal(gradeEntry.data, calendarItem.date);
  assert.equal(gradeEntry.hora, calendarItem.time);
}

testSemanaMostraInstagramNaGradeETikTokComoExtra();
testRepostEntraNaGradeComDataPropria();
testPublicacaoMarcadaComoPostadaApareceComoPostado();
testRoteiroPostadoSemMarcaNaRedeApareceComoPostado();
testPostadoFicaNoDiaEmQueFoiAoAr();
testPostadoPeloStatusUsaDataPlanejadaAntesDaMudanca();
testSemRedeDeReferenciaCadaRoteiroAparece();
testPublicadoEmDiaDiferenteDoPlanejadoUsaODiaReal();
testMesmoConteudoCaiNoMesmoDiaNaGradeENoCalendario();
console.log('publishCalendarItems tests passed');