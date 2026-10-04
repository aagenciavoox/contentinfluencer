import assert from 'node:assert/strict';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {
  canPullContent,
  cancelPostItEdit,
  createEmptyPostIt,
  deletePostIt,
  postItTitle,
  postItTransformOptions,
  pullExistingContent,
  savePostItEdit,
  transformPostIt,
} from './postIt.ts';

const NOW = '2026-10-04T12:00:00.000Z';

function ideia(overrides: Parameters<typeof createContentDraft>[0] = {}) {
  return createContentDraft({
    id: 'ideia-1',
    title: 'Gancho existente',
    status: CONTENT_STATUS.IDEIA,
    publishDate: null,
    ...overrides,
  });
}

function roteiro(overrides: Parameters<typeof createContentDraft>[0] = {}) {
  return createContentDraft({
    id: 'roteiro-1',
    title: 'Roteiro existente',
    status: CONTENT_STATUS.ROTEIRO,
    publishDate: '2026-01-01T12:00:00.000Z',
    ...overrides,
  });
}

function testCreateEmptyPostIt() {
  const postIt = createEmptyPostIt({id: 'post-vazio', texto: '', date: null, now: NOW});
  assert.equal(postIt.contentId, null);
  assert.equal(postIt.texto, '');
  assert.equal(postIt.date, null);
  assert.equal(postIt.createdAt, NOW);
}

function testPullIdeiaDoesNotChangeStatusOrDate() {
  const content = ideia();
  const statusBefore = content.status;
  const dateBefore = content.publishDate;
  const result = pullExistingContent({
    postIts: [],
    content,
    date: '2026-10-12',
    id: 'post-ideia',
    now: NOW,
  });

  assert.equal(result.pulled, true);
  assert.equal(result.content, content);
  assert.equal(content.status, statusBefore);
  assert.equal(content.status, CONTENT_STATUS.IDEIA);
  assert.equal(content.publishDate, dateBefore);
  assert.equal(result.postIts.length, 1);
  assert.equal(result.postIts[0].contentId, content.id);
  assert.equal(result.postIts[0].date, '2026-10-12');
}

function testPullRoteiroDoesNotChangeStatusOrDate() {
  const content = roteiro();
  const statusBefore = content.status;
  const dateBefore = content.publishDate;
  const result = pullExistingContent({
    postIts: [],
    content,
    date: '2026-10-20',
    id: 'post-roteiro',
    now: NOW,
  });

  assert.equal(result.pulled, true);
  assert.equal(result.content, content);
  assert.equal(content.status, statusBefore);
  assert.equal(content.status, CONTENT_STATUS.ROTEIRO);
  assert.equal(content.publishDate, dateBefore);
  assert.equal(result.postIts[0].contentId, content.id);
  assert.equal(result.postIts[0].date, '2026-10-20');
}

function testPullRejectsPostedContent() {
  const content = createContentDraft({
    id: 'postado-1',
    title: 'Já foi',
    status: CONTENT_STATUS.POSTADO,
    publishDate: '2026-09-01T12:00:00.000Z',
  });
  const result = pullExistingContent({postIts: [], content, date: '2026-10-12', id: 'x'});
  assert.equal(canPullContent(content), false);
  assert.equal(result.pulled, false);
  assert.equal(result.postIts.length, 0);
  assert.equal(content.status, CONTENT_STATUS.POSTADO);
}

function testTransformEmptyIntoIdeiaKeepsDay() {
  const postIt = createEmptyPostIt({
    id: 'post-vazio',
    texto: 'gancho do vídeo',
    date: '2026-10-08',
    now: NOW,
  });
  const result = transformPostIt({postIt, contents: [], target: 'ideia', now: NOW});
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.mode, 'create');
  assert.equal(result.content.status, CONTENT_STATUS.IDEIA);
  assert.equal(result.content.title, 'gancho do vídeo');
  assert.equal(result.content.publishDate?.slice(0, 10), '2026-10-08');
  assert.equal(result.content.publishDateEnabled, true);
  assert.equal(result.openScript, false);
  assert.equal(result.removePostItId, postIt.id);
}

function testTransformEmptyIntoRoteiroKeepsDayAndOpensScript() {
  const postIt = createEmptyPostIt({
    id: 'post-vazio',
    texto: 'abrir no editor',
    date: '2026-10-18',
    now: NOW,
  });
  const result = transformPostIt({postIt, contents: [], target: 'roteiro', now: NOW});
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.mode, 'create');
  assert.equal(result.content.status, CONTENT_STATUS.ROTEIRO);
  assert.equal(result.content.publishDate?.slice(0, 10), '2026-10-18');
  assert.equal(result.openScript, true);
  assert.equal(result.removePostItId, postIt.id);
}

