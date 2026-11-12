import assert from 'node:assert/strict';
import type { SerieDaApuracao } from './apuracaoSerie.ts';
import {
  continuidadeDoAcompanhamento,
  continuidadePorEscopo,
  distanciasExcessivas,
  itensDoEscopo,
  type AcompanhamentoSerie,
} from './continuidadeEscopo.ts';
import type { PausaEditorial } from './pausas.ts';
import type { PublicacaoNaAgenda } from './publicacoes.ts';

const HOJE = '2026-11-03';
const NOVEMBRO = { inicio: '2026-11-02', fim: '2026-11-29' }; // 4 semanas inteiras, segunda a domingo

function serie(id: string, extra: Partial<SerieDaApuracao> = {}): SerieDaApuracao {
  return {
    id, name: id, parentId: null,
    frequenciaRecomendada: null, frequenciaVezes: 1, frequenciaUnidade: 'semana', frequenciaAPartirDe: null,
    ...extra,
  };
}

function acompanhamento(extra: Partial<AcompanhamentoSerie> = {}): AcompanhamentoSerie {
  return {
    id: 'a1', serieId: 's', escopo: 'geral', platformId: null, formato: null, ativo: true,
    inicio: null, termino: null, distanciaMaxDias: null, evitarDiasSeguidos: false,
    ...extra,
  };
}

function pub(contentId: string, platformId: string, data: string, extra: Partial<PublicacaoNaAgenda> = {}): PublicacaoNaAgenda {
  return {
    id: `${contentId}-${platformId}-${data}`, contentId, serieId: 's', platformId, rede: null, ciclo: 1, formato: 'reels',
    data, hora: null, situacao: 'prevista', programado: false, contaNaMeta: true, etapa: 'roteiro', objetivo: null,
    ...extra,
  };
}

const series = [serie('s')];

// --- Geral: primeira ocorrência entre as contas; repost na mesma conta não vira episódio novo.
{
  const publicacoes = [
    pub('c1', 'ig', '2026-11-03'),
    pub('c1', 'tt', '2026-11-10'),
    pub('c1', 'ig', '2026-11-17', { ciclo: 2 }),
  ];
  const itens = itensDoEscopo({ acompanhamento: acompanhamento(), series, publicacoes });
  assert.deepEqual(itens.map(item => item.data), ['2026-11-03']);
  // Na conta do TikTok, o mesmo conteúdo é novo: a primeira ocorrência lá é dia 10.
  const tiktok = itensDoEscopo({ acompanhamento: acompanhamento({ escopo: 'conta', platformId: 'tt' }), series, publicacoes });
  assert.deepEqual(tiktok.map(item => item.data), ['2026-11-10']);
}

// --- Reserva sem conta não cobre o escopo de uma conta; no geral, cobre.
{
  const reservas = [
    { id: 'r1', data: '2026-11-04', serieId: 's', contaIds: [] },
    { id: 'r2', data: '2026-11-11', serieId: 's', contaIds: ['ig'] },
  ];
  assert.equal(itensDoEscopo({ acompanhamento: acompanhamento(), series, publicacoes: [], reservas }).length, 2);
  assert.deepEqual(
    itensDoEscopo({ acompanhamento: acompanhamento({ escopo: 'conta', platformId: 'ig' }), series, publicacoes: [], reservas }).map(item => item.postItId),
    ['r2'],
  );
}

