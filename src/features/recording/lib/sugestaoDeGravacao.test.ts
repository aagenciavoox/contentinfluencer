import assert from 'node:assert/strict';
import type {Cenario, Content, EnergiaNivel, Look, RecordingBlock, Serie} from '../../../lib/database.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {DEFAULT_EDITORIAL_SETTINGS} from '../../editorial/lib/editorialSettings.ts';
import {prontoParaGravar, entraNoBloco} from './blocoDeGravacao.ts';
import {energiaCompativel, montarBlocoComEnergia, primeirosParaBloco, sugerirGravacao, type ContextoSugestaoDeGravacao} from './sugestaoDeGravacao.ts';

const hoje = '2026-11-06'; // sexta, semana 02–08/11
const criar = (id: string, patch: Partial<Content> = {}) => createContentDraft({
  id, title: `Roteiro ${id}`, status: 'Roteiro', script: '<p>Texto para gravar</p>', notes: '',
  energiaNecessaria: 'baixa', updatedAt: '2026-11-01T12:00:00Z', ...patch,
});
const base: ContextoSugestaoDeGravacao = {contents: [], blocks: [], series: [], postIts: [], settings: DEFAULT_EDITORIAL_SETTINGS, platforms: [], hoje};
const escolha = {energia: 'alta' as const, lookId: null, cenarioId: null};
const sugerir = (contents: Content[], patch: Partial<Parameters<typeof sugerirGravacao>[0]> = {}) => sugerirGravacao({...base, ...escolha, contents, ...patch});
const pontos = (content: Content, patch: Partial<Parameters<typeof sugerirGravacao>[0]> = {}) => sugerir([content], patch)[0].pontos;

// Todos os pesos isolados, cumulativos, e os limites das datas locais.
assert.equal(pontos(criar('hoje', {recordingDate: hoje})), 100);
assert.equal(pontos(criar('ontem', {recordingDate: '2026-11-05'})), 0);
for (const [publishDate, valor] of [['2026-11-07', 80], ['2026-11-08', 40], ['2026-11-09', 20], ['2026-11-10', 0], [hoje, 0], ['2026-11-05', 0]] as const) {
  assert.equal(pontos(criar('prazo', {publishDate})), valor);
}
assert.equal(pontos(criar('look', {lookId: 'l'}), {lookId: 'l'}), 30);
assert.equal(pontos(criar('cenario', {cenarioId: 'c'}), {cenarioId: 'c'}), 30);
assert.equal(pontos(criar('exata'), {energia: 'baixa'}), 10);
assert.equal(pontos(criar('tudo', {recordingDate: hoje, publishDate: '2026-11-07', lookId: 'l', cenarioId: 'c'}), {energia: 'baixa', lookId: 'l', cenarioId: 'c'}), 250);
assert.equal(pontos(criar('virada', {publishDate: '2026-12-01'}), {hoje: '2026-11-30'}), 80);
assert.equal(pontos(criar('ano', {publishDate: '2027-01-01'}), {hoje: '2026-12-31'}), 80);
assert.equal(pontos(criar('invalida', {publishDate: 'invalida'})), 0);

// Todas as combinações cumulativas; energia herdada e roteiro sobrescrevendo a série.
for (const [energia, aceitas] of [['baixa', ['baixa']], ['média', ['baixa', 'média']], ['alta', ['baixa', 'média', 'alta']]] as const) {
  const contents = (['baixa', 'média', 'alta'] as EnergiaNivel[]).map(nivel => criar(nivel, {energiaNecessaria: nivel}));
  const sem = criar('sem', {energiaNecessaria: null, recordingDate: hoje, publishDate: '2026-11-07'});
  const resultado = sugerir([...contents, sem], {energia});
  assert.deepEqual(new Set(resultado.slice(0, -1).map(item => item.energia)), new Set(aceitas));
  assert.equal(resultado.at(-1)!.content.id, 'sem', 'sem energia fica no fim mesmo com mais pontos');
  assert.equal(energiaCompativel(null, energia), true);
}
const serie = {id: 's', name: 'Série', energiaPadrao: 'alta', acompanharContinuidade: true, frequenciaVezes: 2, frequenciaUnidade: 'semana'} as Serie;
assert.deepEqual(sugerir([criar('herda', {seriesId: 's', energiaNecessaria: null}), criar('propria', {seriesId: 's', energiaNecessaria: 'baixa'})], {series: [serie], energia: 'baixa'}).map(item => item.content.id), ['propria']);
assert.equal(sugerir([criar('herda', {seriesId: 's', energiaNecessaria: null})], {series: [serie]})[0].energia, 'alta');

