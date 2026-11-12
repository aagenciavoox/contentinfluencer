import assert from 'node:assert/strict';
import {
  colunasDaFrequencia,
  avisoDaContinuidade,
  destinosDeQuadro,
  episodioDaLinha,
  erroDaTemporadaDoConteudo,
  erroDoVinculo,
  itemDoRpc,
  novaOrdem,
  ordemFinalNoFim,
  planoMover,
  resolverTemporada,
  serieDaLinha,
  temporadaDaLinha,
  temporadasComuns,
  tipoDaSerie,
  tipoSugeridoParaFilho,
} from './serieEstrutura.ts';

const series = [
  {id: 'fam', name: 'Família', tipo_agrupamento: 'familia'},
  {id: 's1', name: 'Série 1', parent_id: 'fam', tipo_agrupamento: 'serie', usa_temporadas: true, pilar_principal_id: 'p1', funcao_padrao: 'atrair'},
  {id: 'q1', name: 'Quadro A', parent_id: 's1', tipo_agrupamento: 'quadro', pilar_principal_id: 'p2', funcao_padrao: 'aprofundar'},
  {id: 'q2', name: 'Quadro B', parent_id: 's1', tipo_agrupamento: 'quadro', ativa: false},
  {id: 's2', name: 'Série 2', usa_temporadas: true},
].map(serieDaLinha);
const temporadas = [
  {id: 't1', serie_id: 's1', nome: 'Temporada 1', created_at: '2026-01-01'},
  {id: 't2', serie_id: 's1', nome: 'Temporada 2', created_at: '2026-01-02'},
  {id: 't9', serie_id: 's2', nome: 'Outra', created_at: '2026-01-03'},
].map(temporadaDaLinha);

// Tipo: escolhido vale; sem escolha, deduz pela árvore.
assert.equal(tipoDaSerie('q1', series), 'quadro');
assert.equal(tipoDaSerie('s2', series), 'serie');
assert.equal(tipoDaSerie('x', [serieDaLinha({id: 'r'}), serieDaLinha({id: 'f', parent_id: 'r'}), serieDaLinha({id: 'x', parent_id: 'f'})]), 'quadro');
assert.equal(tipoSugeridoParaFilho('s1', series), 'quadro');
assert.equal(tipoSugeridoParaFilho('fam', series), 'serie');

// Vínculo: quadro precisa de série, sem ciclo, pai precisa existir.
assert.equal(erroDoVinculo('quadro', null, 'novo', series), 'Escolha a série deste quadro.');
assert.equal(erroDoVinculo('quadro', 's1', 'novo', series), null);
assert.equal(erroDoVinculo('quadro', 'q1', 'novo', series), 'Um quadro só pode ficar dentro de uma série.');
assert.equal(erroDoVinculo('serie', 's2', 'novo', series), 'Uma série só pode fazer parte de uma família.');
assert.equal(erroDoVinculo('familia', 'fam', 'novo', series), 'Uma família não fica dentro de outro agrupamento.');
assert.equal(erroDoVinculo('serie', 's1', 's1', series), 'Um agrupamento não pode ficar dentro de si mesmo.');
assert.equal(erroDoVinculo('serie', 'fam', 'fam', series), 'Um agrupamento não pode ficar dentro de si mesmo.');
assert.match(erroDoVinculo('quadro', 'nao-existe', 'novo', series) ?? '', /não encontrado/);