// --- Frequência no escopo: a meta da conta vale; sem ela, a meta geral da série.
{
  const publicacoes = [pub('c1', 'ig', '2026-11-03'), pub('c2', 'ig', '2026-11-04')];
  const metas = [{ serieId: 's', platformId: 'ig', formato: null, vezes: 2, unidade: 'mes' as const, aPartirDe: null }];
  const conta = continuidadeDoAcompanhamento({
    acompanhamento: acompanhamento({ escopo: 'conta', platformId: 'ig' }), series, metas, publicacoes, periodo: NOVEMBRO, hoje: HOJE,
  })!;
  assert.equal(conta.janelas[0].meta, 2);
  assert.equal(conta.janelas[0].estado, 'atendida');
  // Regra de ouro também na meta da conta: 2 por semana de uma série vale 1 por semana.
  const porSemana = [{ ...metas[0], unidade: 'semana' as const }];
  const capada = continuidadeDoAcompanhamento({
    acompanhamento: acompanhamento({ escopo: 'conta', platformId: 'ig' }), series, metas: porSemana, publicacoes, periodo: NOVEMBRO, hoje: HOJE,
  })!;
  assert.equal(capada.janelas[0].meta, 1);
  const semMetaDaConta = continuidadeDoAcompanhamento({
    acompanhamento: acompanhamento({ escopo: 'conta', platformId: 'tt' }), series, metas, publicacoes, periodo: NOVEMBRO, hoje: HOJE,
  })!;
  assert.equal(semMetaDaConta.janelas[0].meta, 1, 'sem meta da conta, vale a da série');
}

// --- Desligado, ainda não começou ou já terminou: nenhuma cobrança.
{
  const base = { series, publicacoes: [], periodo: NOVEMBRO, hoje: HOJE };
  assert.equal(continuidadeDoAcompanhamento({ ...base, acompanhamento: acompanhamento({ ativo: false }) })!.estado, 'inativo');
  assert.equal(continuidadeDoAcompanhamento({ ...base, acompanhamento: acompanhamento({ inicio: '2026-12-01' }) })!.estado, 'nao-iniciado');
  assert.equal(continuidadeDoAcompanhamento({ ...base, acompanhamento: acompanhamento({ termino: '2026-10-31' }) })!.estado, 'encerrado');
  assert.deepEqual(continuidadeDoAcompanhamento({ ...base, acompanhamento: acompanhamento({ ativo: false }) })!.faltas, []);
}

// --- Começa no meio de uma semana: a semana é parcial e não vira dívida inteira; as anteriores ficam de fora.
{
  const resultado = continuidadeDoAcompanhamento({
    acompanhamento: acompanhamento({ inicio: '2026-11-11' }), series, publicacoes: [], periodo: NOVEMBRO, hoje: HOJE,
  })!;
  assert.deepEqual(resultado.janelas.map(janela => [janela.inicio, janela.cobertura]), [
    ['2026-11-09', 'parcial'],
    ['2026-11-16', 'integral'],
    ['2026-11-23', 'integral'],
  ]);
  assert.equal(resultado.faltas.length, 2, 'só as semanas inteiras cobram');
}

// --- Pausa da série: semana toda em pausa não é falta; pausa de outra série não muda nada.
{
  const pausas: PausaEditorial[] = [
    { id: 'p', inicio: '2026-11-09', fim: '2026-11-15', escopo: 'serie', platformId: null, serieId: 's', nota: '' },
    { id: 'q', inicio: '2026-11-16', fim: '2026-11-22', escopo: 'serie', platformId: null, serieId: 'outra', nota: '' },
  ];
  const resultado = continuidadeDoAcompanhamento({ acompanhamento: acompanhamento(), series, publicacoes: [], periodo: NOVEMBRO, pausas, hoje: HOJE })!;
  assert.equal(resultado.janelas.find(janela => janela.inicio === '2026-11-09')!.cobertura, 'pausada');
  assert.equal(resultado.janelas.find(janela => janela.inicio === '2026-11-16')!.cobertura, 'integral');
  assert.equal(resultado.faltas.length, 3);
}

// --- Quadro é sob demanda: mesmo acompanhado, não tem continuidade própria.
{
  const comQuadro = [serie('s'), serie('q', { parentId: 's', tipoAgrupamento: 'quadro' } as Partial<SerieDaApuracao>)];
  assert.equal(continuidadeDoAcompanhamento({ acompanhamento: acompanhamento({ serieId: 'q' }), series: comQuadro, publicacoes: [], periodo: NOVEMBRO, hoje: HOJE }), null);
}

