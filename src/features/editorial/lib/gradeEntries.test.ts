import assert from 'node:assert/strict';
import type { ContentPlataforma } from '../../../lib/database.ts';
import { buildGradeEntries, type GradeContent, type GradeSerie } from './gradeEntries.ts';

const INSTAGRAM = 'plat-instagram';
const TIKTOK = 'plat-tiktok';

const series: GradeSerie[] = [{ id: 'serie-1', funcaoPadrao: 'converter' }];
const settings = { redeReferenciaId: INSTAGRAM };

function conteudo(partial: Partial<GradeContent> & Pick<GradeContent, 'id'>): GradeContent {
  return {
    status: 'Produção',
    seriesId: 'serie-1',
    pilarId: 'pilar-1',
    funcao: null,
    funcaoOrigem: 'herdada',
    classificacaoCongeladaEm: null,
    contaNaGrade: true,
    publishDate: '2026-10-01',
    publishTime: '09:00',
    postedAt: null,
    deletedAt: null,
    archivedAt: null,
    plataformas: [],
    ...partial,
  };
}

function publicacao(
  partial: Partial<ContentPlataforma> & Pick<ContentPlataforma, 'id' | 'platformId'>,
): ContentPlataforma {
  return {
    contentId: 'c1',
    legenda: '',
    hashtags: '',
    publishDate: null,
    publishTime: null,
    publicationKind: 'post',
    status: 'agendada',
    realizadaManualEm: null,
    realizadaApiEm: null,
    contaNaGrade: true,
    ...partial,
  };
}

function testOriginalNaRedeDeReferencia() {
  const entries = buildGradeEntries({
    series,
    settings,
    contents: [
      conteudo({
        id: 'original',
        plataformas: [
          publicacao({
            id: 'ig',
            contentId: 'original',
            platformId: INSTAGRAM,
            publishDate: '2026-10-03',
            publishTime: '18:30:00',
            status: 'publicada',
            realizadaManualEm: '2026-10-03T21:30:00.000Z',
          }),
          publicacao({
            id: 'tt',
            contentId: 'original',
            platformId: TIKTOK,
            publishDate: '2026-10-04',
            publishTime: '19:00',
          }),
        ],
      }),
      conteudo({
        id: 'sem-data-na-rede',
        publishDate: '2026-10-02',
        publishTime: '09:15',
        plataformas: [
          publicacao({
            id: 'ig-sem-data',
            contentId: 'sem-data-na-rede',
            platformId: INSTAGRAM,
            publishDate: null,
          }),
        ],
      }),
    ],
  });

  assert.equal(entries.length, 2);

  const original = entries.find(entry => entry.id === 'original:original');
  assert.ok(original);
  assert.equal(original.tipo, 'original');
  assert.equal(original.contentId, 'original');
  assert.equal(original.data, '2026-10-03');
  assert.equal(original.hora, '18:30');
  assert.equal(original.pilarId, 'pilar-1');
  assert.equal(original.serieId, 'serie-1');
  assert.equal(original.funcao, 'converter');
  assert.equal(original.contaNaGrade, true);
  assert.equal(original.realizada, true);
  assert.equal(original.realizadaEm, '2026-10-03T21:30:00.000Z');
  assert.equal(entries.some(entry => entry.data === '2026-10-04'), false);

  const semData = entries.find(entry => entry.contentId === 'sem-data-na-rede');
  assert.ok(semData);
  assert.equal(semData.tipo, 'original');
  assert.equal(semData.data, '2026-10-02');
  assert.equal(semData.hora, '09:15');
  assert.equal(semData.realizada, false);
  assert.equal(semData.realizadaEm, null);
}

function testExtraSoNoTikTok() {
  const entries = buildGradeEntries({
    series,
    settings,
    contents: [
      conteudo({
        id: 'extra',
        status: 'Postado',
        postedAt: '2026-10-05T12:00:00.000Z',
        publishDate: '2026-10-05',
        plataformas: [
          publicacao({
            id: 'tt',
            contentId: 'extra',
            platformId: TIKTOK,
            publishDate: '2026-10-05',
            status: 'publicada',
            realizadaManualEm: '2026-10-05T12:00:00.000Z',
          }),
        ],
      }),
      conteudo({
        id: 'na-grade',
        plataformas: [
          publicacao({
            id: 'ig',
            contentId: 'na-grade',
            platformId: INSTAGRAM,
            publishDate: '2026-10-06',
          }),
        ],
      }),
    ],
  });

  assert.deepEqual(entries.map(entry => entry.contentId), ['na-grade']);
  assert.equal(entries[0]?.data, '2026-10-06');
}

