import assert from 'node:assert/strict';
import { filterCreationContents } from './creationContent.ts';
import { createContentDraft } from './createContentDraft.ts';
import { temaNaoESerie, vincularTemasNoRoteiro } from './temas.ts';

const NOW = '2026-10-04T12:00:00.000Z';

function ids() {
  let n = 0;
  return () => `tema-${++n}`;
}

function roteiroBase() {
  return {
    id: 'roteiro-1',
    seriesId: 'serie-halloween' as string | null,
    pilarId: 'pilar-1',
    funcao: 'atrair' as const,
    temaIds: [] as string[],
  };
}

function testAnexarTemaNaoCriaSerie() {
  const series = [{
    id: 'serie-halloween',
    name: 'Halloween',
    template: 'abertura fixa',
    funcaoPadrao: 'atrair',
    pilarIds: ['pilar-1'],
    slotPadrao: 'ÚNICO',
  }];
  const seriesAntes = structuredClone(series);
  const roteiro = roteiroBase();

  const anexado = vincularTemasNoRoteiro(roteiro, [], ['Halloween'], {
    userId: 'user-1',
    now: NOW,
    novoId: ids(),
  });

  assert.equal(anexado.criados.length, 1);
  assert.equal(anexado.criados[0]?.nome, 'Halloween');
  assert.equal(temaNaoESerie(anexado.criados[0]!), true);
  assert.equal('template' in anexado.criados[0]!, false);
  assert.equal('name' in anexado.criados[0]!, false);
  assert.notEqual(anexado.criados[0]?.id, series[0]?.id);
  assert.deepEqual(anexado.roteiro.temaIds, ['tema-1']);
  assert.equal(anexado.roteiro.seriesId, 'serie-halloween');
  assert.equal(anexado.roteiro.pilarId, 'pilar-1');
  assert.equal(anexado.roteiro.funcao, 'atrair');
  assert.deepEqual(series, seriesAntes);

  const outro = vincularTemasNoRoteiro(
    { ...roteiro, id: 'roteiro-2' },
    anexado.catalogo,
    ['Halloween', 'Natal'],
    { userId: 'user-1', now: NOW, novoId: ids() },
  );
  assert.equal(outro.roteiro.temaIds[0], anexado.roteiro.temaIds[0]);
  assert.equal(outro.criados.length, 1);
  assert.equal(outro.criados[0]?.nome, 'Natal');
  assert.equal(outro.roteiro.seriesId, roteiro.seriesId);
}

function testDesanexarTemaMantemOCatalogo() {
  const criar = { userId: 'user-1', now: NOW, novoId: ids() };
  const anexado = vincularTemasNoRoteiro(roteiroBase(), [], ['Halloween', 'Natal'], criar);
  const semNatal = vincularTemasNoRoteiro(
    anexado.roteiro,
    anexado.catalogo,
    ['Halloween'],
    criar,
  );

  assert.deepEqual(semNatal.roteiro.temaIds, ['tema-1']);
  assert.equal(semNatal.criados.length, 0);
  assert.equal(semNatal.catalogo.length, 2);
  assert.equal(semNatal.catalogo.some(tema => tema.nome === 'Natal'), true);
  assert.equal(semNatal.roteiro.seriesId, 'serie-halloween');
  assert.equal(temaNaoESerie(semNatal.catalogo[0]!), true);
}

function testFiltroDeTemaNaoUsaASerie() {
  const soSerie = createContentDraft({
    id: 'so-serie',
    title: 'Outro',
    seriesId: 'serie-halloween',
    temaIds: [],
    tags: [],
  });
  const comTema = createContentDraft({
    id: 'com-tema',
    title: 'Outro',
    seriesId: null,
    temaIds: ['tema-1'],
    tags: [],
  });
  const temas = [{ id: 'tema-1', nome: 'Halloween' }];

  assert.deepEqual(
    filterCreationContents([soSerie, comTema], {
      tab: 'Roteiros',
      temaId: 'tema-1',
      temas,
    }).map(content => content.id),
    ['com-tema'],
  );

  assert.deepEqual(
    filterCreationContents([soSerie, comTema], {
      tab: 'Roteiros',
      search: 'halloween',
      temas,
    }).map(content => content.id),
    ['com-tema'],
  );

  assert.deepEqual(
    filterCreationContents([soSerie, comTema], {
      tab: 'Roteiros',
      seriesId: 'serie-halloween',
      temas,
    }).map(content => content.id),
    ['so-serie'],
  );
}

const tests: Array<[string, () => void]> = [
  ['anexar tema não cria série', testAnexarTemaNaoCriaSerie],
  ['desanexar tema tira do roteiro e mantém o catálogo', testDesanexarTemaMantemOCatalogo],
  ['filtro de tema não usa a série', testFiltroDeTemaNaoUsaASerie],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
