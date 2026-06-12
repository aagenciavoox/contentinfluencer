import assert from 'node:assert/strict';
import type { Content, GoldenRule } from '../lib/database.ts';
import { validateWeeklyContent } from './goldenRules.ts';

function buildContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'content-1',
    userId: 'user-1',
    title: 'Conteudo teste',
    status: 'Ideia',
    slotType: null,
    seriesId: null,
    pilarId: null,
    lookId: null,
    cenarioId: null,
    bibliotecaItemId: null,
    formatoVisual: null,
    energiaNecessaria: null,
    publishDate: '2026-04-27',
    recordingDate: null,
    link: null,
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-04-27T00:00:00.000Z',
    updatedAt: '2026-04-27T00:00:00.000Z',
    deletedAt: null,
    plataformas: [],
    ...overrides,
  };
}

function testYoutubeHashtagRange() {
  const content = buildContent({
    id: 'youtube-content',
    title: 'Video principal',
    plataformas: [
      {
        id: 'cp-1',
        contentId: 'youtube-content',
        platformId: 'YouTube',
        legenda: '#one #two #three',
        hashtags: '',
        publishDate: '2026-04-27',
      },
    ],
  });

  const rules: GoldenRule[] = [{
    id: 'RG-06',
    userId: 'user-1',
    titulo: 'Faixa de hashtags YouTube',
    descricao: 'Hashtags por legenda',
    tipo: 'plataforma',
    valor: 0,
    periodo: 'semana',
    condicao: 'impedir',
    minimo: 5,
    maximo: 7,
    ativa: true,
    createdAt: '2026-04-27T00:00:00.000Z',
  }];

  const violations = validateWeeklyContent([content], new Date('2026-04-27'), undefined, rules);

  assert.deepEqual(violations.map(v => v.ruleId), ['RG-06']);
  assert.equal(violations[0]?.type, 'warning');
  assert.equal(violations[0]?.affectedContentIds[0], 'youtube-content');
}

function testInWeekPlatformCaptionsOnly() {
  const instagramContent = buildContent({
    id: 'instagram-content',
    title: 'Post da semana',
    plataformas: [
      {
        id: 'cp-2',
        contentId: 'instagram-content',
        platformId: 'Instagram',
        legenda: '#a #b #c #d #e #f',
        hashtags: '',
        publishDate: '2026-04-28',
      },
      {
        id: 'cp-3',
        contentId: 'instagram-content',
        platformId: 'YouTube',
        legenda: '#a #b #c #d #e #f #g #h',
        hashtags: '',
        publishDate: '2026-04-28',
      },
    ],
  });
  const nextWeekContent = buildContent({
    id: 'next-week-content',
    publishDate: '2026-05-05',
    plataformas: [
      {
        id: 'cp-4',
        contentId: 'next-week-content',
        platformId: 'Instagram',
        legenda: '#a #b #c #d #e #f #g',
        hashtags: '',
        publishDate: '2026-05-05',
      },
    ],
  });

  const rules: GoldenRule[] = [{
    id: 'RG-05',
    userId: 'user-1',
    titulo: 'Limite de hashtags',
    descricao: 'Hashtags por legenda',
    tipo: 'plataforma',
    valor: 0,
    periodo: 'semana',
    condicao: 'impedir',
    minimo: null,
    maximo: 5,
    ativa: true,
    createdAt: '2026-04-27T00:00:00.000Z',
  }];

  const violations = validateWeeklyContent(
    [instagramContent, nextWeekContent],
    new Date('2026-04-27'),
    undefined,
    rules,
  );

  assert.equal(violations.length, 2);
  assert.ok(violations.every((violation) => violation.ruleId === 'RG-05'));
  assert.ok(violations.every((violation) => violation.affectedContentIds[0] === 'instagram-content'));
}

const tests: Array<[string, () => void]> = [
  ['reports RG-06 when YouTube hashtags fall outside the recommended range', testYoutubeHashtagRange],
  ['reports RG-05 only for in-week platform captions with more than five hashtags', testInWeekPlatformCaptionsOnly],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