// Exatamente a elegibilidade compartilhada, inclusive produção sem texto e roteiro com corpo leve.
const blocks = [{id: 'bloco', contents: [{contentId: 'em-bloco'}]}] as RecordingBlock[];
const candidatos = [criar('roteiro'), criar('producao', {status: 'Produção', script: ''}), criar('leve', {script: undefined, notes: undefined}),
  criar('vazio', {script: ''}), criar('carrossel', {writingMode: 'carrossel'}), criar('em-bloco'), criar('ideia', {status: 'Ideia'}),
  criar('edicao', {status: 'Edição'}), criar('arquivado', {archivedAt: hoje}), criar('lixeira', {deletedAt: hoje})];
assert.deepEqual(sugerir(candidatos, {blocks}).map(item => item.content.id), candidatos.filter(content => entraNoBloco(content, blocks)).map(content => content.id));

// +25 vem da continuidade real: não replica o cálculo, respeita acompanhamento e pausas.
const deSerie = criar('da-serie', {seriesId: 's'});
assert.equal(pontos(deSerie, {series: [serie]}), 25);
assert.equal(pontos(deSerie, {series: [{...serie, acompanharContinuidade: false}]}), 0);
assert.equal(pontos(deSerie, {series: [{...serie, frequenciaUnidade: 'sob-demanda'}]}), 0);
const publicado = criar('publicado', {status: 'Publicado', publishDate: '2026-11-04', postedAt: '2026-11-04T12:00:00Z', seriesId: 's'});
const publicado2 = {...publicado, id: 'publicado2', publishDate: '2026-11-05', postedAt: '2026-11-05T12:00:00Z'};
assert.equal(sugerir([deSerie, publicado, publicado2], {series: [serie]})[0].pontos, 0, 'ritmo coberto não dá bônus');
assert.equal(pontos(deSerie, {series: [serie], settings: {...base.settings, pausas: [{id: 'pausa', inicio: '2026-11-02', fim: '2026-11-08', escopo: 'serie', serieId: 's', platformId: null, nota: ''}]}}), 0);

// Os pesos se somam, e as pausas parciais também usam a regra da Saúde.
const completo = criar('completo', {seriesId: 's', recordingDate: hoje, publishDate: '2026-11-07', lookId: 'l', cenarioId: 'c', temaIds: ['t'], bibliotecaItemId: 'o'});
const jaNaSemana = criar('ja-na-semana', {status: 'Publicado', postedAt: '2026-11-04T12:00:00Z', publishDate: '2026-11-04', temaIds: ['t'], bibliotecaItemId: 'o'});
assert.equal(sugerir([completo, jaNaSemana], {series: [{...serie, frequenciaVezes: 3}], energia: 'baixa', lookId: 'l', cenarioId: 'c'})[0].pontos, 260);
assert.equal(pontos(deSerie, {series: [serie], settings: {...base.settings, pausas: [{id: 'parcial', inicio: '2026-11-02', fim: '2026-11-03', escopo: 'serie', serieId: 's', platformId: null, nota: ''}]}}), 0);
const quadro = {...serie, id: 'q', name: 'Quadro', parentId: 's', tipoAgrupamento: 'quadro', frequenciaVezes: 1} as Serie;
assert.equal(pontos(criar('quadro', {seriesId: 'q'}), {series: [serie, quadro]}), 25, 'bônus único, não duplica por série e quadro');
const onda = {id: 'onda', serieId: 's', nome: 'Wave', acompanhar: true, ritmoProprio: true, frequenciaVezes: 1, frequenciaUnidade: 'semana', status: 'ativa' as const};
assert.equal(pontos(criar('onda', {seriesId: 's', temporadaId: 'onda'}), {series: [serie], temporadas: [onda]}), 25);
assert.equal(pontos(deSerie, {series: [{...serie, frequenciaAPartirDe: '2026-12-01'}]}), 0);

