import assert from 'node:assert/strict';
import type {Content, Idea} from '../../../lib/database.ts';
import {isUUID} from '../../../utils/uuid.ts';
import {
  applyStatusChange,
  archiveCreation,
  contentFromLegacyIdea,
  createScriptWithPublications,
  writingModeInicial,
  demoteContentToIdea,
  filterCreationContents,
  filterContentsByCreationTab,
  getCreationTabCounts,
  paginateCreationContents,
  promoteContentToScript,
  removeDeletedCreations,
  restoreCreation,
  restoreDeletedCreation,
  sortCreationContents,
} from './creationContent.ts';

function createContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'content-1',
    userId: 'user-1',
    title: 'Criação',
    status: 'Ideia',
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
    recordingDate: null,
    link: null,
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-07-25T10:00:00.000Z',
    updatedAt: '2026-07-25T10:00:00.000Z',
    deletedAt: null,
    archivedAt: null,
    legacyIdeaId: null,
    plataformas: [],
    ...overrides,
  };
}

function testStablePipelineTransitions() {
  const source = createContent({
    id: 'stable-id',
    status: 'Ideia',
    notes: 'Começar com uma pergunta.\n\nDepois explicar o contexto.',
  });
  const promoted = promoteContentToScript(source, '2026-07-25T11:00:00.000Z');
  const demoted = demoteContentToIdea(promoted, '2026-07-25T12:00:00.000Z');

  assert.equal(promoted.id, 'stable-id');
  assert.equal(promoted.status, 'Roteiro');
  assert.equal(
    promoted.script,
    '<p>Começar com uma pergunta.</p><p>Depois explicar o contexto.</p>',
  );
  assert.equal(promoted.notes, source.notes);
  assert.equal(demoted.id, 'stable-id');
  assert.equal(demoted.status, 'Ideia');
}

function testDemotionJoinsScriptAndDraftWithMarkers() {
  const now = '2026-11-02T12:00:00.000Z';
  const script = createContent({
    status: 'Roteiro',
    notes: 'Começar com uma pergunta.',
    script: '<p>Começar com uma pergunta.</p><p>Depois mostrar o livro.</p>',
    writingNotes: '<p>Lembrar da capa nova.</p>',
  });

  const demoted = demoteContentToIdea(script, now);
  assert.equal(
    demoted.notes,
    '<p><strong>ROTEIRO</strong></p><p>Começar com uma pergunta.</p><p>Depois mostrar o livro.</p>'
      + '<p><strong>RASCUNHO</strong></p><p>Lembrar da capa nova.</p>',
  );
  // Os campos do roteiro continuam lá para quando ele voltar a ser roteiro.
  assert.equal(demoted.script, script.script);
  assert.equal(demoted.writingNotes, script.writingNotes);

  // Rascunho antigo em texto puro vira parágrafos; sem rascunho, só o marcador do roteiro.
  const plainDraft = demoteContentToIdea(createContent({status: 'Roteiro', writingNotes: 'linha 1\nlinha 2'}), now);
  assert.equal(plainDraft.notes, '<p><strong>RASCUNHO</strong></p><p>linha 1</p><p>linha 2</p>');
  const onlyScript = demoteContentToIdea(createContent({status: 'Produção', script: '<p>Só o roteiro.</p>'}), now);
  assert.equal(onlyScript.notes, '<p><strong>ROTEIRO</strong></p><p>Só o roteiro.</p>');

  // A ideia que não está no roteiro não se perde.
  const rewritten = demoteContentToIdea(createContent({
    status: 'Roteiro',
    notes: 'Ideia original',
    script: '<p>Texto reescrito.</p>',
  }), now);
  assert.equal(
    rewritten.notes,
    '<p><strong>ROTEIRO</strong></p><p>Texto reescrito.</p><p><strong>IDEIA ANTERIOR</strong></p><p>Ideia original</p>',
  );

  // Voltar a Ideia de novo sem mudar nada não duplica o texto.
  const again = demoteContentToIdea(promoteContentToScript(demoted, now), now);
  assert.equal(again.notes, demoted.notes);

  // Sem roteiro e sem rascunho, ou com a lista leve (corpo ausente), o texto da ideia fica como está.
  assert.equal(demoteContentToIdea(createContent({status: 'Roteiro', notes: 'Só a ideia'}), now).notes, 'Só a ideia');
  const light = createContent({status: 'Roteiro'});
  delete (light as Partial<Content>).script;
  delete (light as Partial<Content>).notes;
  assert.equal(demoteContentToIdea(light, now).notes, undefined);
}