// Frequência como o formulário do app.
const vazia = {vezes: null, unidade: null, aPartirDe: null};
const FRASE_SEMANAL = (colunasDaFrequencia({vezes: 1, unidade: 'semana'}, vazia, 'serie') as {colunas: Record<string, unknown>}).colunas.frequencia_recomendada;
assert.equal(colunasDaFrequencia({}, vazia, 'serie'), null);
assert.deepEqual(colunasDaFrequencia({vezes: 1, unidade: 'semana', a_partir_de: '2026-11-09'}, vazia, 'serie'), {colunas: {
  frequencia_vezes: 1, frequencia_unidade: 'semana', frequencia_a_partir_de: '2026-11-09', frequencia_recomendada: FRASE_SEMANAL,
}});
assert.deepEqual(colunasDaFrequencia({unidade: 'mes'}, vazia, 'serie'), {colunas: {
  frequencia_vezes: 1, frequencia_unidade: 'mes', frequencia_a_partir_de: null, frequencia_recomendada: 'Mensal',
}});
assert.deepEqual(colunasDaFrequencia({vezes: 2}, {vezes: 1, unidade: 'quinzena', aPartirDe: '2026-01-01'}, 'serie'), {colunas: {
  frequencia_vezes: 2, frequencia_unidade: 'quinzena', frequencia_a_partir_de: '2026-01-01', frequencia_recomendada: '2 por quinzena',
}});
assert.deepEqual(colunasDaFrequencia({unidade: 'sob-demanda'}, vazia, 'serie'), {colunas: {
  frequencia_vezes: null, frequencia_unidade: null, frequencia_a_partir_de: null, frequencia_recomendada: 'Sob demanda',
}});
assert.equal((colunasDaFrequencia({unidade: null}, vazia, 'quadro') as {colunas: Record<string, unknown>}).colunas.frequencia_recomendada, 'Sob demanda');
assert.equal((colunasDaFrequencia({unidade: null}, vazia, 'serie') as {colunas: Record<string, unknown>}).colunas.frequencia_recomendada, null);
assert.ok('erro' in (colunasDaFrequencia({a_partir_de: '2026-01-01'}, vazia, 'serie') ?? {}));
// A cada 14 dias sem data de início: o ciclo não tem âncora, então não grava (como no formulário do app).
assert.ok('erro' in (colunasDaFrequencia({vezes: 1, unidade: 'quinzena'}, vazia, 'serie') ?? {}));
assert.ok('erro' in (colunasDaFrequencia({vezes: 2}, {vezes: 1, unidade: 'quinzena', aPartirDe: null}, 'serie') ?? {}));
assert.ok('colunas' in (colunasDaFrequencia({vezes: 1, unidade: 'quinzena', a_partir_de: '2026-11-08'}, vazia, 'serie') ?? {}));
assert.deepEqual(colunasDaFrequencia({vezes: 1, unidade: 'trimestre'}, vazia, 'serie'), {colunas: {
  frequencia_vezes: 1, frequencia_unidade: 'trimestre', frequencia_a_partir_de: null, frequencia_recomendada: 'Trimestral',
}});

// Continuidade: família não; sem frequência vira pendência.
assert.ok(avisoDaContinuidade(true, 'familia', true).erro);
assert.ok(avisoDaContinuidade(true, 'quadro', false).aviso);
assert.deepEqual(avisoDaContinuidade(true, 'serie', true), {});
assert.deepEqual(avisoDaContinuidade(false, 'familia', false), {});

// Temporada do conteúdo: precisa de série e do escopo dela; quadro usa as da série.
assert.equal(erroDaTemporadaDoConteudo('t1', 'q1', series, temporadas), null);
assert.equal(erroDaTemporadaDoConteudo(null, null, series, temporadas), null);
assert.match(erroDaTemporadaDoConteudo('t1', null, series, temporadas) ?? '', /dentro de uma série/);
assert.match(erroDaTemporadaDoConteudo('t9', 'q1', series, temporadas) ?? '', /não é da série/);
assert.equal(resolverTemporada('temporada 2', 's1', temporadas)?.id, 't2');
assert.equal(resolverTemporada('t9', 's1', temporadas)?.id, 't9');
assert.deepEqual(destinosDeQuadro('s1', series), ['s1', 'q1']);