function testRepostComDataPropria() {
  const entries = buildGradeEntries({
    series,
    settings,
    contents: [
      conteudo({
        id: 'com-repost',
        funcao: 'atrair',
        funcaoOrigem: 'escolhida',
        plataformas: [
          publicacao({
            id: 'ig',
            contentId: 'com-repost',
            platformId: INSTAGRAM,
            publishDate: '2026-10-03',
            publishTime: '18:00',
            status: 'publicada',
            realizadaManualEm: '2026-10-03T18:00:00.000Z',
          }),
          publicacao({
            id: 'ig-repost',
            contentId: 'com-repost',
            platformId: INSTAGRAM,
            publicationKind: 'repost',
            publishDate: '2026-10-10',
            publishTime: '11:45:00',
            status: 'publicada',
            realizadaManualEm: '2026-10-10T14:45:00.000Z',
          }),
          publicacao({
            id: 'tt-repost',
            contentId: 'com-repost',
            platformId: TIKTOK,
            publicationKind: 'repost',
            publishDate: '2026-10-11',
            status: 'publicada',
          }),
        ],
      }),
    ],
  });

  assert.equal(entries.length, 2);
  const original = entries.find(entry => entry.tipo === 'original');
  const repost = entries.find(entry => entry.tipo === 'repost');
  assert.ok(original);
  assert.ok(repost);
  assert.equal(original.data, '2026-10-03');
  assert.equal(original.funcao, 'atrair');
  assert.equal(repost.id, 'com-repost:repost:ig-repost');
  assert.equal(repost.contentId, 'com-repost');
  assert.equal(repost.data, '2026-10-10');
  assert.equal(repost.hora, '11:45');
  assert.equal(repost.pilarId, original.pilarId);
  assert.equal(repost.serieId, original.serieId);
  assert.equal(repost.funcao, original.funcao);
  assert.equal(repost.realizada, true);
  assert.equal(repost.realizadaEm, '2026-10-10T14:45:00.000Z');
  assert.equal(entries.some(entry => entry.data === '2026-10-11'), false);
}

function testLegadoSemPublicacoes() {
  const entries = buildGradeEntries({
    series,
    settings,
    contents: [
      conteudo({
        id: 'legado',
        status: 'Postado',
        publishDate: '2026-09-12',
        publishTime: '08:00:00',
        postedAt: '2026-09-12T11:00:00.000Z',
        plataformas: [],
      }),
      conteudo({
        id: 'legado-aberto',
        status: 'Roteiro',
        publishDate: '2026-10-20',
        publishTime: null,
        plataformas: [],
      }),
    ],
  });

  assert.equal(entries.length, 2);
  const legado = entries.find(entry => entry.contentId === 'legado');
  const aberto = entries.find(entry => entry.contentId === 'legado-aberto');
  assert.ok(legado);
  assert.ok(aberto);
  assert.equal(legado.tipo, 'original');
  assert.equal(legado.data, '2026-09-12');
  assert.equal(legado.hora, '08:00');
  assert.equal(legado.funcao, 'converter');
  assert.equal(legado.realizada, true);
  assert.equal(legado.realizadaEm, '2026-09-12T11:00:00.000Z');
  assert.equal(aberto.data, '2026-10-20');
  assert.equal(aberto.hora, null);
  assert.equal(aberto.realizada, false);
  assert.equal(aberto.realizadaEm, null);
}

function testExcluidoEArquivadoFicamFora() {
  const entries = buildGradeEntries({
    series,
    settings,
    contents: [
      conteudo({
        id: 'apagado',
        status: 'Postado',
        deletedAt: '2026-10-01T00:00:00.000Z',
        plataformas: [
          publicacao({
            id: 'ig',
            contentId: 'apagado',
            platformId: INSTAGRAM,
            publishDate: '2026-10-01',
            status: 'publicada',
          }),
        ],
      }),
      conteudo({
        id: 'arquivado',
        archivedAt: '2026-10-02T00:00:00.000Z',
        publishDate: '2026-10-02',
        plataformas: [],
      }),
      conteudo({
        id: 'ativo',
        plataformas: [
          publicacao({
            id: 'ig',
            contentId: 'ativo',
            platformId: INSTAGRAM,
            publishDate: '2026-10-07',
          }),
        ],
      }),
    ],
  });

  assert.deepEqual(entries.map(entry => entry.contentId), ['ativo']);
}

testOriginalNaRedeDeReferencia();
testExtraSoNoTikTok();
testRepostComDataPropria();
testLegadoSemPublicacoes();
testExcluidoEArquivadoFicamFora();

console.log('gradeEntries tests passed');
