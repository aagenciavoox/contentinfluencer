import assert from 'node:assert/strict';
import type {Content, ContentPlataforma} from '../../../lib/database.ts';
import {
  applyStatusMilestones,
  CONTENT_STATUS,
  DISPLAY_STATUS,
  edicaoPatch,
  effectsOfLeavingPublished,
  getAllowedStatuses,
  getContentStage,
  getDisplayStatus,
  getPrimaryAction,
  getStatusDetail,
  getStatusOptions,
  getVisibleTabsForContent,
  isReadyToPublish,
  normalizeContentStatus,
  planStatusChange,
  recordedPatch,
  seloDoBloco,
} from './contentPipeline.ts';

function createContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'content-1',
    userId: 'user-1',
    title: 'Roteiro de teste',
    status: CONTENT_STATUS.ROTEIRO,
    slotType: null,
    seriesId: null,
    pilarId: null,
    lookId: null,
    cenarioId: null,
    bibliotecaItemId: null,
    formatoVisual: null,
    energiaNecessaria: null,
    funcao: null,
    funcaoOrigem: null,
    classificacaoCongeladaEm: null,
    contaNaGrade: true,
    publishDate: null,
    publishTime: null,
    recordingDate: null,
    link: null,
    script: '<p>Texto do roteiro</p>',
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-07-25T12:00:00.000Z',
    updatedAt: '2026-07-25T12:00:00.000Z',
    deletedAt: null,
    plataformas: [],
    ...overrides,
  };
}

function testDisplayStatusFuturePublishDate() {
  const future = new Date();
  future.setDate(future.getDate() + 7);
  // Data futura sozinha não vira Programado.
  assert.equal(getDisplayStatus({
    status: CONTENT_STATUS.PRODUCAO,
    publishDate: future.toISOString(),
  }), CONTENT_STATUS.PRODUCAO);

  assert.equal(getDisplayStatus({
    status: CONTENT_STATUS.EDICAO,
    edicaoConcluidaEm: '2026-10-28T12:00:00.000Z',
    publishDate: future.toISOString(),
    plataformas: [{ status: 'programada' } as Pick<ContentPlataforma, 'status'> as ContentPlataforma],
  }), DISPLAY_STATUS.PROGRAMADO);
}

function testDisplayStatusPastPublishDateKeepsCanonical() {
  const content = {
    status: CONTENT_STATUS.PRODUCAO,
    publishDate: '2020-01-01T12:00:00.000Z',
  };
  assert.equal(getDisplayStatus(content), CONTENT_STATUS.PRODUCAO);
}

function testDisplayStatusPostedIgnoresFutureDate() {
  const future = new Date();
  future.setDate(future.getDate() + 7);
  const content = {
    status: CONTENT_STATUS.POSTADO,
    publishDate: future.toISOString(),
  };
  assert.equal(getDisplayStatus(content), CONTENT_STATUS.POSTADO);
}

function testDisplayStatusPostedAtOverridesRoteiro() {
  const content = {
    status: CONTENT_STATUS.ROTEIRO,
    postedAt: '2026-07-20T12:00:00.000Z',
    publishDate: null,
  };
  assert.equal(getDisplayStatus(content), CONTENT_STATUS.POSTADO);
}

function testNormalizeLegacyStatuses() {
  assert.equal(normalizeContentStatus('Pronto para Gravar'), CONTENT_STATUS.PRODUCAO);
  assert.equal(normalizeContentStatus('Gravado'), CONTENT_STATUS.EDICAO);
  assert.equal(normalizeContentStatus('Programado'), CONTENT_STATUS.EDICAO);
  assert.equal(normalizeContentStatus('Postado'), 'Publicado');
  assert.equal(normalizeContentStatus('Roteiro'), CONTENT_STATUS.ROTEIRO);
}

function testRecordedVideoGoesToEditing() {
  const now = '2026-10-28T12:00:00.000Z';
  assert.deepEqual(
    recordedPatch({status: CONTENT_STATUS.PRODUCAO, recordedAt: null}, now),
    {recordedAt: now, status: CONTENT_STATUS.EDICAO, edicaoConcluidaEm: null, edicaoDispensada: false},
  );
  // Quem já passou da gravação não volta para Edição.
  assert.deepEqual(
    recordedPatch({status: CONTENT_STATUS.POSTADO, recordedAt: '2026-10-01T12:00:00.000Z'}, now),
    {recordedAt: '2026-10-01T12:00:00.000Z'},
  );
}

