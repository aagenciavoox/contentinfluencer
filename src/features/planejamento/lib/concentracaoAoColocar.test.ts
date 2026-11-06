import assert from 'node:assert/strict';
import type {Content, Tema} from '../../../lib/database.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {DEFAULT_EDITORIAL_SETTINGS} from '../../editorial/lib/editorialSettings.ts';
import {avisosDeConcentracaoNoPlano, colocarEAvisarConcentracao, concentracaoAoColocar, novosAvisosDaAcao} from './concentracaoAoColocar.ts';
import {encaixarConteudo, movePostIt, pullExistingContent, savePostItEdit, type PlanejamentoPostIt} from './postIt.ts';
import {levarRoteiroAoDia} from './postItsNaData.ts';

const periodo = {inicio: '2026-11-01', fim: '2026-11-30'};
const date = '2026-11-06';
const contexto = {
  periodo, series: [], platforms: [], temas: [{id: 't', nome: 'Leitura'} as Tema],
  obras: [{id: 'o', titulo: 'Livro'}], settings: DEFAULT_EDITORIAL_SETTINGS,
};
const conteudo = (id: string, partial: Partial<Content> = {}) => createContentDraft({
  id, status: CONTENT_STATUS.ROTEIRO, bibliotecaItemId: 'o', temaIds: ['t'], ...partial,
});
const nota = (id: string, contentId: string | null, dia: string | null): PlanejamentoPostIt => ({
  id, contentId, date: dia, userId: '', texto: 'Ideia para desenvolver', createdAt: '', updatedAt: '',
});
const contents = [conteudo('c1'), conteudo('c2'), conteudo('c3')];
const antes = {contents, postIts: [nota('p1', 'c1', '2026-11-04'), nota('p2', 'c2', null), nota('p3', 'c3', null)]};
const depois = {contents, postIts: antes.postIts.map(p => p.date ? p : movePostIt(p, date))};
const acao = {...contexto, antes, depois, date, postItIds: ['p2', 'p3'], contentIds: ['c2', 'c3']};

// Drop múltiplo: os dois tipos disparam, com os textos da faixa e tom informativo.
const novos = concentracaoAoColocar(acao);
assert.deepEqual(novos.map(a => a.tipo), ['obra-repetida', 'tema-concentrado', 'tema-concentrado']);
assert.ok(novos.every(a => a.severidade === 'info'));
assert.deepEqual(novos.map(a => a.texto), avisosDeConcentracaoNoPlano({...contexto, ...depois}).map(a => a.texto));
assert.deepEqual(antes.postIts.map(p => p.date), ['2026-11-04', null, null], 'cálculo não muda o plano');
assert.deepEqual(concentracaoAoColocar({...acao, date: null}), [], 'Sem data não avisa');

// Exceções vigentes calam só seus alvos; as vencidas não calam.
const excecoes = [
  {id: 'e1', tipo: 'obra' as const, alvoId: 'o', platformId: null, inicio: '2026-10-01', fim: '2026-12-31', nota: ''},
  {id: 'e2', tipo: 'assunto' as const, alvoId: 't', platformId: null, inicio: '2026-10-01', fim: '2026-12-31', nota: ''},
];
assert.deepEqual(concentracaoAoColocar({...acao, settings: {...contexto.settings, excecoesConcentracao: excecoes}}), []);
assert.equal(concentracaoAoColocar({...acao, settings: {...contexto.settings, excecoesConcentracao: excecoes.map(e => ({...e, fim: '2026-10-31'}))}}).length, 3);
assert.deepEqual(concentracaoAoColocar({...acao, settings: {...contexto.settings, concentracao: {...contexto.settings.concentracao, obraRepeticoes: 4, assuntoMinPautas: 4, assuntoRepeticoes: 4}}}), []);

// Aviso já existente não volta, nem se o texto ou a data inicial da obra mudarem.
const jaComObra = {...antes, postIts: antes.postIts.map(p => p.id === 'p2' ? movePostIt(p, '2026-11-05') : p)};
assert.deepEqual(concentracaoAoColocar({...acao, antes: jaComObra}).map(a => a.tipo), ['tema-concentrado']);
assert.deepEqual(concentracaoAoColocar({...acao, antes: depois}), []);
const antigo = {...novos[0], id: 'obra:o:2026-11-05'};
assert.deepEqual(novosAvisosDaAcao({antes: [antigo], depois: [novos[0]], date, postItIds: ['p2'], contentIds: []}), []);
assert.deepEqual(novosAvisosDaAcao({antes: [], depois: novos, date, postItIds: ['outra-nota'], contentIds: ['outro']}), [], 'aviso novo sem item da ação não conta');

// Pull e editor passam snapshots reais para o mesmo cálculo.
const puxado = pullExistingContent({postIts: [antes.postIts[0]], content: contents[1], date});
assert.ok(puxado.pulled);
assert.equal(concentracaoAoColocar({...acao, antes: {...antes, postIts: [antes.postIts[0]]}, depois: {contents, postIts: puxado.postIts}, postItIds: [], contentIds: ['c2']})[0]?.tipo, 'obra-repetida');
const editado = savePostItEdit(antes.postIts[1], {texto: 'Roteiro escolhido', date});
assert.equal(concentracaoAoColocar({...acao, depois: {...antes, postIts: [antes.postIts[0], editado]}, postItIds: ['p2'], contentIds: []})[0]?.tipo, 'obra-repetida');