function testTransformPulledIdeiaIntoRoteiroKeepsPostItDay() {
  const content = ideia({publishDate: null});
  const pulled = pullExistingContent({
    postIts: [],
    content,
    date: '2026-11-02',
    id: 'post-ideia',
    now: NOW,
  });
  assert.equal(content.status, CONTENT_STATUS.IDEIA);
  assert.equal(content.publishDate, null);

  const result = transformPostIt({
    postIt: pulled.postIts[0],
    contents: [content],
    target: 'roteiro',
    now: NOW,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.mode, 'update');
  assert.equal(result.content.id, content.id);
  assert.equal(result.content.status, CONTENT_STATUS.ROTEIRO);
  assert.equal(result.content.publishDate?.slice(0, 10), '2026-11-02');
  assert.equal(result.openScript, false);
  assert.equal(content.status, CONTENT_STATUS.IDEIA);
  assert.equal(content.publishDate, null);
}

function testTransformPulledIdeiaIntoIdeiaKeepsStatusAndDay() {
  const content = ideia({publishDate: null});
  const pulled = pullExistingContent({
    postIts: [],
    content,
    date: '2026-11-03',
    id: 'post-ideia',
    now: NOW,
  });
  const result = transformPostIt({
    postIt: pulled.postIts[0],
    contents: [content],
    target: 'ideia',
    now: NOW,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.content.status, CONTENT_STATUS.IDEIA);
  assert.equal(result.content.publishDate?.slice(0, 10), '2026-11-03');
  assert.equal(content.publishDate, null);
}

function testMissingPulledContentDoesNotCreateAnother() {
  const postIt = {
    ...createEmptyPostIt({id: 'post-sumiu', date: '2026-10-08', now: NOW}),
    contentId: 'nao-existe',
  };
  assert.deepEqual(postItTransformOptions(postIt, null), {ideia: false, roteiro: false});
  const result = transformPostIt({postIt, contents: [], target: 'ideia', now: NOW});
  assert.deepEqual(result, {ok: false, reason: 'conteudo-ausente'});
}

function testTransformPulledRoteiroKeepsStatusAndDay() {
  const content = roteiro();
  const pulled = pullExistingContent({
    postIts: [],
    content,
    date: '2026-12-01',
    id: 'post-roteiro',
    now: NOW,
  });
  const options = postItTransformOptions(pulled.postIts[0], content);
  assert.deepEqual(options, {ideia: false, roteiro: true});

  const refused = transformPostIt({
    postIt: pulled.postIts[0],
    contents: [content],
    target: 'ideia',
    now: NOW,
  });
  assert.deepEqual(refused, {ok: false, reason: 'nao-vira-ideia'});
  assert.equal(content.status, CONTENT_STATUS.ROTEIRO);

  const result = transformPostIt({
    postIt: pulled.postIts[0],
    contents: [content],
    target: 'roteiro',
    now: NOW,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.content.status, CONTENT_STATUS.ROTEIRO);
  assert.equal(result.content.publishDate?.slice(0, 10), '2026-12-01');
  assert.equal(content.publishDate, '2026-01-01T12:00:00.000Z');
}

function testSavePersistsTextAndDay() {
  const postIt = createEmptyPostIt({
    id: 'post-vazio',
    texto: 'original',
    date: '2026-10-08',
    now: NOW,
  });
  const saved = savePostItEdit(
    postIt,
    {texto: 'nota revista', date: '2026-10-21'},
    '2026-10-04T18:00:00.000Z',
  );

  assert.equal(saved.texto, 'nota revista');
  assert.equal(saved.date, '2026-10-21');
  assert.equal(saved.updatedAt, '2026-10-04T18:00:00.000Z');
  assert.equal(saved.id, postIt.id);
  assert.equal(postIt.texto, 'original');
  assert.equal(postIt.date, '2026-10-08');
  assert.equal(postIt.updatedAt, NOW);
}

function testSaveCanClearTheDay() {
  const postIt = createEmptyPostIt({
    id: 'post-vazio',
    texto: 'nota',
    date: '2026-10-08',
    now: NOW,
  });
  const saved = savePostItEdit(postIt, {texto: 'nota', date: null}, '2026-10-04T18:00:00.000Z');
  assert.equal(saved.date, null);
  assert.equal(postIt.date, '2026-10-08');
}

function testSaveDoesNotChangePulledContent() {
  const content = ideia({publishDate: null});
  const pulled = pullExistingContent({
    postIts: [],
    content,
    date: '2026-10-12',
    id: 'post-ideia',
    now: NOW,
  });
  const saved = savePostItEdit(
    pulled.postIts[0],
    {texto: '  gravar na terça  ', date: '2026-11-09'},
    '2026-10-04T18:00:00.000Z',
  );

  assert.equal(saved.texto, '  gravar na terça  ');
  assert.equal(saved.date, '2026-11-09');
  assert.equal(saved.contentId, content.id);
  assert.equal(postItTitle(saved, content), 'gravar na terça');
  assert.equal(content.title, 'Gancho existente');
  assert.equal(content.status, CONTENT_STATUS.IDEIA);
  assert.equal(content.publishDate, null);
  assert.equal(postItTitle(pulled.postIts[0], content), 'Gancho existente');
}

function testCancelDiscardsUnsavedTextAndDay() {
  const postIt = createEmptyPostIt({
    id: 'post-vazio',
    texto: 'original',
    date: '2026-10-08',
    now: NOW,
  });
  const draft = {texto: 'não salvar', date: '2026-12-25'};
  const cancelled = cancelPostItEdit(postIt, draft);
  const saved = savePostItEdit(postIt, draft, '2026-10-04T18:00:00.000Z');

  assert.equal(cancelled, postIt);
  assert.equal(cancelled.texto, 'original');
  assert.equal(cancelled.date, '2026-10-08');
  assert.equal(cancelled.updatedAt, NOW);
  assert.equal(saved.texto, 'não salvar');
  assert.equal(saved.date, '2026-12-25');
  assert.notEqual(cancelled.texto, saved.texto);
  assert.notEqual(cancelled.date, saved.date);
}

function testDeletePulledPostItKeepsIdeiaAndRoteiro() {
  const idea = ideia();
  const script = roteiro();
  const pulledIdea = pullExistingContent({
    postIts: [],
    content: idea,
    date: '2026-10-12',
    id: 'post-ideia',
    now: NOW,
  });
  const pulled = pullExistingContent({
    postIts: pulledIdea.postIts,
    content: script,
    date: '2026-10-20',
    id: 'post-roteiro',
    now: NOW,
  });
  const contents = [idea, script];
  const withoutIdea = deletePostIt({postIts: pulled.postIts, contents, id: 'post-ideia'});

  assert.equal(withoutIdea.postIts.length, 1);
  assert.equal(withoutIdea.postIts[0].contentId, script.id);
  assert.equal(withoutIdea.contents, contents);
  assert.equal(idea.status, CONTENT_STATUS.IDEIA);
  assert.equal(idea.publishDate, null);
  assert.equal(script.status, CONTENT_STATUS.ROTEIRO);
  assert.equal(script.publishDate, '2026-01-01T12:00:00.000Z');

  const withoutBoth = deletePostIt({postIts: withoutIdea.postIts, contents, id: 'post-roteiro'});
  assert.equal(withoutBoth.postIts.length, 0);
  assert.equal(withoutBoth.contents, contents);
  assert.equal(script.title, 'Roteiro existente');
}

function testDeleteAfterTransformKeepsCreatedContent() {
  const postIt = createEmptyPostIt({
    id: 'post-vazio',
    texto: 'gancho do vídeo',
    date: '2026-10-08',
    now: NOW,
  });
  const created = transformPostIt({postIt, contents: [], target: 'ideia', now: NOW});
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const contents = [created.content];
  const removed = deletePostIt({
    postIts: [],
    contents,
    id: created.removePostItId,
  });

  assert.equal(removed.postIts.length, 0);
  assert.equal(removed.contents, contents);
  assert.equal(removed.contents[0], created.content);
  assert.equal(created.content.status, CONTENT_STATUS.IDEIA);
  assert.equal(created.content.title, 'gancho do vídeo');
}

const tests = [
  ['creates an empty post-it', testCreateEmptyPostIt],
  ['pulls an ideia without changing status or date', testPullIdeiaDoesNotChangeStatusOrDate],
  ['pulls a roteiro without changing status or date', testPullRoteiroDoesNotChangeStatusOrDate],
  ['does not pull posted content', testPullRejectsPostedContent],
  ['transforms an empty post-it into an ideia on that day', testTransformEmptyIntoIdeiaKeepsDay],
  ['transforms an empty post-it into a roteiro and opens the script', testTransformEmptyIntoRoteiroKeepsDayAndOpensScript],
  ['promotes a pulled ideia into a roteiro on the post-it day', testTransformPulledIdeiaIntoRoteiroKeepsPostItDay],
  ['places a pulled ideia on the calendar without changing status', testTransformPulledIdeiaIntoIdeiaKeepsStatusAndDay],
  ['places a pulled roteiro on the post-it day without demoting it', testTransformPulledRoteiroKeepsStatusAndDay],
  ['does not create content when the pulled item is gone', testMissingPulledContentDoesNotCreateAnother],
  ['saves post-it text and day', testSavePersistsTextAndDay],
  ['saves a post-it with the day cleared', testSaveCanClearTheDay],
  ['saves a note on a pulled post-it without changing the content', testSaveDoesNotChangePulledContent],
  ['cancel discards unsaved text and day', testCancelDiscardsUnsavedTextAndDay],
  ['delete removes a pulled post-it and keeps the ideia and roteiro', testDeletePulledPostItKeepsIdeiaAndRoteiro],
  ['delete after transform does not remove the created content', testDeleteAfterTransformKeepsCreatedContent],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