function testEditingActionsFollowTheStage() {
  const recorded = createContent({status: CONTENT_STATUS.PRODUCAO, recordedAt: '2026-10-01T12:00:00.000Z'});
  const send = getPrimaryAction(recorded);
  assert.equal(send.id, 'send_to_edit');
  assert.equal(send.label, 'Enviar para edição');
  assert.equal(send.secondary?.id, 'skip_edit');

  const carouselPronto = getPrimaryAction(createContent({
    status: CONTENT_STATUS.PRODUCAO,
    writingMode: 'carrossel',
    recordedAt: '2026-10-01T12:00:00.000Z',
  }));
  assert.equal(carouselPronto.id, 'send_to_edit');

  const editing = getPrimaryAction(createContent({status: CONTENT_STATUS.EDICAO, edicaoConcluidaEm: null}));
  assert.equal(editing.id, 'finish_edit');
  assert.equal(editing.secondary?.label, 'Dispensar edição');

  const ready = createContent({status: CONTENT_STATUS.EDICAO, edicaoConcluidaEm: '2026-10-02T12:00:00.000Z'});
  assert.equal(getPrimaryAction(ready).id, 'send_to_posting');
  assert.equal(getPrimaryAction(ready).secondary?.id, 'reopen_edit');
  assert.equal(isReadyToPublish(ready), true);
  assert.equal(getStatusDetail(ready), 'Pronto para publicar');

  const skipped = edicaoPatch('dispensar', '2026-10-03T12:00:00.000Z');
  assert.deepEqual(skipped, {
    status: CONTENT_STATUS.EDICAO,
    edicaoConcluidaEm: '2026-10-03T12:00:00.000Z',
    edicaoDispensada: true,
  });
}

function testRecordingActionUsesClearPipelineCopy() {
  const action = getPrimaryAction(createContent());

  assert.equal(action.id, 'advance_to_recording');
  assert.equal(action.label, 'Avançar para gravação');
  assert.equal(action.disabled, false);
}

function testIdeaActionPromotesBeforeProduction() {
  const action = getPrimaryAction(createContent({
    status: CONTENT_STATUS.IDEIA,
    script: null,
    notes: 'Uma ideia ainda em desenvolvimento',
  }));

  assert.equal(action.id, 'promote_to_script');
  assert.equal(action.label, 'Transformar em roteiro');
  assert.equal(action.disabled, undefined);
}

function testRecordingActionExplainsMissingRequirements() {
  const action = getPrimaryAction(createContent({title: '', script: ''}));

  assert.equal(action.disabled, true);
  assert.equal(action.reason, 'Adicione um título e escreva o roteiro para continuar.');
}

function testLeavingPostadoClearsPostedAt() {
  const posted = {status: CONTENT_STATUS.POSTADO, postedAt: '2026-07-20T12:00:00.000Z', recordedAt: null};
  assert.deepEqual(applyStatusMilestones(posted, CONTENT_STATUS.PRODUCAO), {postedAt: null});
  // Sem confirmPublish, escolher Publicado não inventa a data.
  assert.deepEqual(applyStatusMilestones(posted, CONTENT_STATUS.POSTADO), {});
  assert.deepEqual(
    applyStatusMilestones(
      {status: CONTENT_STATUS.ROTEIRO, postedAt: null, recordedAt: null},
      CONTENT_STATUS.POSTADO,
      {confirmPublish: true, now: '2026-07-20T12:00:00.000Z'},
    ),
    {postedAt: '2026-07-20T12:00:00.000Z'},
  );
}

function testEveryStageVisibleAndJumpsAllowed() {
  const opcoes = getStatusOptions(CONTENT_STATUS.ROTEIRO);
  assert.deepEqual(opcoes.map(item => item.status), ['Ideia', 'Roteiro', 'Produção', 'Edição', 'Publicado']);
  assert.deepEqual(opcoes.filter(item => item.atual).map(item => item.status), ['Roteiro']);
  assert.deepEqual(
    opcoes.filter(item => item.disponivel).map(item => item.status),
    getAllowedStatuses(CONTENT_STATUS.ROTEIRO),
  );
  // Dá para pular etapas: de Roteiro direto para Publicado.
  assert.equal(opcoes.find(item => item.status === 'Publicado')?.disponivel, true);

  // Etapa antiga (Gravado) aparece como Edição, e dá para voltar direto para Ideia.
  const legado = getStatusOptions('Gravado');
  assert.equal(legado.find(item => item.atual)?.status, 'Edição');
  assert.equal(legado.find(item => item.status === 'Ideia')?.disponivel, true);
}

