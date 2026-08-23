import assert from 'node:assert/strict';
import type {AppData, Content} from './database.ts';
import {canDomainPayloadSatisfyRequest, sanitizeDomainPayload} from './persistentDataCache.ts';

function content(overrides: Partial<Content> = {}): Content {
  return {
    id: 'content-1',
    userId: 'user-1',
    title: 'Roteiro',
    status: 'Produção',
    slotType: null,
    seriesId: null,
    pilarId: null,
    lookId: null,
    cenarioId: null,
    bibliotecaItemId: null,
    formatoVisual: null,
    energiaNecessaria: null,
    publishDate: null,
    recordingDate: null,
    link: null,
    script: '<p>Texto salvo</p>',
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-07-27T10:00:00.000Z',
    updatedAt: '2026-07-27T10:00:00.000Z',
    deletedAt: null,
    plataformas: [],
    ...overrides,
  };
}

const completePayload = {contents: [content()]} satisfies Partial<AppData>;
const lightweightPayload = sanitizeDomainPayload(completePayload);

assert.equal(canDomainPayloadSatisfyRequest(['content'], completePayload), true);
assert.equal(canDomainPayloadSatisfyRequest(['content'], lightweightPayload), false);
assert.equal(canDomainPayloadSatisfyRequest(['content-summary'], lightweightPayload), true);
console.log('persistentDataCache.test.ts passed');