// Encaixe em post-it com dia: o vínculo sozinho pode disparar o aviso. Sem dia, não.
const solto = nota('solto', null, date);
const ligado = encaixarConteudo({postIts: [antes.postIts[0], solto], postItId: solto.id, content: contents[1]});
assert.ok(ligado.ok);
if (ligado.ok) {
  const encaixe = {...acao, antes: {...antes, postIts: [antes.postIts[0], solto]}, depois: {...antes, postIts: [antes.postIts[0], ligado.postIt]}, postItIds: ['solto'], contentIds: ['c2']};
  assert.equal(concentracaoAoColocar(encaixe)[0]?.tipo, 'obra-repetida');
  assert.deepEqual(concentracaoAoColocar({...encaixe, date: null}), []);
}

// Publicado sem post-it entra pelo mesmo caminho da Saúde, uma única vez.
const publicado = conteudo('publicado', {status: CONTENT_STATUS.POSTADO, postedAt: '2026-11-04T12:00:00Z', publishDate: '2026-11-04'});
const comPublicado = {contents: [publicado, contents[1]], postIts: [nota('publicado-nota', publicado.id, '2026-11-04'), nota('p2', 'c2', null)]};
const depoisPublicado = {...comPublicado, postIts: comPublicado.postIts.map(p => p.id === 'p2' ? movePostIt(p, date) : p)};
const avisoPublicado = concentracaoAoColocar({...acao, antes: comPublicado, depois: depoisPublicado, postItIds: ['p2'], contentIds: ['c2']});
assert.equal(avisoPublicado.length, 2);
assert.equal(avisoPublicado.filter(a => a.tipo === 'obra-repetida').length, 1);
assert.ok(avisoPublicado.every(a => a.contentIds.filter(id => id === 'publicado').length === 1));
assert.match(avisoPublicado[0].texto, /^2 pautas/);
assert.ok(avisoPublicado[0].contentIds.includes('publicado'));

// Também vale para cartão do Calendário sem post-it, que altera a data oficial.
const oficial = conteudo('c2', {publishDate: '2026-12-10'});
const calendarioAntes = {contents: [publicado, oficial], postIts: []};
const movido = levarRoteiroAoDia(oficial, date);
assert.ok(movido);
assert.equal(concentracaoAoColocar({...acao, antes: calendarioAntes, depois: {contents: [publicado, movido!], postIts: []}, postItIds: [], contentIds: ['c2']})[0]?.tipo, 'obra-repetida');

// Janela de obra cruza o mês, e respeita o tamanho configurado no Editorial.
const bordaAntes = {contents, postIts: [nota('p1', 'c1', '2026-10-31'), nota('p2', 'c2', null)]};
const bordaDepois = {...bordaAntes, postIts: [bordaAntes.postIts[0], movePostIt(bordaAntes.postIts[1], '2026-11-02')]};
assert.equal(concentracaoAoColocar({...acao, antes: bordaAntes, depois: bordaDepois})[0]?.tipo, 'obra-repetida');

// Commit é imediato; o aviso só aparece após concluir, uma chamada mesmo com dois textos.
let concluir!: () => void;
let executou = false;
let momentos = 0;
const salvando = colocarEAvisarConcentracao(acao, () => {
  executou = true;
  return new Promise<void>(resolve => {concluir = resolve;});
}, avisos => {momentos++; assert.equal(avisos.length, 3);});
assert.ok(executou);
assert.equal(momentos, 0);
concluir();
await salvando;
assert.equal(momentos, 1);
await colocarEAvisarConcentracao({...acao, date: null}, () => {executou = true;}, () => {throw new Error('Sem data não avisa');});
await colocarEAvisarConcentracao(acao, () => Promise.reject(new Error('falha simulada')), () => {throw new Error('Não avisa gravação sem sucesso');});

// Mesmo recorte de redes/formato da faixa: um roteiro oculto não dispara o toast.
assert.deepEqual(concentracaoAoColocar({...acao, filtro: {redes: ['youtube'], formato: null}}), []);

// Toggle ligado colapsa série + obra; desligado volta a avisar nas duas janelas.
const mesmaSerie = contents.map(content => ({...content, seriesId: 's'}));
const par = {contents: mesmaSerie, postIts: depois.postIts.slice(0, 2)};
assert.deepEqual(avisosDeConcentracaoNoPlano({...contexto, ...par}), []);
const desligado = {...contexto.settings, concentracao: {...contexto.settings.concentracao, contarSequencia: false}};
assert.deepEqual(avisosDeConcentracaoNoPlano({...contexto, ...par, settings: desligado}).map(a => a.tipo), ['obra-repetida', 'tema-concentrado']);
// Janela própria de assunto busca margem maior que a da obra, inclusive publicado sem post-it.
const longo = {...contexto.settings, concentracao: {...contexto.settings.concentracao, assuntoJanelaDias: 30, obraJanelaDias: 1}};
const publicadoFora = {...publicado, publishDate: '2026-10-15', postedAt: '2026-10-15T12:00:00Z'};
const bordaAssunto = avisosDeConcentracaoNoPlano({...contexto, settings: longo, contents: [publicadoFora, contents[1]], postIts: [nota('p2', 'c2', '2026-11-02')]});
assert.ok(bordaAssunto.some(a => a.id.startsWith('tema-janela:') && a.contentIds.includes('publicado')));