function testPlanStatusChangeGatesPublishAndUnpublish() {
  assert.equal(planStatusChange(createContent({status: CONTENT_STATUS.ROTEIRO}), CONTENT_STATUS.POSTADO).type, 'publish_form');
  const leave = planStatusChange(
    createContent({status: CONTENT_STATUS.POSTADO, postedAt: '2026-07-20T12:00:00.000Z'}),
    CONTENT_STATUS.EDICAO,
  );
  assert.equal(leave.type, 'unpublish_confirm');
  if (leave.type === 'unpublish_confirm') {
    assert.equal(leave.status, CONTENT_STATUS.EDICAO);
    assert.ok(leave.effects.length > 0);
  }
  assert.equal(planStatusChange(createContent({status: CONTENT_STATUS.ROTEIRO}), CONTENT_STATUS.EDICAO).type, 'apply');
  assert.deepEqual(
    effectsOfLeavingPublished({postedAt: '2026-07-20T12:00:00.000Z', publishDate: null}),
    ['A data de publicação registrada neste conteúdo será apagada.'],
  );
}

function testBlockIsBadgeNotStage() {
  const content = createContent({status: CONTENT_STATUS.PRODUCAO});
  const block = {
    id: 'b1',
    userId: 'u',
    name: '12/11',
    createdAt: '2026-07-25T12:00:00.000Z',
    contents: [{blockId: 'b1', contentId: content.id, ordem: 1, gravado: false}],
  };
  assert.equal(getContentStage(content, {block}), 'PRODUCAO');
  assert.equal(seloDoBloco(content.id, [block]), 'No bloco de 12/11');
  assert.equal(getPrimaryAction(content, {block}).id, 'go_to_execution');
}

function testPublicationTabOpensFromRoteiro() {
  const roteiro = createContent({status: CONTENT_STATUS.ROTEIRO});
  assert.deepEqual(getVisibleTabsForContent(roteiro), ['roteiro', 'publicacao']);
  assert.deepEqual(getVisibleTabsForContent(createContent({status: CONTENT_STATUS.IDEIA})), ['roteiro']);
}

function testCarouselMarkProduced() {
  const carousel = createContent({status: CONTENT_STATUS.PRODUCAO, writingMode: 'carrossel', recordedAt: null});
  assert.equal(getPrimaryAction(carousel).id, 'mark_recorded');
  assert.equal(getPrimaryAction(carousel).label, 'Marcar como produzido');
}

const tests: Array<[string, () => void]> = [
  ['every stage is listed and jumps are allowed', testEveryStageVisibleAndJumpsAllowed],
  ['recorded video goes to Edição', testRecordedVideoGoesToEditing],
  ['editing actions follow the stage', testEditingActionsFollowTheStage],
  ['leaving Postado clears postedAt', testLeavingPostadoClearsPostedAt],
  ['planStatusChange gates publish and unpublish', testPlanStatusChangeGatesPublishAndUnpublish],
  ['block is badge not stage', testBlockIsBadgeNotStage],
  ['publication tab opens from Roteiro', testPublicationTabOpensFromRoteiro],
  ['carousel mark produced goes to Edição', testCarouselMarkProduced],
  ['future publish date shows Programado', testDisplayStatusFuturePublishDate],
  ['past publish date keeps canonical status', testDisplayStatusPastPublishDateKeepsCanonical],
  ['posted ignores future publish date display', testDisplayStatusPostedIgnoresFutureDate],
  ['postedAt marks a roteiro as Postado in display', testDisplayStatusPostedAtOverridesRoteiro],
  ['normalize legacy statuses to canonical', testNormalizeLegacyStatuses],
  ['recording action uses clear pipeline copy', testRecordingActionUsesClearPipelineCopy],
  ['idea action promotes before production', testIdeaActionPromotesBeforeProduction],
  ['recording action explains missing requirements', testRecordingActionExplainsMissingRequirements],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