// --- Pausa da família vale para a série acompanhada; pausa da série não pausa a família.
{
  const comFamilia = [
    serie('f', { tipoAgrupamento: 'familia' } as Partial<SerieDaApuracao>),
    serie('s', { parentId: 'f', tipoAgrupamento: 'serie' } as Partial<SerieDaApuracao>),
  ];
  const pausas: PausaEditorial[] = [
    { id: 'p', inicio: '2026-11-09', fim: '2026-11-15', escopo: 'serie', platformId: null, serieId: 'f', nota: '' },
    { id: 'r', inicio: '2026-11-16', fim: '2026-11-22', escopo: 'serie', platformId: null, serieId: 's', nota: '' },
  ];
  const daSerie = continuidadeDoAcompanhamento({ acompanhamento: acompanhamento({ serieId: 's' }), series: comFamilia, publicacoes: [], periodo: NOVEMBRO, pausas, hoje: HOJE })!;
  assert.equal(daSerie.janelas.find(janela => janela.inicio === '2026-11-09')!.cobertura, 'pausada', 'pausa da família');
  assert.equal(daSerie.janelas.find(janela => janela.inicio === '2026-11-16')!.cobertura, 'pausada', 'pausa da própria série');
}

// --- Distância máxima: usa o episódio de antes do período, não passa do fim e pula a pausa.
{
  const distancias = distanciasExcessivas({
    datas: ['2026-10-25', '2026-11-12'],
    periodo: NOVEMBRO,
    limiteDias: 10,
    inicioAcompanhamento: null,
    terminoAcompanhamento: null,
    diasPausados: new Set(),
    hoje: HOJE,
  });
  assert.deepEqual(distancias, [
    { inicio: '2026-11-02', fim: '2026-11-11', dias: 17, futuro: true },
    { inicio: '2026-11-13', fim: '2026-11-29', dias: 17, futuro: true },
  ]);
  const comPausa = distanciasExcessivas({
    datas: ['2026-11-01', '2026-11-20'],
    periodo: NOVEMBRO,
    limiteDias: 10,
    inicioAcompanhamento: null,
    terminoAcompanhamento: null,
    diasPausados: new Set(['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12']),
    hoje: HOJE,
  });
  assert.deepEqual(comPausa, [], '18 dias sem episódio, 8 em pausa: 10 não passa do limite');
}

// --- Dias seguidos: só com a regra ligada.
{
  const publicacoes = [pub('c1', 'ig', '2026-11-03'), pub('c2', 'ig', '2026-11-04')];
  const desligada = continuidadeDoAcompanhamento({ acompanhamento: acompanhamento(), series, publicacoes, periodo: NOVEMBRO, hoje: HOJE })!;
  assert.deepEqual(desligada.diasSeguidos, []);
  const ligada = continuidadeDoAcompanhamento({ acompanhamento: acompanhamento({ evitarDiasSeguidos: true }), series, publicacoes, periodo: NOVEMBRO, hoje: HOJE })!;
  assert.deepEqual(ligada.diasSeguidos.map(par => [par.dia, par.seguinte]), [['2026-11-03', '2026-11-04']]);
}

// --- Visão geral: cada escopo à parte, sem somar metas.
{
  const resultados = continuidadePorEscopo({
    acompanhamentos: [acompanhamento({ id: 'g' }), acompanhamento({ id: 'ig', escopo: 'conta', platformId: 'ig' })],
    series,
    publicacoes: [pub('c1', 'tt', '2026-11-03')],
    periodo: NOVEMBRO,
    hoje: HOJE,
  });
  assert.deepEqual(resultados.map(item => [item.acompanhamentoId, item.janelas[0].estado]), [['g', 'atendida'], ['ig', 'vazia']]);
}

console.log('continuidadeEscopo: ok');
