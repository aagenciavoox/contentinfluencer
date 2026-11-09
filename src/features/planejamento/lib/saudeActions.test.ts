import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {format} from 'date-fns';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {intervalosDaFrequencia} from '../../editorial/lib/apuracaoSerie.ts';
import {buildDetailBackState, resolveContentDetailBack} from '../../../lib/navigation/detailBack.ts';
import {levarRoteiroAoDia} from './postItsNaData.ts';
import {saudeDoMes} from './monthHealth.ts';
import {linhasDaContinuidadePorEscopo} from './continuidadePorEscopoNaSaude.ts';
import type {Serie} from '../../../lib/database.ts';
import {pendenciasNaSaude} from './pendenciasNaSaude.ts';
import {diasDoCalendario, gravarContextoPlanejamento, lerContextoPlanejamento, roteirosDaSaude, secoesSalvas, orientacaoDoPlanejamento} from './saudeActions.ts';

const dia = (d: Date) => format(d, 'yyyy-MM-dd');
const dados = (contents: ReturnType<typeof createContentDraft>[]) => ({contents, postIts: [], series: [], pilares: [], platforms: [], settings: {redeReferenciaId: null, proporcaoFuncoes: null}});

describe('ações da Saúde Editorial', () => {
  it('mostra segunda a domingo e todos os dias de ciclos que atravessam o mês', () => {
    const semana = intervalosDaFrequencia({vezes: 2, unidade: 'semana', aPartirDe:null}, {inicio: '2026-11-03', fim: '2026-11-07'})[0];
    assert.deepEqual(diasDoCalendario(new Date('2026-11-04T12:00:00')).map(dia), ['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08']);
    assert.equal(dia(diasDoCalendario(new Date('2026-11-03T12:00:00'), semana).at(-1)!), semana.fim);
    const quinzena = intervalosDaFrequencia({vezes: 2, unidade: 'quinzena', aPartirDe: '2026-10-25'}, {inicio: '2026-11-01', fim: '2026-11-07'})[0];
    const dias = diasDoCalendario(new Date('2026-10-25T12:00:00'), quinzena);
    assert.equal(dias.length, 14);
    assert.equal(dia(dias[0]), '2026-10-25');
    assert.equal(dia(dias.at(-1)!), '2026-11-07');
    assert.equal(diasDoCalendario(new Date('2026-11-01T12:00:00'), {inicio:'2026-11-01',fim:'2026-11-30'}).length, 30);
  });
  it('leva o contexto completo pelo conteúdo e restaura o período original da Saúde', () => {
    const contexto = lerContextoPlanejamento(new URLSearchParams('data=2026-10-25&vista=semana&trecho=intervalo&inicio=2026-10-01&fim=2026-12-31&focoInicio=2026-10-25&focoFim=2026-11-07&serie=s1&destaques=c1,p1&redes=youtube&formato=shorts&assunto=t1&saudeInicio=2026-10-01&saudeFim=2026-12-31&origemData=2026-11-15&origemVista=mes'));
    const params = gravarContextoPlanejamento(new URLSearchParams('postit=p1'), contexto, true);
    const target = '/planejamento?' + params;
    assert.equal(resolveContentDetailBack(buildDetailBackState(target).state), target);
    assert.deepEqual(lerContextoPlanejamento(new URL(target, 'https://local.test').searchParams), contexto);
    assert.equal(params.get('saude'), '1');
    assert.equal(params.get('postit'), 'p1');
    assert.equal(gravarContextoPlanejamento(params, {...contexto, foco:null,serieId:null,destaques:[],origem:null}, false).has('focoInicio'), false);
  });
  it('orienta quantos episódios faltam e avisa quando a frequência é atingida', () => {
    assert.match(orientacaoDoPlanejamento({meta:4,quantidade:1}), /Planeje mais 3 episódios/);
    assert.match(orientacaoDoPlanejamento({meta:4,quantidade:3}), /Planeje mais 1 episódio/);
    assert.match(orientacaoDoPlanejamento({meta:4,quantidade:4}), /foi atingida/);
    assert.match(orientacaoDoPlanejamento({meta:4,quantidade:5}), /foi atingida/);
  });
  it('ignora datas inválidas e preserva todas as seções fechadas', () => {
    const contexto = lerContextoPlanejamento(new URLSearchParams('data=2026-02-31&focoInicio=2026-11-09&focoFim=2026-11-01'), '2026-11-04');
    assert.equal(contexto.data, '2026-11-04');
    assert.equal(contexto.foco, null);
    assert.deepEqual([...secoesSalvas([], ['urgencias','series'])], []);
    assert.deepEqual([...secoesSalvas(['series','inexistente'], ['urgencias','series'])], ['series']);
  });
  it('seleciona apenas Produção elegível do período, excluindo escrita, carrosséis e roteiros já em blocos', () => {
    const contents = [
      createContentDraft({id:'pronto',status:CONTENT_STATUS.PRODUCAO,publishDate:'2026-11-03'}),
      createContentDraft({id:'escrita',status:CONTENT_STATUS.ROTEIRO,publishDate:'2026-11-04'}),
      createContentDraft({id:'carrossel',status:CONTENT_STATUS.PRODUCAO,publishDate:'2026-11-04', writingMode:'carrossel'}),
      createContentDraft({id:'em-bloco',status:CONTENT_STATUS.PRODUCAO,publishDate:'2026-11-04'}),
      createContentDraft({id:'fora',status:CONTENT_STATUS.PRODUCAO,publishDate:'2026-10-31'}),
    ];
    const counts = saudeDoMes({...dados(contents), periodo:{inicio:'2026-11-01',fim:'2026-11-30'}});
    const blocks: Parameters<typeof roteirosDaSaude>[2] = [{id:'b1',userId:'',name:'Sessão',createdAt:'2026-11-01T12:00:00Z',contents:[{blockId:'b1',contentId:'em-bloco',ordem:0,gravado:false}]}];
    assert.deepEqual(roteirosDaSaude([...counts.itens, ...counts.itens], contents, blocks), ['pronto']);
  });
  it('mantém atrasos de outro mês e os remove após mover, retirar a previsão ou publicar', () => {
    const passouDaData = createContentDraft({id:'passouDaData',status:CONTENT_STATUS.PRODUCAO,publishDate:'2026-10-31'});
    const publicado = createContentDraft({id:'publicado',status:CONTENT_STATUS.POSTADO,publishDate:'2026-10-30',postedAt:'2026-10-30T12:00:00Z'});
    assert.deepEqual(pendenciasNaSaude(dados([passouDaData, publicado]), '2026-11-04').map(i=>i.contentId), ['passouDaData']);
    assert.equal(pendenciasNaSaude(dados([levarRoteiroAoDia(passouDaData,'2026-11-04')!]), '2026-11-04').length, 0);
    assert.equal(pendenciasNaSaude(dados([levarRoteiroAoDia(passouDaData,null)!]), '2026-11-04').length, 0);
  });
  it('mostra frequência encerrada como histórico também no acompanhamento por conta', () => {
    const serie = {id:'s1', name:'Série', ativa:true, frequenciaVezes:2, frequenciaUnidade:'semana',
      acompanhamentos:[{id:'a1',serieId:'s1',escopo:'conta',platformId:'p1',formato:null,ativo:true,inicio:null,termino:null,distanciaMaxDias:null,evitarDiasSeguidos:false}]} as Serie;
    const linhas = linhasDaContinuidadePorEscopo({series:[serie], contents:[], postIts:[], platforms:[], periodo:{inicio:'2026-10-19',fim:'2026-10-25'}, pausas:[],hoje:'2026-11-04'});
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].atencao, false);
    assert.match(linhas[0].texto, /Histórico/);
  });
  it('marca acompanhamento por conta sem frequência como estado próprio, sem atenção e com o tipo do dono', () => {
    const acompanhamento = (serieId: string) => ({id:`a-${serieId}`,serieId,escopo:'conta' as const,platformId:'p1',formato:null,ativo:true,inicio:null,termino:null,distanciaMaxDias:null,evitarDiasSeguidos:false});
    const serie = {id:'s1', name:'Série', ativa:true, tipoAgrupamento:'serie', frequenciaVezes:null, frequenciaUnidade:null, acompanhamentos:[acompanhamento('s1')]} as unknown as Serie;
    const quadro = {id:'q1', name:'Quadro', ativa:true, parentId:'s1', tipoAgrupamento:'quadro', frequenciaVezes:null, frequenciaUnidade:null, acompanhamentos:[acompanhamento('q1')]} as unknown as Serie;
    const linhas = linhasDaContinuidadePorEscopo({series:[serie, quadro], contents:[], postIts:[], platforms:[], periodo:{inicio:'2026-11-02',fim:'2026-11-08'}, pausas:[], hoje:'2026-11-04'});
    assert.deepEqual(linhas.map(l => [l.serieId, l.semFrequencia, l.tipo, l.atencao, l.texto]), [
      ['q1', true, 'quadro', false, 'Sem frequência definida'],
      ['s1', true, 'serie', false, 'Sem frequência definida'],
    ]);
  });

});
