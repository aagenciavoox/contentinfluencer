import assert from 'node:assert/strict';
import type { Content, Pilar, Platform } from '../lib/database.ts';
import { diffViolations, previewScheduleViolations, validateWeeklyContent } from './pilarRhythm.ts';

function buildContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'content-1',
    userId: 'user-1',
    title: 'Conteudo teste',
    status: 'Ideia',
    slotType: null,
    seriesId: null,
    pilarId: 'pilar-1',
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

function buildPilar(overrides: Partial<Pilar> = {}): Pilar {
  return {
    id: 'pilar-1',
    userId: 'user-1',
    nome: 'Literatura',
    descricao: '',
    cor: '#6366f1',
    ativo: true,
    frequenciaSemanal: 2,
    metaCiclo: 8,
    createdAt: '2026-04-27T00:00:00.000Z',
    updatedAt: '2026-04-27T00:00:00.000Z',
    plataformas: [],
    ...overrides,
  };
}

const platforms: Platform[] = [{
  id: 'platform-ig',
  userId: 'user-1',
  nome: 'Instagram',
  ativo: true,
  createdAt: '2026-04-27T00:00:00.000Z',
}];

function testWeeklyFrequencyExceeded() {
  const pilar = buildPilar({ frequenciaSemanal: 1 });
  const contents = [
    buildContent({ id: 'c1', publishDate: '2026-04-27' }),
    buildContent({ id: 'c2', publishDate: '2026-04-28' }),
  ];

  const violations = validateWeeklyContent(contents, new Date('2026-04-27'), [pilar], platforms);

  assert.equal(violations.length, 1);
  assert.equal(violations[0]?.ruleId, 'pilar-pilar-1-frequency');
  assert.equal(violations[0]?.type, 'warning');
}

function testHashtagTemplateLimit() {
  const pilar = buildPilar({
    plataformas: [{
      pilarId: 'pilar-1',
      platformId: 'Instagram',
      hashtags: '#um #dois #tres',
      melhoresDias: [],
      janelaHorarioInicio: null,
      janelaHorarioFim: null,
    }],
  });
  const content = buildContent({
    plataformas: [{
      id: 'cp-1',
      contentId: 'content-1',
      platformId: 'Instagram',
      legenda: '#a #b #c #d #e',
      hashtags: '',
      publishDate: '2026-04-27',
    }],
  });

  const violations = validateWeeklyContent([content], new Date('2026-04-27'), [pilar], platforms);

  assert.equal(violations.length, 1);
  assert.equal(violations[0]?.ruleId, 'pilar-pilar-1-hashtags-Instagram');
  assert.equal(violations[0]?.type, 'info');
}

function testPreviewScheduleViolationsFrequency() {
  const weekDay = '2026-04-27';
  const pilar = buildPilar({ frequenciaSemanal: 1 });
  const scheduled = [buildContent({ id: 'c1', publishDate: '2026-04-27' })];
  const unscheduled = buildContent({ id: 'c2', publishDate: null, status: 'Produção' });

  const before = validateWeeklyContent(scheduled, new Date(weekDay), [pilar], platforms);
  assert.equal(before.length, 0);

  const after = previewScheduleViolations(
    [...scheduled, {
      ...unscheduled,
      publishDate: '2026-04-29T12:00:00.000Z',
      publishDateEnabled: true,
      status: 'Produção',
    }],
    '2026-04-29',
    [pilar],
    platforms,
  );
  assert.equal(after.length, 1);
  assert.equal(after[0]?.type, 'warning');
}

function testDiffViolationsIgnoresExisting() {
  const existing = [{
    ruleId: 'pilar-1-frequency',
    type: 'warning' as const,
    message: 'Regra existente',
    affectedContentIds: ['c1'],
  }];
  const after = [...existing, {
    ruleId: 'pilar-2-day-Instagram',
    type: 'info' as const,
    message: 'Nova regra',
    affectedContentIds: ['c2'],
  }];
  const diff = diffViolations(existing, after);
  assert.equal(diff.length, 1);
  assert.equal(diff[0]?.ruleId, 'pilar-2-day-Instagram');
}

const tests: Array<[string, () => void]> = [
  ['warns when weekly posts exceed pilar frequenciaSemanal', testWeeklyFrequencyExceeded],
  ['warns when legenda hashtags exceed pilar template', testHashtagTemplateLimit],
  ['previewScheduleViolations detects frequency when scheduling second item', testPreviewScheduleViolationsFrequency],
  ['diffViolations returns only newly introduced violations', testDiffViolationsIgnoresExisting],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
