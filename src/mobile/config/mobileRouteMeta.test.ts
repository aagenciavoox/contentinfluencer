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

const legendas = getMobileRouteMeta('/criacao/legendas');
assert.equal(legendas.title, 'Legendas');
assert.equal(legendas.mode, 'back');
assert.equal(legendas.backTo, '/criacao');

const transcricao = getMobileRouteMeta('/criacao/transcricao');
assert.equal(transcricao.title, 'Transcrição');
assert.equal(transcricao.mode, 'back');
assert.equal(transcricao.backTo, '/criacao');
assert.equal(getMobileRouteMeta('/criacao/transcricao', '?ver=item-1').backTo, '/criacao/transcricao');

const editorial = getMobileRouteMeta('/editorial', '?aba=funil');
assert.equal(editorial.title, 'Editorial');
assert.equal(editorial.titleVariant, 'compact-center');

const editorialPilar = getMobileRouteMeta('/editorial/pilares/pilar-1');
assert.equal(editorialPilar.title, 'Editar pilar');
assert.equal(editorialPilar.backTo, '/editorial');

const editorialSerie = getMobileRouteMeta('/editorial/series/nova');
assert.equal(editorialSerie.title, 'Nova série');
assert.equal(editorialSerie.backTo, '/series');
assert.equal(getMobileRouteMeta('/series/serie-1').title, 'Série');
assert.equal(getMobileRouteMeta('/series/serie-1').backTo, '/series');
assert.equal(getMobileRouteMeta('/series/serie-1/editar').backTo, '/series/serie-1');

assert.equal(getMobileRouteMeta('/configuracoes/perfil').title, 'Perfil');
assert.equal(getMobileRouteMeta('/configuracoes/dna').title, 'Configurações');
assert.equal(resolveMobileRouteMeta('/calendario').titleVariant, 'compact-center');

console.log('mobileRouteMeta.test.ts passed');