// Mover: só pilar e objetivo herdados mudam; manual e congelado ficam; temporada fora do escopo cai.
const eps = [
  {id: 'e1', title: 'Um', series_id: 's1', temporada_id: 't1', ordem_episodio: 1, pilar_id: 'p1', pilar_origem: 'herdada', funcao: 'atrair', funcao_origem: 'herdada', created_at: '1'},
  {id: 'e2', title: 'Dois', series_id: 's1', ordem_episodio: 2, pilar_id: 'px', pilar_origem: 'escolhida', funcao: 'reter', funcao_origem: 'escolhida', created_at: '2'},
  {id: 'e3', title: 'Três', series_id: 'q1', ordem_episodio: 3, pilar_id: 'p2', pilar_origem: 'herdada', funcao: 'aprofundar', funcao_origem: 'herdada', created_at: '3'},
  {id: 'e4', title: 'Quatro', series_id: 's1', ordem_episodio: 4, pilar_id: 'p1', pilar_origem: 'herdada', funcao: 'atrair', funcao_origem: 'herdada', classificacao_congelada_em: '2026-01-01', created_at: '4'},
].map(episodioDaLinha);
const plano = planoMover(eps, {quadroId: 'q1', temporada: 'manter'}, series, temporadas);
assert.deepEqual(plano.jaNoDestino, ['e3']);
const [e1, e2, e4] = plano.mudam;
assert.deepEqual(itemDoRpc(e1), {id: 'e1', series_id: 'q1', temporada_id: 't1', pilar_id: 'p2', pilar_origem: 'herdada', funcao: 'aprofundar', funcao_origem: 'herdada'});
assert.deepEqual(itemDoRpc(e2), {id: 'e2', series_id: 'q1', temporada_id: null, pilar_id: 'px', pilar_origem: 'escolhida', funcao: 'reter', funcao_origem: 'escolhida'});
assert.deepEqual(itemDoRpc(e4), {id: 'e4', series_id: 'q1', temporada_id: null, pilar_id: 'p1', pilar_origem: 'herdada', funcao: 'atrair', funcao_origem: 'herdada'});
// Para outra série, a temporada t1 deixa de valer e é avisada.
const paraS2 = planoMover([eps[0]], {quadroId: 's2', temporada: 'manter'}, series, temporadas);
assert.equal(paraS2.mudam[0].temporadaId, null);
assert.deepEqual(paraS2.perdemTemporada, ['e1']);
// Só temporada: quadro e o resto não mudam.
const soTemporada = planoMover(eps, {temporada: 't2'}, series, temporadas);
assert.deepEqual(soTemporada.mudam.map(item => [item.id, item.seriesId, item.temporadaId, item.pilarId]), [
  ['e1', 's1', 't2', 'p1'], ['e2', 's1', 't2', 'px'], ['e3', 'q1', 't2', 'p2'], ['e4', 's1', 't2', 'p1'],
]);
assert.deepEqual(temporadasComuns(eps, series, temporadas).map(item => item.id), ['t1', 't2']);
assert.deepEqual(temporadasComuns([...eps, episodioDaLinha({id: 'z', series_id: 's2'})], series, temporadas), []);

// Ordem: quem muda vai para o fim; pedido parcial troca só as posições pedidas.
assert.deepEqual(ordemFinalNoFim(eps, new Set(['e1', 'e2'])), ['e3', 'e4', 'e1', 'e2']);
assert.deepEqual(novaOrdem(eps, ['e4', 'e3', 'e2', 'e1']), {ordem: ['e4', 'e3', 'e2', 'e1']});
assert.deepEqual(novaOrdem(eps, ['e3', 'e1']), {ordem: ['e3', 'e2', 'e1', 'e4']});
assert.ok('erro' in novaOrdem(eps, ['e1', 'e1']));
assert.ok('erro' in novaOrdem(eps, ['fora']));

// "aplicada" sem valor não recebe o da série; quadro "sem pilar" não herda o pilar da série.
const semPilar = [...series, serieDaLinha({id: 'q3', name: 'Quadro C', parent_id: 's1', tipo_agrupamento: 'quadro', sem_pilar: true})];
const aplicada = episodioDaLinha({id: 'e5', series_id: 's1', pilar_origem: 'herdada', pilar_id: 'p1', funcao_origem: 'aplicada', funcao: null, created_at: '5'});
const movida = planoMover([aplicada], {quadroId: 'q3', temporada: 'manter'}, semPilar, temporadas).mudam[0];
assert.deepEqual([movida.pilarId, movida.pilarOrigem, movida.funcao, movida.funcaoOrigem], [null, 'herdada', null, 'aplicada']);

// Regra de Ouro: série no máximo 1 por semana (janelas maiores, o equivalente); quadro não grava meta.
assert.match((colunasDaFrequencia({vezes: 2, unidade: 'semana'}, vazia, 'serie') as {erro: string}).erro, /Regra de Ouro/);
assert.match((colunasDaFrequencia({vezes: 3}, {vezes: 1, unidade: 'quinzena', aPartirDe: '2026-01-01'}, 'serie') as {erro: string}).erro, /até 2 a cada 14 dias/);
assert.ok('colunas' in (colunasDaFrequencia({vezes: 4, unidade: 'mes'}, vazia, 'serie') ?? {}));
assert.match((colunasDaFrequencia({vezes: 1, unidade: 'semana'}, vazia, 'quadro') as {erro: string}).erro, /sob demanda/);
assert.match(avisoDaContinuidade(true, 'quadro', true).aviso ?? '', /sob demanda/);

console.log('serieEstrutura ok');