function testPromotionKeepsAnExistingScript() {
  const source = createContent({
    status: 'Ideia',
    notes: 'Anotação mais recente',
    script: '<p>Roteiro que já existia</p>',
  });

  const promoted = promoteContentToScript(source, '2026-07-25T11:00:00.000Z');

  assert.equal(promoted.script, '<p>Roteiro que já existia</p>');
  assert.equal(promoted.notes, 'Anotação mais recente');
}

function testPromotionPreservesRichIdeaFormatting() {
  const richIdea = '<h2>Ponto central</h2><p>Uma ideia com <strong>ênfase</strong>.</p>';
  const promoted = promoteContentToScript(createContent({notes: richIdea}));

  assert.equal(promoted.script, richIdea);
  assert.equal(promoted.notes, richIdea);
}

function testArchiveAndRestoreAreReversible() {
  const source = createContent();
  const archived = archiveCreation(source, '2026-07-25T11:00:00.000Z');
  const restored = restoreCreation(archived, '2026-07-25T12:00:00.000Z');

  assert.equal(archived.archivedAt, '2026-07-25T11:00:00.000Z');
  assert.equal(archived.deletedAt, null);
  assert.equal(restored.archivedAt, null);
  assert.equal(restored.deletedAt, null);
}

function testTrashAndRestoreAreReversible() {
  const deletedAt = '2026-07-25T11:00:00.000Z';
  const source = createContent({deletedAt});
  const restored = restoreDeletedCreation(source, '2026-07-25T12:00:00.000Z');

  assert.equal(source.deletedAt, deletedAt);
  assert.equal(restored.deletedAt, null);
  assert.equal(restored.updatedAt, '2026-07-25T12:00:00.000Z');
}

function testClearTrashKeepsOnlyActiveCreations() {
  const contents = [
    createContent({id: 'active'}),
    createContent({id: 'deleted-1', deletedAt: '2026-07-25T12:00:00.000Z'}),
    createContent({id: 'deleted-2', deletedAt: '2026-07-25T13:00:00.000Z'}),
  ];

  assert.deepEqual(
    removeDeletedCreations(contents).map(content => content.id),
    ['active'],
  );
}

function testLegacyIdeaAdapterReusesSourceId() {
  const idea: Idea = {
    id: 'legacy-idea-1',
    userId: 'user-1',
    title: 'Título',
    notes: 'Notas',
    text: 'Título',
    pilarId: 'pilar-1',
    seriesId: null,
    origemId: 'book-1',
    promotedToContentId: null,
    demotedFromContentId: null,
    archived: false,
    createdAt: '2026-07-25T10:00:00.000Z',
  };

  const content = contentFromLegacyIdea(idea);
  assert.equal(isUUID(content.id), true);
  assert.notEqual(content.id, idea.id);
  assert.equal(content.legacyIdeaId, idea.id);
  assert.equal(content.status, 'Ideia');
  assert.equal(content.notes, 'Notas');
  assert.equal(content.bibliotecaItemId, 'book-1');
}

function testCreationTabsExcludeArchivedFromActiveTabs() {
  const contents = [
    createContent({id: 'idea', status: 'Ideia'}),
    createContent({id: 'script', status: 'Roteiro'}),
    createContent({id: 'production', status: 'Pronto para Gravar'}),
    createContent({id: 'editing', status: 'Edição'}),
    createContent({id: 'posted', status: 'Postado'}),
    createContent({
      id: 'archived',
      status: 'Ideia',
      archivedAt: '2026-07-25T11:00:00.000Z',
    }),
    createContent({
      id: 'deleted',
      status: 'Roteiro',
      deletedAt: '2026-07-25T12:00:00.000Z',
    }),
    createContent({
      id: 'script-already-posted',
      status: 'Roteiro',
      postedAt: '2026-07-20T12:00:00.000Z',
    }),
  ];

  assert.deepEqual(
    filterContentsByCreationTab(contents, 'Produção').map(content => content.id),
    ['production'],
  );
  assert.deepEqual(
    filterContentsByCreationTab(contents, 'Edição').map(content => content.id),
    ['editing'],
  );
  assert.deepEqual(
    filterContentsByCreationTab(contents, 'Arquivados').map(content => content.id),
    ['archived'],
  );
  assert.deepEqual(
    filterContentsByCreationTab(contents, 'Lixeira').map(content => content.id),
    ['deleted'],
  );
  assert.deepEqual(
    filterContentsByCreationTab(contents, 'Roteiros').map(content => content.id),
    ['script'],
  );
  assert.deepEqual(
    filterContentsByCreationTab(contents, 'Publicados').map(content => content.id),
    ['posted', 'script-already-posted'],
  );
  assert.deepEqual(getCreationTabCounts(contents), {
    Todos: 6,
    Ideias: 1,
    Roteiros: 1,
    Produção: 1,
    Edição: 1,
    Publicados: 2,
    Arquivados: 1,
    Lixeira: 1,
  });
}

