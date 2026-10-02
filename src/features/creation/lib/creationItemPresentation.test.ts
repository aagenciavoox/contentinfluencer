import assert from 'node:assert/strict';
import { createContentDraft } from '../../contents/lib/createContentDraft.ts';
import {
  getCreationCardTags,
  getCreationNoteExcerpt,
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

console.log('creationItemPresentation.test.ts passed');
