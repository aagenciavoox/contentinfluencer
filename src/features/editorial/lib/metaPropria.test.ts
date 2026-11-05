import assert from 'node:assert/strict';
import { apurarSerie, type ItemDaApuracao, type SerieDaApuracao } from './apuracaoSerie.ts';
import { exclusaoDeMetaPropria, ritmoProprioMarcado, type OndaDaExclusao } from './metaPropria.ts';

const pai = {
  id: 'pai', name: 'Série', ativa: true, tipoAgrupamento: 'serie',
  frequenciaVezes: 2, frequenciaUnidade: 'semana', acompanharContinuidade: true,
} as unknown as SerieDaApuracao;
const quadro = {
  id: 'quadro', name: 'Quadro', parentId: 'pai', ativa: true, tipoAgrupamento: 'quadro',
  frequenciaVezes: 1, frequenciaUnidade: 'semana', acompanharContinuidade: true,
} as unknown as SerieDaApuracao;
const quadroSemMeta = {
  id: 'livre', name: 'Livre', parentId: 'pai', ativa: true, tipoAgrupamento: 'quadro',
} as unknown as SerieDaApuracao;
const series = [pai, quadro, quadroSemMeta];

function item(id: string, serieId: string, temporadaId: string | null = null): ItemDaApuracao {
  return { id, contentId: id, serieId, temporadaId, data: '2026-11-03', tipo: 'post', realizada: false, postItId: null, etapa: 'pauta' } as unknown as ItemDaApuracao;
}

function testQuadroComMetaPropriaSaiDaContaDoPai() {
  const excluir = exclusaoDeMetaPropria(pai, series);
  assert.deepEqual([...(excluir.serieIds ?? [])], ['quadro']);
  const periodo = { inicio: '2026-11-02', fim: '2026-11-08' };
  const itens = [item('a', 'pai'), item('b', 'quadro'), item('c', 'livre')];
  assert.equal(apurarSerie({ serie: pai, series, itens, periodo }).noPeriodo.episodios, 3);
  assert.equal(apurarSerie({ serie: pai, series, itens, periodo, excluir }).noPeriodo.episodios, 2);
  // O próprio quadro continua contando o episódio dele.
  assert.equal(apurarSerie({ serie: quadro, series, itens, periodo, excluir: exclusaoDeMetaPropria(quadro, series) }).noPeriodo.episodios, 1);
}

function testWaveComRitmoProprioSaiDaContaDaSerie() {
  const ondas = [
    { id: 'w1', serieId: 'pai', acompanhar: true, ritmoProprio: true, frequenciaVezes: 1 },
    { id: 'w2', serieId: 'pai', acompanhar: true, ritmoProprio: false, frequenciaVezes: 1 },
    { id: 'w3', serieId: 'pai', acompanhar: false, ritmoProprio: true, frequenciaVezes: 1 },
  ];
  const excluir = exclusaoDeMetaPropria(pai, series, ondas);
  assert.deepEqual([...(excluir.temporadaIds ?? [])], ['w1']);
  const periodo = { inicio: '2026-11-02', fim: '2026-11-08' };
  const itens = [item('a', 'pai', 'w1'), item('b', 'pai', 'w2'), item('c', 'pai', 'w3')];
  assert.equal(apurarSerie({ serie: pai, series, itens, periodo, excluir }).noPeriodo.episodios, 2);
}

function testRascunhoFicaForaDaConta() {
  // Wave em rascunho organiza sem cobrar: sai da conta da série, mesmo sem ritmo próprio.
  const ondas = [{ id: 'r', serieId: 'pai', acompanhar: false, status: 'rascunho' as const }];
  const excluir = exclusaoDeMetaPropria(pai, series, ondas);
  assert.deepEqual([...(excluir.temporadaIds ?? [])], ['r']);
  const periodo = { inicio: '2026-11-02', fim: '2026-11-08' };
  assert.equal(apurarSerie({ serie: pai, series, itens: [item('a', 'pai', 'r'), item('b', 'pai')], periodo, excluir }).noPeriodo.episodios, 1);
  // Série em rascunho abaixo de uma família não entra na conta da família.
  const familia = { id: 'fam', name: 'Família', ativa: true, tipoAgrupamento: 'familia' } as unknown as SerieDaApuracao;
  const rascunho = { id: 'nat', name: 'Natal', parentId: 'fam', ativa: false, status: 'rascunho', tipoAgrupamento: 'serie' } as unknown as SerieDaApuracao;
  const arvore = [familia, rascunho];
  assert.equal(apurarSerie({ serie: familia, series: arvore, itens: [item('x', 'nat'), item('y', 'fam')], periodo }).noPeriodo.episodios, 1);
}

function testToggleDeRitmoProprio() {
  // Caixa do modal: ligada por padrão; desmarcada, a wave volta para a conta da série.
  assert.equal(ritmoProprioMarcado({}), true);
  assert.equal(ritmoProprioMarcado({ ritmoProprio: null }), true);
  assert.equal(ritmoProprioMarcado({ ritmoProprio: false }), false);
  const onda: OndaDaExclusao = { id: 'w', serieId: 'pai', acompanhar: true, frequenciaVezes: 1 };
  const ligada = { ...onda, ritmoProprio: ritmoProprioMarcado(onda) };
  assert.deepEqual([...(exclusaoDeMetaPropria(pai, series, [ligada]).temporadaIds ?? [])], ['w']);
  const desligada = { ...onda, ritmoProprio: false };
  assert.deepEqual([...(exclusaoDeMetaPropria(pai, series, [desligada]).temporadaIds ?? [])], []);
}

testQuadroComMetaPropriaSaiDaContaDoPai();
testToggleDeRitmoProprio();
testRascunhoFicaForaDaConta();
testWaveComRitmoProprioSaiDaContaDaSerie();
console.log('metaPropria.test.ts ok');