function testSharedCreationFiltersIncludeOriginAndSearch() {
  const contents = [
    createContent({
      id: 'matching',
      title: 'Gancho sobre memória',
      pilarId: 'pilar-1',
      seriesId: 'serie-1',
      bibliotecaItemId: 'book-1',
    }),
    createContent({
      id: 'wrong-origin',
      title: 'Gancho sobre memória',
      pilarId: 'pilar-1',
      seriesId: 'serie-1',
      bibliotecaItemId: 'book-2',
    }),
    createContent({
      id: 'wrong-search',
      title: 'Outro assunto',
      pilarId: 'pilar-1',
      seriesId: 'serie-1',
      bibliotecaItemId: 'book-1',
    }),
    createContent({
      id: 'segundo-livro',
      title: 'Gancho sobre memória',
      pilarId: 'pilar-1',
      seriesId: 'serie-1',
      bibliotecaItemId: 'book-2',
      livroIds: ['book-2', 'book-1'],
    }),
  ];

  assert.deepEqual(
    filterCreationContents(contents, {
      tab: 'Ideias',
      search: 'MEMÓRIA',
      pilarId: 'pilar-1',
      seriesId: 'serie-1',
      originId: 'book-1',
    }).map(content => content.id),
    ['matching', 'segundo-livro'],
  );
}

function testCreationFilterByFunctionUsesResolvedSeries() {
  const contents = [
    createContent({
      id: 'escolhida',
      status: 'Roteiro',
      funcao: 'converter',
      funcaoOrigem: 'escolhida',
    }),
    createContent({
      id: 'herdada',
      status: 'Roteiro',
      seriesId: 'serie-1',
      funcao: null,
      funcaoOrigem: 'herdada',
    }),
    createContent({
      id: 'outra',
      status: 'Roteiro',
      funcao: 'atrair',
      funcaoOrigem: 'escolhida',
    }),
  ];

  assert.deepEqual(
    filterCreationContents(contents, {
      tab: 'Roteiros',
      funcao: 'converter',
      series: [{ id: 'serie-1', funcaoPadrao: 'converter' }],
    }).map(content => content.id),
    ['escolhida', 'herdada'],
  );
}

function testCreationSortingAndPaginationClampInvalidPages() {
  const contents = Array.from({length: 5}, (_, index) => createContent({
    id: `content-${index + 1}`,
    title: `Título ${index + 1}`,
    createdAt: `2026-07-2${index + 1}T10:00:00.000Z`,
    updatedAt: `2026-08-0${5 - index}T10:00:00.000Z`,
  }));

  const sorted = sortCreationContents(contents, 'recent');
  assert.equal(sorted[0]?.id, 'content-5');

  const page = paginateCreationContents(sorted, 99, 2);
  assert.equal(page.page, 3);
  assert.equal(page.totalPages, 3);
  assert.equal(page.totalItems, 5);
  assert.deepEqual(page.items.map(content => content.id), ['content-1']);
}

