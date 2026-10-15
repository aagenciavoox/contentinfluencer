import assert from 'node:assert/strict';
import type {AppData, Content} from './database.ts';
import {canDomainPayloadSatisfyRequest, hasNewerOverlappingDomainCache, sanitizeDomainPayload} from './persistentDataCache.ts';

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
    funcao: null,
    funcaoOrigem: null,
    classificacaoCongeladaEm: null,
    contaNaGrade: true,
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
const emptyPayload = {} satisfies Partial<AppData>;

assert.equal(canDomainPayloadSatisfyRequest(['content'], completePayload), true);
assert.equal(canDomainPayloadSatisfyRequest(['content'], lightweightPayload), true);
assert.equal(canDomainPayloadSatisfyRequest(['content-schedule'], lightweightPayload), true);
assert.equal(canDomainPayloadSatisfyRequest(['content-summary'], lightweightPayload), true);
assert.equal(canDomainPayloadSatisfyRequest(['content'], emptyPayload), false);
assert.equal(canDomainPayloadSatisfyRequest(['production'], emptyPayload), true);

assert.equal(hasNewerOverlappingDomainCache('domain:analytics|schedule', 100, [
  {key: 'domain:schedule', fetchedAt: 200},
]), true);
assert.equal(hasNewerOverlappingDomainCache('domain:analytics|schedule', 200, [
  {key: 'domain:schedule', fetchedAt: 100},
]), false);
assert.equal(hasNewerOverlappingDomainCache('domain:analytics|schedule', 100, [
  {key: 'domain:analytics|schedule', fetchedAt: 300},
]), false);
assert.equal(hasNewerOverlappingDomainCache('domain:schedule', 100, [
  {key: 'domain:library', fetchedAt: 300},
]), false);
assert.equal(hasNewerOverlappingDomainCache('domain:content', 100, [
  {key: 'domain:content-schedule', fetchedAt: 300},
]), false);

console.log('persistentDataCache.test.ts passed');
