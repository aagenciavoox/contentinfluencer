import assert from 'node:assert/strict';
import type { DecisaoPeriodo } from './editorialSettings.ts';
import { metaDaConta } from './metasPorConta.ts';
import { diasDePausa, intervaloTodoPausado, type PausaEditorial } from './pausas.ts';
import { decisaoDoDia, metaDoTrecho, metasPorObjetivoDoTrecho } from './trecho.ts';

const HOJE = '2026-11-03';

function plano(inicio: string, fim: string, extra: Partial<DecisaoPeriodo> = {}): DecisaoPeriodo {
  return { inicio, fim, prioridade: '', metas: {}, ajustesSemana: [], ...extra };
}

function pausa(inicio: string, fim: string, escopo: PausaEditorial['escopo'], extra: Partial<PausaEditorial> = {}): PausaEditorial {
  return { id: `${escopo}-${inicio}`, inicio, fim, escopo, platformId: null, serieId: null, nota: '', ...extra };
}

const NOVEMBRO = plano('2026-11-01', '2026-11-30', { metasPublicacao: 30 });

// --- Abrir uma semana não aplica a meta do mês inteira: vale o ritmo, e o mês fica de referência.
{
  const semana = metaDoTrecho({ trecho: { inicio: '2026-11-09', fim: '2026-11-15' }, decisoes: [NOVEMBRO], limiteSemanal: 7, hoje: HOJE });
  assert.equal(semana.valor, 7);
  assert.deepEqual(semana.referencias, [{ inicio: '2026-11-01', fim: '2026-11-30', valor: 30 }]);
  assert.equal(semana.semAjusteEspecifico, false);
}

// --- O trecho é o plano inteiro: a meta absoluta vale.
{
  const mes = metaDoTrecho({ trecho: { inicio: '2026-11-01', fim: '2026-11-30' }, decisoes: [NOVEMBRO], limiteSemanal: 7, hoje: HOJE });
  assert.equal(mes.valor, 30);
  assert.equal(mes.segmentos[0].absolutaAplicada, true);
  assert.deepEqual(mes.referencias, []);
}

// --- Trecho que sai do plano: a decisão só nas datas dela; o resto com a regra geral, avisado.
{
  const virada = metaDoTrecho({
    trecho: { inicio: '2026-11-29', fim: '2026-12-05' },
    decisoes: [plano('2026-11-01', '2026-11-30', { pausaEditorial: '29/11 a 30/11' })],
    limiteSemanal: 7,
    hoje: HOJE,
  });
  assert.equal(virada.semAjusteEspecifico, true);
  assert.deepEqual(virada.segmentos.map(s => [s.inicio, s.fim, s.decisao?.inicio ?? null]), [
    ['2026-11-29', '2026-11-30', '2026-11-01'],
    ['2026-12-01', '2026-12-05', null],
  ]);
  // A pausa do plano vale só nos dias dele (29 e 30); dezembro segue o ritmo: 5 dias.
  assert.equal(virada.valor, 5);
}

// --- A pausa escrita é lida com as datas do plano, não com as da semana aberta.
{
  const semana = metaDoTrecho({
    trecho: { inicio: '2026-11-09', fim: '2026-11-15' },
    decisoes: [plano('2026-11-01', '2026-11-30', { pausaEditorial: '10 a 15' })],
    limiteSemanal: 7,
    hoje: HOJE,
  });
  assert.equal(semana.diasDePausa, 6, '10 a 15 caem nesta semana');
  assert.equal(semana.valor, 1);
  const trimestral = metaDoTrecho({
    trecho: { inicio: '2026-11-09', fim: '2026-11-15' },
    decisoes: [plano('2026-10-01', '2026-12-31', { pausaEditorial: '10 a 15' })],
    limiteSemanal: 7,
    hoje: HOJE,
  });
  assert.equal(trimestral.valor, 7, 'no trimestre "10 a 15" é ambíguo: nada descontado');
  assert.equal(trimestral.pendenciasDePausa.length, 1);
}

// --- Planos sobrepostos: vale o mais específico; o maior vira referência.
{
  const trimestre = plano('2026-10-01', '2026-12-31', { metasPublicacao: 90 });
  assert.equal(decisaoDoDia([trimestre, NOVEMBRO], '2026-11-10')?.inicio, '2026-11-01');
  const mes = metaDoTrecho({ trecho: { inicio: '2026-11-01', fim: '2026-11-30' }, decisoes: [trimestre, NOVEMBRO], limiteSemanal: 7, hoje: HOJE });
  assert.equal(mes.valor, 30);
  assert.deepEqual(mes.referencias.map(r => r.valor), []);
  const semana = metaDoTrecho({ trecho: { inicio: '2026-11-09', fim: '2026-11-15' }, decisoes: [trimestre, NOVEMBRO], limiteSemanal: 7, hoje: HOJE });
  assert.deepEqual(semana.referencias.map(r => r.valor), [30], 'a semana vê o mês, não o trimestre inteiro como obrigação');
}

