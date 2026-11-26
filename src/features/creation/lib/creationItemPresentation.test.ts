import assert from 'node:assert/strict';
import { createContentDraft } from '../../contents/lib/createContentDraft.ts';
import { CONTENT_STATUS } from '../../contents/lib/contentPipeline.ts';
import {
  etiquetasVisiveis,
  getCreationCardPresentation,
  getCreationCardTags,
  getCreationNoteExcerpt,
  getCreationTrashAgeLabel,
  isIdeaContent,
  sanitizeCreationPreviewText,
} from './creationItemPresentation.ts';

assert.equal(
  sanitizeCreationPreviewText('<p>&gt; [00:00--00:06] Uma abertura limpa.</p><p>[Corte seco] Continue aqui.</p>'),
  'Uma abertura limpa. Continue aqui.',
);

assert.equal(
  sanitizeCreationPreviewText('[00:00–00:08] Primeiro trecho[5]\n\n> Segundo trecho[1][8]'),
  'Primeiro trecho Segundo trecho',
);

assert.equal(
  sanitizeCreationPreviewText('<p>&gt; [00:00] Começo direto da nota.</p>'),
  'Começo direto da nota.',
);

assert.equal(
  getCreationNoteExcerpt(createContentDraft({
    notes: '<p></p>',
    script: '<p>&gt; [00:00] Roteiro visível na prévia.</p>',
  })),
  'Roteiro visível na prévia.',
);

assert.deepEqual(
  getCreationCardTags({
    tags: ['#Médica', 'POVS', 'gravar', 'médica', 'editar'],
  }),
  ['Médica', 'POVS'],
);

assert.deepEqual(
  etiquetasVisiveis(
    {tags: ['#Médica', 'POVS', 'gravar'], temaIds: ['t1', 't2', 'sumiu']},
    [{id: 't1', nome: 'Halloween'}, {id: 't2', nome: 'Médica'}],
  ),
  ['Halloween', 'Médica', 'POVS'],
);

assert.equal(isIdeaContent(createContentDraft({ status: CONTENT_STATUS.IDEIA })), true);
assert.equal(isIdeaContent(createContentDraft({ status: CONTENT_STATUS.ROTEIRO })), false);

assert.deepEqual(
  getCreationCardPresentation(createContentDraft({ status: CONTENT_STATUS.IDEIA })),
  {
    stageKind: 'idea',
    stageLabel: 'Ideia',
    completionBadge: null,
    isTrash: false,
    isIdea: true,
  },
);

assert.deepEqual(
  getCreationCardPresentation(createContentDraft({ status: CONTENT_STATUS.ROTEIRO })),
  {
    stageKind: 'script',
    stageLabel: 'Roteiro',
    completionBadge: null,
    isTrash: false,
    isIdea: false,
  },
);

assert.deepEqual(
  getCreationCardPresentation(createContentDraft({
    status: CONTENT_STATUS.EDICAO,
    edicaoConcluidaEm: '2026-10-01T12:00:00.000Z',
  })),
  {
    stageKind: 'editing',
    stageLabel: 'Edição',
    completionBadge: { kind: 'edited', label: '✓ Editado' },
    isTrash: false,
    isIdea: false,
  },
);

assert.deepEqual(
  getCreationCardPresentation(createContentDraft({
    status: CONTENT_STATUS.PRODUCAO,
    writingMode: 'carrossel',
    edicaoConcluidaEm: '2026-10-01T12:00:00.000Z',
  })),
  {
    stageKind: 'production',
    stageLabel: 'Design',
    completionBadge: { kind: 'design', label: '✓ Design pronto' },
    isTrash: false,
    isIdea: false,
  },
);

assert.deepEqual(
  getCreationCardPresentation(createContentDraft({
    status: CONTENT_STATUS.ROTEIRO,
    deletedAt: '2026-10-01T12:00:00.000Z',
  })),
  {
    stageKind: 'trash',
    stageLabel: 'Na lixeira',
    completionBadge: null,
    isTrash: true,
    isIdea: false,
  },
);

const NOW = new Date(2026, 9, 5, 12, 0, 0);
assert.equal(getCreationTrashAgeLabel(new Date(2026, 9, 5, 9, 0, 0).toISOString(), NOW), 'Movido hoje');
assert.equal(getCreationTrashAgeLabel(new Date(2026, 9, 4, 9, 0, 0).toISOString(), NOW), 'Movido ontem');
assert.equal(getCreationTrashAgeLabel(new Date(2026, 9, 1, 9, 0, 0).toISOString(), NOW), 'Há 4 dias');

console.log('creationItemPresentation.test.ts passed');
