import assert from 'node:assert/strict';
import {avisosDeOrientacao} from './orientacaoEditorial.ts';
import type {Content, ContentPlataforma, Serie} from '../../../lib/database.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {DEFAULT_EDITORIAL_SETTINGS} from '../../editorial/lib/editorialSettings.ts';
import {createEmptyPostIt, movePostIt, pullExistingContent, transformPostIt} from './postIt.ts';
import {ocupacaoDoMes, periodoDoMes, saudeDoMes} from './monthHealth.ts';
import {publicacoesPorDia} from './publicacoesDoMes.ts';

const outubro = periodoDoMes(new Date(2026, 9, 31));
const novembro = periodoDoMes(new Date(2026, 10, 1));
const custom = {inicio: '2026-10-15', fim: '2026-11-14', prioridade:'Preservar decisão', metas:{comunidade:4}, ajustesSemana:[]};
const settings = {...DEFAULT_EDITORIAL_SETTINGS, preferencias:{...DEFAULT_EDITORIAL_SETTINGS.preferencias, limiteSemanal:7, reservaProntos:20}, periodos:[custom]};
const savedSettings = JSON.stringify(settings);
const counts = (postIts: Parameters<typeof saudeDoMes>[0]['postIts'], contents: Content[] = [], periodo = outubro) =>
  saudeDoMes({postIts, contents, series:[], pilares:[], settings, periodo});
const pauta = createEmptyPostIt({id:'pauta', texto:'Título e notas reais', date:'2026-10-31', serieId:'serie', pilarId:'pilar', objetivo:'comunidade', redes:['instagram']});
const before = counts([pauta]);
assert.deepEqual(ocupacaoDoMes(before), {preenchidos:1, capacidade:31, livres:30, excesso:0, percentual:100/31});
assert.equal(before.funcoes.find(item => item.id === 'comunidade')?.meta, null, 'o mês não herda metas do intervalo salvo');
assert.equal(counts([pauta], [], custom).funcoes.find(item => item.id === 'comunidade')?.meta, 4);
assert.equal(JSON.stringify(settings), savedSettings, 'consultar meses não grava decisões ou metas');
assert.equal(counts([movePostIt(pauta,'2026-11-01')]).previsto, 0);
assert.equal(counts([movePostIt(pauta,'2026-11-01')], [], novembro).previsto, 1);
assert.equal(counts([movePostIt(pauta,null)]).previsto, 0, 'sem data e reserva de prontos não preenchem o mês');
assert.equal(counts([movePostIt(movePostIt(pauta,null),pauta.date)]).previsto, 1, 'desfazer restaura o espaço');
for (const target of ['ideia','roteiro'] as const) {
  const result = transformPostIt({postIt:pauta, contents:[], target});
  assert.ok(result.ok);
  if (!result.ok) continue;
  assert.equal(result.postIt.id,pauta.id);
  assert.equal(result.postIt.date,pauta.date);
  assert.deepEqual(result.postIt.redes,pauta.redes);
  assert.equal(result.content.seriesId,pauta.serieId);
  assert.equal(result.content.pilarId,pauta.pilarId);
  assert.equal(result.content.funcao,pauta.objetivo);
  assert.equal(result.content.notes,pauta.texto);
  assert.equal(counts([result.postIt],[result.content]).previsto,1, 'conversão mantém um único espaço');
  assert.ok(result.content.plataformas.every(item => item.status !== 'programada'));
}
const publicacao = (id:string, platformId:string, publishDate:string, ciclo=1): ContentPlataforma => ({
  id, contentId:'existente', platformId, publishDate, legenda:'Legenda preservada', hashtags:'#tag', ciclo,
  publicationKind:ciclo === 1 ? 'post' : 'repost', status:'agendada',
});
const existente = createContentDraft({id:'existente', title:'Conteúdo existente', status:'Ideia', publishDate:'2026-10-05'});
existente.plataformas=[publicacao('ig','instagram','2026-10-05'), publicacao('yt','youtube','2026-10-08')];
const snapshot=JSON.stringify(existente);
const pulled=pullExistingContent({postIts:[], content:existente, date:'2026-10-31'});
const moved=movePostIt(pulled.postIts[0], '2026-11-01');
assert.equal(moved.contentId,existente.id);
assert.equal(JSON.stringify(existente),snapshot, 'puxar e mover preservam conteúdo e publicações');
const promoted=transformPostIt({postIt:moved, contents:[existente], target:'roteiro'});
assert.ok(promoted.ok);
if (promoted.ok) {
  assert.equal(promoted.content.publishDate,existente.publishDate);
  assert.deepEqual(promoted.content.plataformas,existente.plataformas,'a conversão preserva datas e textos por conta');
}
const platforms=[{id:'instagram',nome:'Instagram'},{id:'youtube',nome:'YouTube'}];
existente.plataformas.push(publicacao('repost','instagram','2026-10-20',2));
const cycles=saudeDoMes({postIts:[],contents:[existente],series:[],pilares:[],settings:{...settings,redeReferenciaId:'instagram',preferencias:{...settings.preferencias,redeReferenciaId:'instagram'}},periodo:outubro,platforms});
assert.equal(cycles.previsto,2,'duas contas do original ocupam um espaço; o ciclo de repost ocupa outro');
const cards=publicacoesPorDia({contents:[existente],platforms,series:[],redeReferenciaId:'instagram',postIts:[{...pulled.postIts[0],date:'2026-10-05'}]});
assert.equal(cards.get('2026-10-05')?.length ?? 0,0,'o original vinculado não duplica o cartão');
assert.equal(cards.get('2026-10-20')?.length,1,'o repost continua visível');
assert.equal(ocupacaoDoMes({...before,limite:0}).excesso,1);
assert.equal(ocupacaoDoMes({...before,limite:null}).livres,null);
console.log('ok - planejamento preserva intervalo, ocupação, conversão, contas, ciclos e movimentação');

{
  const a=createContentDraft({id:'a',title:'Primeiro',publishDate:'2026-10-03',bibliotecaItemId:'obra'});
  const b=createContentDraft({id:'b',title:'Segundo',publishDate:'2026-10-06',bibliotecaItemId:'obra'});
  const oficial=counts([],[a,b]);
  const observacoes=avisosDeOrientacao({postIts:[],contents:[a,b],entries:oficial.entries,series:[],temas:[],obras:[{id:'obra',titulo:'Obra real'}],periodo:outubro});
  assert.deepEqual(observacoes.find(item=>item.tipo==='obra-repetida')?.contentIds.sort(),['a','b'],'variedade também explica conteúdos datados sem post-it');
}
