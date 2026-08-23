import assert from 'node:assert/strict';
import { subDays } from 'date-fns';
import type { Content, Pilar, Serie } from '../../lib/database.ts';
import { CONTENT_STATUS } from '../contents/lib/contentPipeline.ts';
import { recommendDailyAction } from './recommendDailyAction.ts';
import { computeSerieMetrics } from './computeSerieMetrics.ts';
import { rankSeriesForPilar } from './rankSeriesForPilar.ts';

const NOW = new Date('2026-07-05T12:00:00.000Z');

function createPilar(overrides: Partial<Pilar> = {}): Pilar {
  return {
    id: 'pilar-1',
    userId: 'user-1',
    nome: 'Humor',
    descricao: '',
    cor: '#ff0000',
    ativo: true,
    frequenciaSemanal: 2,
    metaCiclo: 4,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    plataformas: [],
    ...overrides,
  };
}

function createSerie(overrides: Partial<Serie> = {}): Serie {
  return {
    id: 'serie-1',
    userId: 'user-1',
    name: 'Destrinchando',
    template: '',
    notes: '',
    slotPadrao: null,
    formatoVisualPadrao: null,
    estruturaRoteiro: null,
    bordao: null,
    cor: '#6366f1',
    ativa: true,
    frequenciaRecomendada: 'Semanal',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    pilarIds: ['pilar-1'],
    plataformas: [],
    ...overrides,
  };
}

function createContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'content-1',
    userId: 'user-1',
    title: 'Titulo',
    status: CONTENT_STATUS.PRODUCAO,
    slotType: null,
    seriesId: 'serie-1',
    pilarId: 'pilar-1',
    cenarioId: null,
    lookId: null,
    formatoVisual: null,
    script: 'Roteiro pronto',
    scriptNotes: [],
    tags: [],
    notes: '',
    referencias: '',
    link: '',
    energiaNecessaria: null,
    publishDate: null,
    publishTime: null,
    publishDateEnabled: false,
    recordingDate: null,
    recordingDateEnabled: false,
    recordedAt: NOW.toISOString(),
    postedAt: null,
    bibliotecaItemId: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    deletedAt: null,
    plataformas: [],
    ...overrides,
  };
}

{
  const recommendation = recommendDailyAction({
    pilares: [createPilar()],
    series: [createSerie()],
    contents: [
      createContent({ id: 'postable-1' }),
      createContent({ id: 'postable-2', seriesId: 'serie-1' }),
    ],
    now: NOW,
  });

  assert.equal(recommendation?.kind, 'post');
  assert.equal(recommendation?.serie?.id, 'serie-1');
  assert.equal(recommendation?.serie?.gravadosProntos, 2);
}

{
  const recommendation = recommendDailyAction({
    pilares: [createPilar()],
    series: [createSerie()],
    contents: [
      createContent({
        id: 'script-1',
        status: CONTENT_STATUS.ROTEIRO,
        recordedAt: null,
      }),
      createContent({
        id: 'script-2',
        status: CONTENT_STATUS.ROTEIRO,
        recordedAt: null,
        seriesId: 'serie-1',
      }),
    ],
    now: NOW,
  });

  assert.equal(recommendation?.kind, 'record');
  assert.equal(recommendation?.serie?.roteirosEscritos, 2);
}

{
  const inactiveSerie = createSerie({ id: 'serie-inactive', ativa: false, name: 'Inativa' });
  const activeSerie = createSerie({ id: 'serie-active', name: 'Ativa' });
  const metrics = new Map([
    [
      inactiveSerie.id,
      computeSerieMetrics(inactiveSerie, [
        createContent({ id: 'inactive-stock', seriesId: inactiveSerie.id }),
      ], NOW),
    ],
    [
      activeSerie.id,
      computeSerieMetrics(activeSerie, [
        createContent({ id: 'active-stock', seriesId: activeSerie.id }),
      ], NOW),
    ],
  ]);

  const ranked = rankSeriesForPilar('pilar-1', [inactiveSerie, activeSerie], metrics);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0]?.serie.id, 'serie-active');
}

{
  const recentSerie = createSerie({
    id: 'serie-recent',
    name: 'Recente',
    pilarIds: ['pilar-1'],
  });
  const olderSerie = createSerie({
    id: 'serie-older',
    name: 'Antiga',
    pilarIds: ['pilar-1'],
  });

  const recommendation = recommendDailyAction({
    pilares: [createPilar({ metaCiclo: 3 })],
    series: [recentSerie, olderSerie],
    contents: [
      createContent({
        id: 'recent-postable',
        seriesId: recentSerie.id,
        postedAt: subDays(NOW, 3).toISOString(),
        status: CONTENT_STATUS.POSTADO,
      }),
      createContent({
        id: 'older-postable',
        seriesId: olderSerie.id,
      }),
      createContent({
        id: 'older-postable-2',
        seriesId: olderSerie.id,
      }),
    ],
    now: NOW,
  });

  assert.equal(recommendation?.kind, 'post');
  assert.equal(recommendation?.serie?.id, 'serie-older');
}

{
  const recommendation = recommendDailyAction({
    pilares: [createPilar({ metaCiclo: null })],
    series: [createSerie()],
    contents: [],
    now: NOW,
  });

  assert.equal(recommendation?.kind, 'configure_meta');
}

{
  const metrics = computeSerieMetrics(
    createSerie(),
    [
      createContent({
        id: 'old-published',
        status: CONTENT_STATUS.POSTADO,
        postedAt: subDays(NOW, 29).toISOString(),
      }),
      createContent({
        id: 'recent-published',
        status: CONTENT_STATUS.POSTADO,
        postedAt: subDays(NOW, 10).toISOString(),
      }),
    ],
    NOW,
  );

  assert.equal(metrics.publicadosNoCiclo, 1);
}

console.log('recommendDailyAction.test.ts passed');
