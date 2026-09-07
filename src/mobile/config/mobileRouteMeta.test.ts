import assert from 'node:assert/strict';
import { getMobileRouteMeta, resolveMobileRouteMeta } from './mobileRouteMeta.ts';

const scriptMeta = getMobileRouteMeta('/conteudos/abc-123');
assert.equal(scriptMeta.hideHeader, true);
assert.equal(scriptMeta.hideBottomNav, true);
assert.equal(scriptMeta.mode, 'back');

const scriptWithTab = getMobileRouteMeta('/conteudos/abc-123', '?tab=roteiro&focus=script');
assert.equal(scriptWithTab.hideHeader, true);
assert.equal(scriptWithTab.hideBottomNav, true);

const recordingMeta = getMobileRouteMeta('/conteudos/abc-123', '?tab=gravacao');
assert.equal(recordingMeta.hideHeader, false);
assert.equal(recordingMeta.hideBottomNav, false);

const publishingMeta = getMobileRouteMeta('/conteudos/abc-123', 'tab=publicacao');
assert.equal(publishingMeta.hideHeader, false);
assert.equal(publishingMeta.hideBottomNav, false);

const resolved = resolveMobileRouteMeta(
  '/conteudos/abc-123',
  { contentTitle: 'Pergunta sobre os santos' },
  '?tab=roteiro',
);
assert.equal(resolved.title, 'Pergunta sobre os santos');
assert.equal(resolved.hideHeader, true);
assert.equal(resolved.hideBottomNav, true);

const home = getMobileRouteMeta('/hoje');
assert.equal(home.hideHeader, true);
assert.equal(home.hideBottomNav, undefined);

const criacao = getMobileRouteMeta('/criacao');
assert.equal(criacao.hideHeader, undefined);
assert.equal(criacao.hideBottomNav, undefined);

console.log('mobileRouteMeta.test.ts passed');
