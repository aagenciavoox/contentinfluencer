import assert from 'node:assert/strict';
import {parseISO, startOfWeek} from 'date-fns';
import type { Content, Pilar, Platform, PostingTimeEntry, Serie } from '../lib/database.ts';
import { buildWeekRhythmQuotas, dayRhythmTone, diffViolations, formatRhythmSlot, previewScheduleViolations, summarizeRhythmProgress, validateWeeklyContent } from './pilarRhythm.ts';

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
    funcao: null,
    funcaoOrigem: null,
    classificacaoCongeladaEm: null,
    contaNaGrade: true,
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

function buildSerie(overrides: Partial<Serie> = {}): Serie {
  return {
    id: 'serie-1',
    userId: 'user-1',
    name: 'A Ciencia Explica',
    template: '',
    notes: '',
    slotPadrao: null,
    formatoVisualPadrao: null,
    estruturaRoteiro: null,
    bordao: null,
    cor: null,
    capaUrl: null,
    ativa: true,
    frequenciaRecomendada: 'Semanal',
    funcaoPadrao: null,
    energiaPadrao: null,
    createdAt: '2026-04-27T00:00:00.000Z',
    updatedAt: '2026-04-27T00:00:00.000Z',
    pilarIds: ['pilar-1'],
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

function testWeeklyFrequencyUnderTarget() {
  const pilar = buildPilar({ frequenciaSemanal: 2 });
  const contents = [buildContent({ id: 'c1', publishDate: '2026-04-27' })];

  const violations = validateWeeklyContent(contents, new Date('2026-04-27'), [pilar], platforms);

  const under = violations.find(item => item.ruleId === 'pilar-pilar-1-under-frequency');
  assert.ok(under);
  assert.equal(under?.type, 'deficit');
  assert.match(under?.message ?? '', /1 de 2 posts/);
}

function testSerieSemanalWithoutPost() {
  const serie = buildSerie({ frequenciaRecomendada: 'Semanal' });
  const violations = validateWeeklyContent([], new Date('2026-04-27'), [], platforms, [serie]);

  const under = violations.find(item => item.ruleId === 'serie-serie-1-under-frequency');
  assert.ok(under);
  assert.equal(under?.type, 'deficit');
}

function testSerieQuinzenalWithRecentPost() {
  const serie = buildSerie({ frequenciaRecomendada: 'Quinzenal' });
  // Week Mon 2026-04-27 .. Sun 2026-05-03. Post 10 days before week end (2026-05-03) => 2026-04-23
  const contents = [
    buildContent({
      id: 'c1',
      seriesId: 'serie-1',
      pilarId: null,
      publishDate: '2026-04-23',
    }),
  ];

  const violations = validateWeeklyContent(contents, new Date('2026-04-27'), [], platforms, [serie]);
  assert.equal(
    violations.filter(item => item.ruleId.startsWith('serie-serie-1')).length,
    0,
  );
}

function testSerieQuinzenalWithoutRecentPost() {
  const serie = buildSerie({ frequenciaRecomendada: 'Quinzenal' });
  // Post older than 14 days before week end
  const contents = [
    buildContent({
      id: 'c1',
      seriesId: 'serie-1',
      pilarId: null,
      publishDate: '2026-04-10',
    }),
  ];

  const violations = validateWeeklyContent(contents, new Date('2026-04-27'), [], platforms, [serie]);
  const under = violations.find(item => item.ruleId === 'serie-serie-1-under-frequency');
  assert.ok(under);
  assert.equal(under?.type, 'deficit');
}

function testNeedsScriptsWhenBacklogInsufficient() {
  const pilar = buildPilar({ frequenciaSemanal: 2 });
  const contents = [
    buildContent({
      id: 'script-1',
      publishDate: null,
      status: 'Roteiro',
      title: 'Roteiro pronto',
      script: '<p>Texto do roteiro</p>',
    }),
  ];

  const violations = validateWeeklyContent(contents, new Date('2026-04-27'), [pilar], platforms);
  const needs = violations.find(item => item.ruleId === 'pilar-pilar-1-needs-scripts');
  assert.ok(needs);
  assert.equal(needs?.type, 'deficit');
  assert.match(needs?.message ?? '', /Mais 1 cobriria o ciclo/);
}

function testHashtagTemplateLimit() {
  const pilar = buildPilar({
    frequenciaSemanal: 1,
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

  const hashtag = violations.find(item => item.ruleId === 'pilar-pilar-1-hashtags-Instagram');
  assert.ok(hashtag);
  assert.equal(hashtag?.type, 'info');
}

function testPreviewScheduleViolationsFrequency() {
  const weekDay = '2026-04-27';
  const pilar = buildPilar({ frequenciaSemanal: 1 });
  const scheduled = [buildContent({ id: 'c1', publishDate: '2026-04-27' })];
  const unscheduled = buildContent({ id: 'c2', publishDate: null, status: 'Produção' });

  const before = validateWeeklyContent(scheduled, new Date(weekDay), [pilar], platforms);
  assert.equal(before.filter(item => item.type === 'warning').length, 0);

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
  assert.equal(after.filter(item => item.type === 'warning').length, 1);
  assert.equal(after.find(item => item.type === 'warning')?.type, 'warning');
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

function testSchedulingIntoDeficitDoesNotIntroduceWarning() {
  const pilar = buildPilar({ frequenciaSemanal: 2 });
  const backlog = buildContent({
    id: 'c2',
    publishDate: null,
    status: 'Roteiro',
    title: 'Segundo',
    script: '<p>Roteiro completo</p>',
  });
  const scheduled = [buildContent({ id: 'c1', publishDate: '2026-04-27' })];

  const before = validateWeeklyContent(scheduled, new Date('2026-04-27'), [pilar], platforms);
  assert.ok(before.some(item => item.type === 'deficit'));

  const after = previewScheduleViolations(
    [...scheduled, { ...backlog, publishDate: '2026-04-28' }],
    '2026-04-28',
    [pilar],
    platforms,
  );
  const introduced = diffViolations(before, after).filter(item => item.type === 'warning');
  assert.equal(introduced.length, 0);
}

function testDayRhythmToneMarksOverAndOpenDays() {
  const over = dayRhythmTone(['c1'], [{
    ruleId: 'pilar-1-frequency',
    type: 'warning',
    message: 'acima',
    affectedContentIds: ['c1'],
  }]);
  assert.equal(over, 'over');

  const open = dayRhythmTone([], [{
    ruleId: 'pilar-1-under-frequency',
    type: 'deficit',
    message: 'Pilar: 0 de 1 posts nesta semana.',
    affectedContentIds: [],
  }]);
  assert.equal(open, 'open');

  const filledWhileShort = dayRhythmTone(['c2'], [{
    ruleId: 'pilar-1-under-frequency',
    type: 'deficit',
    message: 'Pilar: 0 de 1 posts nesta semana.',
    affectedContentIds: ['c2'],
  }]);
  assert.equal(filledWhileShort, null);
}

function weekOf(day: string): Date {
  return startOfWeek(parseISO(day), {weekStartsOn: 1});
}

function testWeekRhythmKeepsMetQuotaAndSuggestsPlatformTime() {
  const pilar = buildPilar({
    frequenciaSemanal: 2,
    plataformas: [{
      pilarId: 'pilar-1',
      platformId: 'platform-ig',
      hashtags: '',
      melhoresDias: [2],
      janelaHorarioInicio: '08:00',
      janelaHorarioFim: '21:00',
    }],
  });
  const entries: PostingTimeEntry[] = [
    {
      id: 'monday',
      userId: 'user-1',
      platformId: 'platform-ig',
      weekday: 1,
      time: '09:00',
      createdAt: '2026-04-27T00:00:00.000Z',
    },
    {
      id: 'tuesday',
      userId: 'user-1',
      platformId: 'platform-ig',
      weekday: 2,
      time: '18:00',
      createdAt: '2026-04-27T00:00:00.000Z',
    },
  ];
  const quotas = buildWeekRhythmQuotas({
    contents: [],
    weekStart: weekOf('2026-04-27'),
    pilares: [pilar],
    series: [],
    platforms,
    postingTimeEntries: entries,
  });
  assert.equal(quotas.length, 1);
  assert.equal(quotas[0]?.count, 0);
  assert.equal(quotas[0]?.target, 2);
  assert.equal(quotas[0]?.tone, 'deficit');
  assert.equal(quotas[0]?.suggestions.length, 1);
  assert.equal(formatRhythmSlot(quotas[0]!.suggestions[0]!), 'IG ter 18:00');
}

function testWeekRhythmSkipsOccupiedSlot() {
  const pilar = buildPilar({
    frequenciaSemanal: 2,
    plataformas: [{
      pilarId: 'pilar-1',
      platformId: 'platform-ig',
      hashtags: '',
      melhoresDias: [2, 4],
      janelaHorarioInicio: null,
      janelaHorarioFim: null,
    }],
  });
  const entries: PostingTimeEntry[] = [
    {
      id: 'tuesday',
      userId: 'user-1',
      platformId: 'platform-ig',
      weekday: 2,
      time: '18:00',
      createdAt: '2026-04-27T00:00:00.000Z',
    },
    {
      id: 'thursday',
      userId: 'user-1',
      platformId: 'platform-ig',
      weekday: 4,
      time: '12:00',
      createdAt: '2026-04-27T00:00:00.000Z',
    },
  ];
  const quotas = buildWeekRhythmQuotas({
    contents: [buildContent({id: 'c1', publishDate: '2026-04-28', publishTime: '18:00'})],
    weekStart: weekOf('2026-04-27'),
    pilares: [pilar],
    series: [],
    platforms,
    postingTimeEntries: entries,
  });
  assert.equal(quotas[0]?.suggestions.length, 1);
  assert.equal(formatRhythmSlot(quotas[0]!.suggestions[0]!), 'IG qui 12:00');
}

function testWeekRhythmUsesGlobalTimesInsidePilarWindow() {
  const pilar = buildPilar({
    frequenciaSemanal: 2,
    plataformas: [{
      pilarId: 'pilar-1',
      platformId: 'platform-ig',
      hashtags: '',
      melhoresDias: [2],
      janelaHorarioInicio: '08:00',
      janelaHorarioFim: '10:00',
    }],
  });
  const quotas = buildWeekRhythmQuotas({
    contents: [],
    weekStart: weekOf('2026-04-27'),
    pilares: [pilar],
    series: [],
    platforms,
    postingTimeEntries: [],
    fallbackTimes: {
      0: [],
      1: ['10:00'],
      2: ['08:00', '12:00', '21:00'],
      3: [],
      4: [],
      5: [],
      6: [],
    },
  });
  assert.equal(quotas[0]?.suggestions.length, 1);
  assert.equal(formatRhythmSlot(quotas[0]!.suggestions[0]!), 'IG ter 08:00');
}

function testWeekRhythmKeepsMetPilarWithoutSuggestion() {
  const pilar = buildPilar({frequenciaSemanal: 1});
  const quotas = buildWeekRhythmQuotas({
    contents: [buildContent({publishDate: '2026-04-27'})],
    weekStart: weekOf('2026-04-27'),
    pilares: [pilar],
    series: [],
    platforms,
    postingTimeEntries: [],
  });
  assert.equal(quotas[0]?.tone, 'met');
  assert.equal(quotas[0]?.suggestions.length, 0);
}

function testWeekRhythmShowsShortSeriesWindowOnly() {
  const due = buildSerie({id: 'serie-q', name: 'Quinzena', frequenciaRecomendada: 'Quinzenal', pilarIds: ['pilar-1']});
  const paid = buildSerie({id: 'serie-m', name: 'Mes', frequenciaRecomendada: 'Mensal', pilarIds: ['pilar-1']});
  const weekly = buildSerie({id: 'serie-s', name: 'Semana', frequenciaRecomendada: 'Semanal', pilarIds: ['pilar-1']});
  const contents = [
    buildContent({
      id: 'paid',
      seriesId: 'serie-m',
      pilarId: null,
      publishDate: '2026-04-23',
    }),
    buildContent({
      id: 'weekly-post',
      seriesId: 'serie-s',
      pilarId: null,
      publishDate: '2026-04-27',
    }),
  ];
  const quotas = buildWeekRhythmQuotas({
    contents,
    weekStart: weekOf('2026-04-27'),
    pilares: [buildPilar({frequenciaSemanal: null})],
    series: [due, paid, weekly],
    platforms,
    postingTimeEntries: [],
  });
  const labels = quotas.map(item => item.label);
  assert.ok(labels.includes('Quinzena'));
  assert.equal(quotas.find(item => item.label === 'Quinzena')?.windowTag, '14d');
  assert.equal(labels.includes('Mes'), false);
  assert.equal(quotas.find(item => item.label === 'Semana')?.tone, 'met');
}

function testSummarizeRhythmProgressUsesFractions() {
  const pilar = buildPilar({ nome: 'Foco na Identidade', frequenciaSemanal: 6 });
  const violations = validateWeeklyContent([], new Date('2026-04-27'), [pilar], platforms);
  const summary = summarizeRhythmProgress(violations);
  const bar = summary.progress.find(item => item.label === 'Foco na Identidade');
  assert.ok(bar);
  assert.equal(bar?.count, 0);
  assert.equal(bar?.target, 6);
  assert.equal(bar?.tone, 'deficit');
  assert.ok(summary.notes.some(note => note.label.includes('roteiro')));
}

const tests: Array<[string, () => void]> = [
  ['warns when weekly posts exceed pilar frequenciaSemanal', testWeeklyFrequencyExceeded],
  ['emits deficit when weekly posts are under pilar frequenciaSemanal', testWeeklyFrequencyUnderTarget],
  ['emits deficit when Semanal serie has no post this week', testSerieSemanalWithoutPost],
  ['does not deficit Quinzenal serie with post in last 14 days', testSerieQuinzenalWithRecentPost],
  ['emits deficit when Quinzenal serie has no post in last 14 days', testSerieQuinzenalWithoutRecentPost],
  ['emits needs-scripts when backlog cannot cover weekly deficit', testNeedsScriptsWhenBacklogInsufficient],
  ['warns when legenda hashtags exceed pilar template', testHashtagTemplateLimit],
  ['previewScheduleViolations detects frequency when scheduling second item', testPreviewScheduleViolationsFrequency],
  ['diffViolations returns only newly introduced violations', testDiffViolationsIgnoresExisting],
  ['scheduling into deficit does not introduce warning via diff', testSchedulingIntoDeficitDoesNotIntroduceWarning],
  ['dayRhythmTone marks over-target days and empty days while the week is short', testDayRhythmToneMarksOverAndOpenDays],
  ['summarizeRhythmProgress turns frequency deficits into count/target bars', testSummarizeRhythmProgressUsesFractions],
  ['week rhythm suggests the next free platform slot', testWeekRhythmKeepsMetQuotaAndSuggestsPlatformTime],
  ['week rhythm skips a time already used that day', testWeekRhythmSkipsOccupiedSlot],
  ['week rhythm keeps a met pilar without a time suggestion', testWeekRhythmKeepsMetPilarWithoutSuggestion],
  ['week rhythm crosses global times with the pilar window', testWeekRhythmUsesGlobalTimesInsidePilarWindow],
  ['week rhythm shows quinzenal only while the window is short', testWeekRhythmShowsShortSeriesWindowOnly],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}

console.log('pilarRhythm.test.ts passed');