function testStatusChangeIsTheSameRuleEverywhere() {
  const now = '2026-10-28T12:00:00.000Z';
  // Pular de Ideia para Produção: a ideia vira roteiro e o vídeo fica marcado para gravar.
  const jumped = applyStatusChange(createContent({notes: 'Abrir com a capa.'}), 'Produção', now);
  assert.equal(jumped.status, 'Produção');
  assert.equal(jumped.script, '<p>Abrir com a capa.</p>');
  assert.deepEqual(jumped.tags, ['gravar']);

  // Carrossel não passa pela gravação: sem a etiqueta.
  const carousel = applyStatusChange(createContent({status: 'Roteiro', writingMode: 'carrossel'}), 'Produção', now);
  assert.deepEqual(carousel.tags, []);

  // Publicado pela regra única não inventa postedAt — o formulário confirma a data.
  const postedJump = applyStatusChange(createContent({status: 'Roteiro'}), 'Publicado', now);
  assert.equal(postedJump.status, 'Publicado');
  assert.equal(postedJump.postedAt ?? null, null);

  // Pular para Edição não registra gravação.
  const toEdit = applyStatusChange(createContent({status: 'Roteiro', recordedAt: null}), 'Edição', now);
  assert.equal(toEdit.status, 'Edição');
  assert.equal(toEdit.recordedAt ?? null, null);

  // Sair de Publicado (já com data) limpa postedAt.
  const posted = createContent({status: 'Publicado', postedAt: now});
  assert.equal(applyStatusChange(posted, 'Edição', now).postedAt, null);

  // Mesma etapa não muda nada.
  const same = createContent({status: 'Edição'});
  assert.equal(applyStatusChange(same, 'Edição', now), same);
}

function testNewScriptCarriesChosenPublications() {
  const escolhidas = [
    {id: 'pub-ig', contentId: '', platformId: 'conta-ig', legenda: '', hashtags: ''},
    {id: 'pub-tt', contentId: '', platformId: 'conta-tt', legenda: '', hashtags: ''},
  ] as Content['plataformas'];
  const script = createScriptWithPublications(escolhidas, {title: 'Novo roteiro'});

  assert.equal(script.status, 'Roteiro');
  assert.equal(script.title, 'Novo roteiro');
  assert.deepEqual(script.plataformas.map(item => item.platformId), ['conta-ig', 'conta-tt']);
  assert.ok(script.plataformas.every(item => item.contentId === script.id));

  // Sem rede escolhida, o roteiro nasce sem publicação, como antes.
  assert.deepEqual(createScriptWithPublications([]).plataformas, []);
  assert.equal(writingModeInicial([{formatoPublicacao: 'video-longo'}]), 'youtube');
  assert.equal(writingModeInicial([{formatoPublicacao: 'short'}]), 'texto');
  assert.equal(writingModeInicial([{formatoPublicacao: 'reels'}]), 'texto');
  assert.equal(writingModeInicial([{formatoPublicacao: 'carrossel'}]), 'carrossel');
  assert.equal(writingModeInicial([{formatoPublicacao: 'carrossel'}, {formatoPublicacao: 'video-longo'}]), 'carrossel');
  assert.equal(writingModeInicial([{}]), 'texto');
  assert.equal(createScriptWithPublications([{...escolhidas[0], formatoPublicacao: 'video-longo'}]).writingMode, 'youtube');
  assert.equal(createScriptWithPublications([{...escolhidas[0], formatoPublicacao: 'carrossel'}]).writingMode, 'carrossel');
}

const tests: Array<[string, () => void]> = [
  ['new script carries the networks chosen at creation', testNewScriptCarriesChosenPublications],
  ['status change is the same rule everywhere', testStatusChangeIsTheSameRuleEverywhere],
  ['creation pipeline transitions keep the same id', testStablePipelineTransitions],
  ['demotion joins script and draft with markers', testDemotionJoinsScriptAndDraftWithMarkers],
  ['promotion preserves an existing script', testPromotionKeepsAnExistingScript],
  ['promotion preserves rich idea formatting', testPromotionPreservesRichIdeaFormatting],
  ['archive and restore are reversible', testArchiveAndRestoreAreReversible],
  ['trash and restore are reversible', testTrashAndRestoreAreReversible],
  ['clearing trash keeps active creations', testClearTrashKeepsOnlyActiveCreations],
  ['legacy ideas adapt to canonical contents', testLegacyIdeaAdapterReusesSourceId],
  ['creation tabs classify active and archived content', testCreationTabsExcludeArchivedFromActiveTabs],
  ['creation filters combine search, pilar, series and origin', testSharedCreationFiltersIncludeOriginAndSearch],
  ['creation filter by function reads the series', testCreationFilterByFunctionUsesResolvedSeries],
  ['creation sorting and pagination remain stable', testCreationSortingAndPaginationClampInvalidPages],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
