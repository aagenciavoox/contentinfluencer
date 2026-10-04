import assert from 'node:assert/strict';
import type { ContentPlataforma } from '../../../lib/database.ts';
import { createContentDraft } from '../../contents/lib/createContentDraft.ts';
import {
  getCreationCardDateMeta,
  getCreationCardFooterMeta,
} from './creationItemPresentation.ts';

// 3 de outubro de 2026, 10h no fuso local.
const NOW = new Date(2026, 9, 3, 10, 0);
const EDITED_TODAY = new Date(2026, 9, 3, 8, 30).toISOString();

function draft(overrides: Parameters<typeof createContentDraft>[0] = {}) {
  return createContentDraft({ updatedAt: EDITED_TODAY, ...overrides });
}

function plataforma(overrides: Partial<ContentPlataforma>): ContentPlataforma {
  return {
    id: 'cp-1',
    contentId: 'c-1',
    platformId: 'instagram',
    legenda: '',
    hashtags: '',
    publishDate: null,
    publishDateEnabled: true,
    ...overrides,
  };
}

// Publicação futura vem antes da gravação futura.
assert.equal(
  getCreationCardDateMeta(draft({ publishDate: '2026-10-12', recordingDate: '2026-10-08' }), NOW),
  'Publica 12 de out.',
);

// Sem publicação futura, mostra a próxima gravação.
assert.equal(
  getCreationCardDateMeta(draft({ publishDate: '2026-09-30', recordingDate: '2026-10-08' }), NOW),
  'Grava 08 de out.',
);

// Hoje e amanhã aparecem por extenso.
assert.equal(getCreationCardDateMeta(draft({ publishDate: '2026-10-03' }), NOW), 'Publica hoje');
assert.equal(getCreationCardDateMeta(draft({ recordingDate: '2026-10-04' }), NOW), 'Grava amanhã');

// Datas salvas ao meio-dia UTC continuam no mesmo dia do calendário.
assert.equal(
  getCreationCardDateMeta(draft({ publishDate: '2026-10-12T12:00:00.000Z' }), NOW),
  'Publica 12 de out.',
);

// Data desligada não conta.
assert.equal(
  getCreationCardDateMeta(draft({ publishDate: '2026-10-12', publishDateEnabled: false }), NOW),
  'Editado hoje',
);
assert.equal(
  getCreationCardDateMeta(draft({ recordingDate: '2026-10-08', recordingDateEnabled: false }), NOW),
  'Editado hoje',
);

// A data de uma plataforma conta quando é a próxima.
assert.equal(
  getCreationCardDateMeta(draft({
    publishDate: '2026-10-20',
    plataformas: [
      plataforma({ publishDate: '2026-10-20' }),
      plataforma({ id: 'cp-2', platformId: 'tiktok', publishDate: '2026-10-10' }),
      plataforma({ id: 'cp-3', platformId: 'youtube', publishDate: '2026-10-05', publishDateEnabled: false }),
    ],
  }), NOW),
  'Publica 10 de out.',
);

// Já gravado: a data de gravação não aparece.
assert.equal(
  getCreationCardDateMeta(draft({ recordingDate: '2026-10-08', recordedAt: '2026-10-02T15:00:00.000Z' }), NOW),
  'Editado hoje',
);

// Já publicado: só republicação futura aparece.
assert.equal(
  getCreationCardDateMeta(draft({ publishDate: '2026-10-12', postedAt: '2026-10-01T15:00:00.000Z' }), NOW),
  'Editado hoje',
);
assert.equal(
  getCreationCardDateMeta(draft({
    postedAt: '2026-10-01T15:00:00.000Z',
    plataformas: [plataforma({ publishDate: '2026-10-15', publicationKind: 'repost' })],
  }), NOW),
  'Publica 15 de out.',
);

// Sem datas futuras: última edição.
assert.equal(
  getCreationCardDateMeta(draft({ updatedAt: new Date(2026, 9, 2, 22, 0).toISOString() }), NOW),
  'Editado ontem',
);
assert.equal(
  getCreationCardDateMeta(draft({ updatedAt: new Date(2026, 8, 30, 9, 0).toISOString() }), NOW),
  'Editado 3d atrás',
);
assert.equal(
  getCreationCardDateMeta(draft({ updatedAt: new Date(2026, 8, 23, 9, 0).toISOString() }), NOW),
  'Editado 23 de set.',
);
assert.equal(getCreationCardDateMeta(draft({ updatedAt: 'inválido' }), NOW), null);

// O formato visual continua antes da data.
assert.equal(
  getCreationCardFooterMeta(draft({ formatoVisual: 'Reacao', recordingDate: '2026-10-08' }), NOW),
  'Reação / Grava 08 de out.',
);
assert.equal(getCreationCardFooterMeta(draft(), NOW), 'Editado hoje');

console.log('creationCardFooterMeta.test.ts passed');
