import assert from 'node:assert/strict';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {filterCreationContents} from '../../contents/lib/creationContent.ts';
import {
  aplicarFiltroData,
  lerFiltroData,
  opcoesDoFiltroData,
  rotuloDoIntervalo,
  valorDoFiltroData,
} from './creationDateFilter.ts';

function testLeEGravaNaUrl() {
  assert.equal(lerFiltroData(new URLSearchParams('')), null);
  assert.deepEqual(lerFiltroData(new URLSearchParams('data=sem')), {modo: 'sem-data'});
  assert.deepEqual(
    lerFiltroData(new URLSearchParams('de=2026-10-11&ate=2026-10-17')),
    {modo: 'intervalo', inicio: '2026-10-11', fim: '2026-10-17'},
  );
  // Intervalo invertido ou data quebrada não filtra.
  assert.equal(lerFiltroData(new URLSearchParams('de=2026-10-17&ate=2026-10-11')), null);
  assert.equal(lerFiltroData(new URLSearchParams('de=ontem&ate=2026-10-11')), null);

  const comPagina = new URLSearchParams('tab=roteiros&page=3&data=sem');
  const intervalo = aplicarFiltroData(comPagina, '2026-10-11~2026-10-17');
  assert.equal(intervalo.get('tab'), 'roteiros');
  assert.equal(intervalo.get('page'), null);
  assert.equal(intervalo.get('data'), null);
  assert.equal(valorDoFiltroData(lerFiltroData(intervalo)), '2026-10-11~2026-10-17');
  assert.equal(aplicarFiltroData(intervalo, '').toString(), 'tab=roteiros');
}

function testOpcoesUsamSemanaDeDomingo() {
  // 15/10/2026 é quinta-feira.
  const hoje = new Date('2026-10-15T12:00:00');
  const opcoes = opcoesDoFiltroData(hoje, null);
  assert.equal(opcoes.find(opcao => opcao.label === 'Esta semana')?.value, '2026-10-11~2026-10-17');
  assert.equal(opcoes.find(opcao => opcao.label === 'Este mês')?.value, '2026-10-01~2026-10-31');

  const doEditorial = opcoesDoFiltroData(hoje, {modo: 'intervalo', inicio: '2026-09-27', fim: '2026-10-03'});
  assert.equal(doEditorial.at(-1)?.value, '2026-09-27~2026-10-03');
  assert.equal(doEditorial.at(-1)?.label, rotuloDoIntervalo('2026-09-27', '2026-10-03'));
  assert.equal(opcoesDoFiltroData(hoje, {modo: 'intervalo', inicio: '2026-10-11', fim: '2026-10-17'}).length, opcoes.length);
}

function testFiltraPelaDataNaGrade() {
  const contents = ['na-semana', 'fora', 'sem-data'].map(id => createContentDraft({id, title: id}));
  const datas = new Map([['na-semana', ['2026-10-12']], ['fora', ['2026-11-02']]]);
  const ids = (filtro: Parameters<typeof filterCreationContents>[1]['filtroData']) => filterCreationContents(contents, {
    tab: 'Todos',
    filtroData: filtro,
    datasNaGrade: datas,
  }).map(content => content.id);

  assert.deepEqual(ids(null), ['na-semana', 'fora', 'sem-data']);
  assert.deepEqual(ids({modo: 'intervalo', inicio: '2026-10-11', fim: '2026-10-17'}), ['na-semana']);
  assert.deepEqual(ids({modo: 'sem-data'}), ['sem-data']);
}

testLeEGravaNaUrl();
testOpcoesUsamSemanaDeDomingo();
testFiltraPelaDataNaGrade();

console.log('creationDateFilter tests passed');