// --- Pausas com escopo: gravação não reduz publicação; o mesmo dia não desconta duas vezes.
{
  const pausas = [
    pausa('2026-12-24', '2026-12-26', 'publicacao'),
    pausa('2026-12-01', '2026-12-10', 'gravacao'),
    pausa('2026-12-25', '2026-12-27', 'publicacao'),
  ];
  const dezembro = metaDoTrecho({
    trecho: { inicio: '2026-12-01', fim: '2026-12-31' },
    decisoes: [plano('2026-12-01', '2026-12-31', { pausaEditorial: '24/12 a 26/12' })],
    limiteSemanal: 7,
    pausas,
    hoje: HOJE,
  });
  assert.equal(dezembro.diasDePausa, 4, '24 a 27, sem repetir o 25 e o 26');
  assert.equal(dezembro.valor, 27);
  assert.deepEqual(diasDePausa(pausas, { tipo: 'gravacao' }, { inicio: '2026-12-01', fim: '2026-12-03' }), ['2026-12-01', '2026-12-02', '2026-12-03']);
}

// --- Pausa de conta só vale para aquela conta; pausa de série só para a série.
{
  const pausas = [pausa('2026-12-01', '2026-12-07', 'conta', { platformId: 'yt' })];
  const linhas = [
    { platformId: 'yt', vigenteDesde: '2026-11-01', limiteSemanal: 7, proporcaoFuncoes: null, parcelasFormato: null },
    { platformId: 'ig', vigenteDesde: '2026-11-01', limiteSemanal: 7, proporcaoFuncoes: null, parcelasFormato: null },
  ];
  const periodo = { inicio: '2026-12-01', fim: '2026-12-31' };
  assert.equal(metaDaConta({ platformId: 'yt', linhas, periodo, proporcaoGeral: null, pausas, hoje: HOJE }).valor, 24);
  assert.equal(metaDaConta({ platformId: 'ig', linhas, periodo, proporcaoGeral: null, pausas, hoje: HOJE }).valor, 31);
  const serie = [pausa('2026-12-01', '2026-12-31', 'serie', { serieId: 's1' })];
  assert.equal(intervaloTodoPausado(serie, { tipo: 'serie', serieIds: new Set(['s1']) }, periodo), true);
  assert.equal(intervaloTodoPausado(serie, { tipo: 'serie', serieIds: new Set(['s2']) }, periodo), false);
  assert.deepEqual(diasDePausa(serie, { tipo: 'publicacao' }, periodo), []);
}

// --- Metas por objetivo: quantidades do plano só quando o trecho é o plano; numa semana, referência.
{
  const comMetas = plano('2026-11-01', '2026-11-30', { metas: { atrair: 20, converter: 10 } });
  const proporcao = { atrair: 50, converter: 50 };
  const mesMeta = metaDoTrecho({ trecho: { inicio: '2026-11-01', fim: '2026-11-30' }, decisoes: [comMetas], limiteSemanal: 7, hoje: HOJE });
  const doMes = metasPorObjetivoDoTrecho({ trecho: { inicio: '2026-11-01', fim: '2026-11-30' }, meta: mesMeta, decisoes: [comMetas], proporcao });
  assert.equal(doMes.metas.atrair.meta, 20);
  assert.equal(doMes.metas.atrair.origem, 'ajustada');
  const semanaMeta = metaDoTrecho({ trecho: { inicio: '2026-11-09', fim: '2026-11-15' }, decisoes: [comMetas], limiteSemanal: 8, hoje: HOJE });
  const daSemana = metasPorObjetivoDoTrecho({ trecho: { inicio: '2026-11-09', fim: '2026-11-15' }, meta: semanaMeta, decisoes: [comMetas], proporcao });
  assert.equal(daSemana.metas.atrair.meta, 4, 'proporção sobre a meta da semana');
  assert.equal(daSemana.metas.atrair.origem, 'proporcao');
  assert.deepEqual(daSemana.referencias, [{ inicio: '2026-11-01', fim: '2026-11-30', metas: { atrair: 20, converter: 10 } }]);
}

console.log('trecho: ok');
