import assert from 'node:assert/strict';
import type { Content, GoldenRule } from '../lib/database.ts';
import { diffViolations, previewScheduleViolations, validateWeeklyContent, type Violation } from './goldenRules.ts';

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

function testPreviewScheduleViolationsPubliMax() {
  const weekDay = '2026-04-27';
  const weekStart = new Date(weekDay);
  const rules: GoldenRule[] = [{
    id: 'RG-PUBLI',
    userId: 'user-1',
    titulo: 'Maximo de publicacoes',
    descricao: 'Limite semanal',
    tipo: 'publi',
    valor: 0,
    periodo: 'semana',
    condicao: 'impedir',
    minimo: null,
    maximo: 2,
    ativa: true,
    createdAt: '2026-04-27T00:00:00.000Z',
  }];

  const scheduled = [
    buildContent({ id: 'c1', publishDate: '2026-04-27T12:00:00.000Z' }),
    buildContent({ id: 'c2', publishDate: '2026-04-28T12:00:00.000Z' }),
  ];
  const unscheduled = buildContent({ id: 'c3', publishDate: null, status: 'Produção' });

  const before = validateWeeklyContent(scheduled, weekStart, undefined, rules);
  assert.equal(before.length, 0);

  const after = previewScheduleViolations([...scheduled, {
    ...unscheduled,
    publishDate: '2026-04-29T12:00:00.000Z',
    publishDateEnabled: true,
    status: 'Produção',
  }], '2026-04-29', rules);
  assert.equal(after.length, 1);
  assert.equal(after[0]?.type, 'warning');

  const newOnes = diffViolations(before, after);
  assert.equal(newOnes.length, 1);
  assert.equal(newOnes[0]?.ruleId, 'RG-PUBLI');
}

function testDiffViolationsIgnoresExisting() {
  const existing: Violation[] = [{
    ruleId: 'RG-01',
    type: 'warning',
    message: 'Regra existente',
    affectedContentIds: ['c1'],
  }];
  const after: Violation[] = [...existing, {
    ruleId: 'RG-02',
    type: 'info',
    message: 'Nova regra',
    affectedContentIds: ['c2'],
  }];
  const diff = diffViolations(existing, after);
  assert.equal(diff.length, 1);
  assert.equal(diff[0]?.ruleId, 'RG-02');
}

const tests: Array<[string, () => void]> = [
  ['reports RG-06 when YouTube hashtags fall outside the recommended range', testYoutubeHashtagRange],
  ['reports RG-05 only for in-week platform captions with more than five hashtags', testInWeekPlatformCaptionsOnly],
  ['previewScheduleViolations detects publi max when scheduling third item in week', testPreviewScheduleViolationsPubliMax],
  ['diffViolations returns only newly introduced violations', testDiffViolationsIgnoresExisting],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
