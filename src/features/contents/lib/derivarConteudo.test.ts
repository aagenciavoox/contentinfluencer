import assert from 'node:assert/strict';
import { createContentDraft } from './createContentDraft.ts';
import { CONTENT_STATUS } from './contentPipeline.ts';
import { derivarConteudo } from './derivarConteudo.ts';

const origem = createContentDraft({
  title: 'Original',
  status: CONTENT_STATUS.POSTADO,
  script: '<p>Texto</p>',
  seriesId: 's1',
  pilarId: 'p1',
  pilarOrigem: 'escolhida',
  funcao: 'atrair',
  funcaoOrigem: 'escolhida',
  legendaBase: 'Legenda',
  postedAt: '2026-10-01T12:00:00.000Z',
  classificacaoCongeladaEm: '2026-10-01T12:00:00.000Z',
  plataformas: [{
    id: 'pub1',
    contentId: 'x',
    platformId: 'ig',
    legenda: 'oi',
    hashtags: '',
    publishDate: '2026-10-01',
    publicationKind: 'post',
    ciclo: 1,
  }],
});

const novo = derivarConteudo(origem, {
  copiar: { script: true, seriesId: true, pilar: true, funcao: true, legendaBase: true },
});

assert.equal(novo.title, '');
assert.equal(novo.origemConteudoId, origem.id);
assert.equal(novo.seriesId, 's1');
assert.equal(novo.script, '<p>Texto</p>');
assert.equal(novo.status, CONTENT_STATUS.ROTEIRO);
assert.equal(novo.plataformas.length, 0);
assert.equal(novo.postedAt, null);
assert.equal(novo.classificacaoCongeladaEm, null);
assert.equal(novo.pilarId, 'p1');
assert.equal(novo.funcao, 'atrair');
assert.equal(novo.legendaBase, 'Legenda');

const semCopia = derivarConteudo(origem);
assert.equal(semCopia.status, CONTENT_STATUS.IDEIA);
assert.equal(semCopia.script, null);
assert.equal(semCopia.origemConteudoId, origem.id);

console.log('ok - derivarConteudo');