// Mesma obra OU assunto: -15 uma vez só, mesmo com vários itens, publicado e post-it conciliados.
const alvo = criar('alvo', {temaIds: ['t'], bibliotecaItemId: 'o'});
const nota = (id: string, contentId: string, date: string) => ({id, contentId, date, userId: '', texto: '', createdAt: '', updatedAt: ''});
for (const data of ['2026-11-02', '2026-11-08']) {
  const outro = criar('outro', {status: 'Publicado', postedAt: `${data}T12:00:00Z`, publishDate: data, temaIds: ['t'], bibliotecaItemId: 'o'});
  const resultado = sugerir([alvo, outro], {postIts: [nota('p', 'outro', data)]})[0];
  assert.equal(resultado.pontos, -15);
  assert.equal(resultado.motivos.filter(motivo => motivo.includes('nesta semana')).length, 1);
}
for (const data of ['2026-11-01', '2026-11-09']) {
  assert.equal(sugerir([alvo, criar('fora', {status: 'Publicado', publishDate: data, postedAt: `${data}T12:00:00Z`, temaIds: ['t'], bibliotecaItemId: 'o'})])[0].pontos, 0);
}
const soTema = criar('so-tema', {status: 'Produção', publishDate: hoje, temaIds: ['t']});
const soObra = criar('so-obra', {status: 'Produção', publishDate: hoje, livroIds: ['o']});
assert.equal(sugerir([alvo, soTema]).find(item => item.content.id === 'alvo')!.pontos, -15);
assert.equal(sugerir([alvo, soObra]).find(item => item.content.id === 'alvo')!.pontos, -15);
assert.equal(sugerir([{...alvo, publishDate: hoje}])[0].pontos, 0, 'não se penaliza por si mesmo');
assert.equal(sugerir([alvo, soTema, soObra]).find(item => item.content.id === 'alvo')!.pontos, -15);
const reserva = criar('reserva', {temaIds: ['t']});
assert.equal(sugerir([alvo, reserva], {postIts: [nota('reserva-p', reserva.id, hoje)]}).find(item => item.content.id === 'alvo')!.pontos, -15);

// Desempates por publicação mais próxima, depois atualização mais recente; ordem estável.
const empates = [criar('sem-data'), criar('depois', {publishDate: '2026-11-20'}), criar('antigo', {publishDate: '2026-11-15'}), criar('novo', {publishDate: '2026-11-15', updatedAt: '2026-11-05T10:00:00Z'}), criar('igual', {publishDate: '2026-11-15', updatedAt: '2026-11-05T10:00:00Z'})];
const snapshot = JSON.stringify(empates);
assert.deepEqual(sugerir(empates).map(item => item.content.id), ['novo', 'igual', 'antigo', 'depois', 'sem-data']);
assert.equal(JSON.stringify(empates), snapshot, 'não altera entrada nem ordem manual');
assert.deepEqual(sugerir([criar('a', {updatedAt: '2026-11-05T10:00:00-03:00'}), criar('b', {updatedAt: '2026-11-05T12:00:00Z'})]).map(item => item.content.id), ['a', 'b']);

// Topo compatível, limite próprio/fallback e montagem com o mecanismo existente.
const escolhaContexto = {...escolha, lookId: 'l', cenarioId: 'c'};
const sugestoes = sugerir([criar('conflito', {lookId: 'outro', recordingDate: hoje}), criar('contexto', {lookId: 'l', cenarioId: 'c'}), criar('livre'), criar('cenario-diferente', {cenarioId: 'outro'})], escolhaContexto);
assert.deepEqual(primeirosParaBloco(sugestoes, escolhaContexto, 2).map(content => content.id), ['contexto', 'livre']);
assert.equal(primeirosParaBloco(sugestoes, escolhaContexto, 1).length, 1);
const muitos = sugerir(Array.from({length: 8}, (_, i) => criar(`n${i}`)));
assert.equal(primeirosParaBloco(muitos, escolha).length, 5);
assert.equal(primeirosParaBloco(muitos, escolha, null).length, 5);
assert.equal(primeirosParaBloco(muitos, escolha, 0).length, 5);
assert.equal(primeirosParaBloco(muitos, escolha, 3).length, 3);
const contents = primeirosParaBloco(sugestoes, escolhaContexto, 2);
const look = {id: 'l', descricao: 'Camisa azul', numero: 2} as Look;
const cenario = {id: 'c', nome: 'Mesa'} as Cenario;
const {block, blockContents} = montarBlocoComEnergia({...escolhaContexto, id: 'b', userId: 'u', hoje, contents, looks: [look], cenarios: [cenario], now: '2026-11-06T12:00:00Z'});
assert.equal(block.name, 'Gravação 06/11 · energia alta');
assert.equal(block.lookLabel, 'Camisa azul');
assert.equal(block.cenarioLabel, 'Mesa');
assert.deepEqual(blockContents.map(item => [item.contentId, item.ordem]), [['contexto', 0], ['livre', 1]]);
assert.equal(prontoParaGravar(contents[0]).status, 'Produção');
assert.equal(contents[0].status, 'Roteiro');
assert.equal(montarBlocoComEnergia({...escolha, id: 'b', userId: 'u', hoje, contents, looks: [], cenarios: []}).block.lookLabel, null);
console.log('sugestaoDeGravacao: ok');
