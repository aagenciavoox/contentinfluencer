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
assert.equal(editorialSerie.title, 'Criar série');
assert.equal(editorialSerie.backTo, '/series');
assert.equal(getMobileRouteMeta('/series/serie-1').title, 'Série');
assert.equal(getMobileRouteMeta('/series/serie-1').backTo, '/series');
assert.equal(getMobileRouteMeta('/series/serie-1/editar').backTo, '/series/serie-1');
assert.equal(getMobileRouteMeta('/series/novo').title, 'Criar série');
assert.equal(getMobileRouteMeta('/series/serie-1/criacao-em-massa').backTo, '/series/serie-1');
assert.equal(getMobileRouteMeta('/series/serie-1/quadros/novo').title, 'Criar quadro');
assert.equal(getMobileRouteMeta('/series/serie-1/quadros/novo').backTo, '/series/serie-1?aba=quadros');
assert.equal(getMobileRouteMeta('/series/serie-1/temporadas/t-1').backTo, '/series/serie-1');

// Menu do celular: as abas não têm botão à esquerda; o que abre pela tela Menu volta para ela.
assert.equal(getMobileRouteMeta('/menu').title, 'Menu');
assert.equal(getMobileRouteMeta('/menu').mode, undefined);
assert.equal(getMobileRouteMeta('/criacao').mode, undefined);
assert.equal(getMobileRouteMeta('/biblioteca').mode, undefined);
assert.equal(getMobileRouteMeta('/gravacao').mode, undefined);
for (const pathname of ['/calendario', '/planejamento', '/series', '/editorial', '/analises', '/contas', '/projetos', '/configuracoes']) {
  const meta = getMobileRouteMeta(pathname);
  assert.equal(meta.mode, 'back', `${pathname} should have Voltar`);
  assert.equal(meta.backTo, '/menu', `${pathname} should go back to /menu`);
}

assert.equal(getMobileRouteMeta('/configuracoes/perfil').title, 'Perfil');
assert.equal(getMobileRouteMeta('/configuracoes/dna').title, 'Configurações');
assert.equal(resolveMobileRouteMeta('/calendario').titleVariant, 'compact-center');

console.log('mobileRouteMeta.test.ts passed');
