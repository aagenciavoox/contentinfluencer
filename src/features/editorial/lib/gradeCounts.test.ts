import assert from 'node:assert/strict';
import type { GradeEntry } from './gradeEntries.ts';
import { buildGradeEntries, type GradeContent, type GradeSerie } from './gradeEntries.ts';
import { countGrade, metodoDoPeriodo, type PilarContagem, type PostItContagem } from './gradeCounts.ts';
import { limiteDoIntervalo } from './periodoEditorial.ts';
import { FUNCOES } from './funcoes.ts';
import { apurarSerie } from './apuracaoSerie.ts';

const PERCENTUAIS = {
  atrair: 35,
  converter: 30,
  aprofundar: 20,
  comunidade: 15,
  acao: 0,
  reter: 0,
};

const SEMANA = { inicio: '2026-04-26', fim: '2026-05-02' };

function entrada(partial: Partial<GradeEntry> & Pick<GradeEntry, 'id'>): GradeEntry {
  return {
    contentId: partial.contentId ?? partial.id,
    tipo: 'original',
    data: '2026-04-27',
    hora: null,
    contaNaGrade: true,
    pilarId: 'pilar-a',
    serieId: 'serie-1',
    funcao: 'atrair',
    realizada: false,
    realizadaEm: null,
    temPauta: false,
    ...partial,
  };
}

const pilaresGrandes: PilarContagem[] = [
  { id: 'pilar-a', nome: 'Literatura', ativo: true },
  { id: 'pilar-b', nome: 'Bastidores', ativo: true },
];

function testContaCicloDeRepostEIgnoraFora() {
  const resultado = countGrade({
    pilares: pilaresGrandes,
    settings: { distribuicaoFuncoes: PERCENTUAIS },
    periodo: SEMANA,
    entries: [
      entrada({ id: 'a1', data: '2026-04-27', realizada: true, temPauta: true }),
      entrada({ id: 'a2', data: '2026-04-28', funcao: 'converter' }),
      entrada({ id: 'fora', data: '2026-04-28', contaNaGrade: false, pilarId: 'pilar-b' }),
      entrada({ id: 'outra-semana', data: '2026-05-04', pilarId: 'pilar-b', funcao: 'comunidade' }),
      entrada({
        id: 'c1:ciclo:2',
        contentId: 'a1',
        tipo: 'repost',
        data: '2026-04-30',
        pilarId: 'pilar-b',
        funcao: 'aprofundar',
        realizada: true,
        temPauta: true,
      }),
    ],
  });

  assert.equal(resultado.gradePequena, false);
  assert.equal(resultado.periodo.fim, '2026-05-02');
  assert.equal(resultado.limite, null);
  assert.equal(resultado.totalMeta, null);
  // Por roteiro (padrão): o repost de a1 no mesmo período fica na lista, mas o roteiro conta uma vez.
  assert.equal(resultado.metodoCalculo, 'conteudos-v1');
  assert.equal(resultado.unidade, 'roteiro');
  assert.equal(resultado.itens.length, 3);
  assert.equal(resultado.previsto, 2);
  assert.equal(resultado.publicado, 1);
  assert.equal(resultado.comPauta, 1);
  assert.equal(resultado.somaPlanejado, 2);
  assert.equal(resultado.pilares.find(linha => linha.id === 'pilar-a')?.planejado, 2);
  assert.equal(resultado.pilares.find(linha => linha.id === 'pilar-b')?.planejado, 0);
  assert.equal(resultado.notaSoma, null);
  assert.equal(resultado.objetivos.find(linha => linha.id === 'reter')?.meta, null);
}

function testPercentualAntigoNaoViraLimite() {
  const resultado = countGrade({
    pilares: pilaresGrandes,
    settings: { distribuicaoFuncoes: PERCENTUAIS },
    periodo: { inicio: '2026-10-01', fim: '2026-10-31' },
    entries: [entrada({ id: 'a1', data: '2026-10-05' })],
  });
  assert.equal(resultado.limite, null);
  assert.equal(resultado.totalMeta, null);
  assert.notEqual(resultado.limite, 14);
  assert.notEqual(resultado.totalMeta, 0);
}

function testSemanaParcialUsaLimiteDoIntervalo() {
  const inicio = '2026-10-01';
  const fim = '2026-10-03';
  const ajustesSemana = [{ inicio: '2026-09-28', fim: '2026-10-04', limite: 10 }];
  const esperado = limiteDoIntervalo({
    limiteSemanal: 14,
    inicio,
    fim,
    ajustesSemana,
  });
  const resultado = countGrade({
    pilares: [{ id: 'pilar-a', nome: 'Literatura', ativo: true }],
    settings: {
      distribuicaoFuncoes: PERCENTUAIS,
      preferencias: {
        limiteSemanal: 14,
        reservaForaSeriesSemanal: 2,
        redeReferenciaId: null,
        reservaProntos: null,
      },
      ajustesSemana,
    },
    periodo: { inicio, fim },
    entries: [
      entrada({ id: 'dentro', data: '2026-10-02' }),
      entrada({ id: 'fora', data: '2026-10-11' }),
    ],
  });

  assert.equal(esperado, 10);
  assert.equal(resultado.limite, esperado);
  assert.equal(resultado.gradePequena, false);
  assert.equal(resultado.periodo.fim, fim);
  assert.equal(resultado.previsto, 1);
  assert.equal(resultado.reservaForaSeriesSemanal, 2);
}

function testGradePequenaNaoAlargaOPeriodo() {
  const resultado = countGrade({
    pilares: [{ id: 'pilar-a', nome: 'Literatura', ativo: true }],
    settings: { distribuicaoFuncoes: PERCENTUAIS, preferencias: {
      limiteSemanal: null,
      reservaForaSeriesSemanal: null,
      redeReferenciaId: null,
      reservaProntos: null,
    } },
    periodo: { inicio: '2026-04-26', fim: '2026-05-02' },
    entries: [
      entrada({ id: 'dentro', data: '2026-04-28' }),
      entrada({ id: 'fora', data: '2026-05-24' }),
    ],
  });

  assert.equal(resultado.gradePequena, false);
  assert.equal(resultado.periodo.inicio, '2026-04-26');
  assert.equal(resultado.periodo.fim, '2026-05-02');
  assert.equal(resultado.previsto, 1);
  assert.equal(resultado.limite, null);
  assert.equal(resultado.pilares[0]?.meta, null);
}

function testFrequenciaNaoCortaOItem() {
  const resultado = countGrade({
    pilares: [{ id: 'pilar-a', nome: 'Literatura', ativo: true }],
    settings: {
      preferencias: {
        limiteSemanal: 2,
        reservaForaSeriesSemanal: null,
        redeReferenciaId: null,
        reservaProntos: null,
      },
    },
    periodo: SEMANA,
    entries: [0, 1, 2, 3, 4].map(index => entrada({
      id: `item-${index}`,
      data: `2026-04-${String(26 + index).padStart(2, '0')}`,
      serieId: 'serie-1',
    })),
  });

  assert.equal(resultado.previsto, 5);
  assert.equal(resultado.limite, 2);
  assert.equal(resultado.excesso, 3);
  assert.equal(resultado.itens.length, 5);
  assert.match(resultado.notaSoma ?? '', /limite é 2/);
}

function testMetaDoPeriodoNaoEscala() {
  const resultado = countGrade({
    pilares: [],
    settings: {
      preferencias: {
        limiteSemanal: 7,
        reservaForaSeriesSemanal: null,
        redeReferenciaId: null,
        reservaProntos: null,
      },
      periodos: [{
        inicio: SEMANA.inicio,
        fim: SEMANA.fim,
        prioridade: '',
        metas: { atrair: 3, reter: 1 },
        ajustesSemana: [],
      }, {
        inicio: '2026-04-01',
        fim: '2026-04-30',
        prioridade: 'mês',
        metas: { atrair: 40 },
        ajustesSemana: [],
      }],
    },
    periodo: SEMANA,
    entries: [
      entrada({ id: 'com', funcao: 'atrair', temPauta: true }),
      entrada({ id: 'reter', funcao: 'reter', temPauta: true, data: '2026-04-28' }),
      entrada({ id: 'sem', funcao: null, temPauta: true, data: '2026-04-29', serieId: null }),
      entrada({ id: 'livre', funcao: null, temPauta: false, data: '2026-04-30', serieId: null }),
      entrada({ id: 'no-ar', funcao: 'acao', temPauta: false, realizada: true, data: '2026-05-01' }),
    ],
  });

  assert.deepEqual(resultado.objetivos.map(linha => linha.id), [...FUNCOES]);
  assert.equal(resultado.objetivos.find(linha => linha.id === 'atrair')?.meta, 3);
  assert.equal(resultado.objetivos.find(linha => linha.id === 'reter')?.meta, 1);
  assert.equal(resultado.objetivos.find(linha => linha.id === 'converter')?.meta, null);
  assert.equal(resultado.objetivos.find(linha => linha.id === 'atrair')?.previsto, 1);
  assert.equal(resultado.objetivos.find(linha => linha.id === 'reter')?.comPauta, 1);
  assert.equal(resultado.previsto, 5);
  assert.equal(resultado.comPauta, 4);
  assert.equal(resultado.publicado, 1);
  assert.equal(resultado.espacosLivres, 1);
  // Sem objetivo conta o conteúdo, com ou sem pauta: "sem" e "livre".
  assert.equal(resultado.semObjetivo, 2);
  assert.equal(resultado.semSerie, 2);
  assert.equal(resultado.objetivos.find(linha => linha.id === 'acao')?.publicado, 1);
  assert.equal(resultado.objetivos.find(linha => linha.id === 'acao')?.comPauta, 1);
}

function testPostItLigadoContaUmaVez() {
  const postIts: PostItContagem[] = [
    { id: 'p1', date: '2026-04-27', texto: 'gancho', contentId: 'c1' },
    { id: 'p2', date: '2026-04-28', texto: 'outro gancho', contentId: 'c1' },
    { id: 'solto', date: '2026-04-29', texto: 'nota solta', contentId: null },
    { id: 'vazio', date: '2026-04-29', texto: 'Post-it vazio', contentId: null },
    { id: 'sem-data', date: null, texto: 'fica na pilha', contentId: null },
    { id: 'sem-titulo', date: '2026-04-30', texto: 'Sem título', contentId: 'sem-roteiro' },
  ];
  const resultado = countGrade({
    pilares: pilaresGrandes,
    settings: {},
    periodo: SEMANA,
    entries: [
      entrada({ id: 'c1', contentId: 'c1', temPauta: false, scriptOrigem: 'modelo' } as Partial<GradeEntry> & Pick<GradeEntry, 'id'>),
    ],
    postIts,
    hoje: '2026-04-27',
  });

  assert.equal(resultado.previsto, 4);
  assert.equal(resultado.itens.filter(item => item.contentId === 'c1').length, 1);
  assert.equal(resultado.itens.find(item => item.contentId === 'c1')?.temPauta, true);
  assert.equal(resultado.comPauta, 2);
  assert.equal(resultado.espacosLivres, 2);

  // Depois de 29/04, os dois post-its sem roteiro viram reserva pendente e saem do previsto.
  // Os que têm roteiro ligado continuam.
  const depois = countGrade({
    pilares: pilaresGrandes,
    settings: {},
    periodo: SEMANA,
    entries: [
      entrada({ id: 'c1', contentId: 'c1', temPauta: false, scriptOrigem: 'modelo' } as Partial<GradeEntry> & Pick<GradeEntry, 'id'>),
    ],
    postIts,
    hoje: '2026-05-01',
  });
  assert.equal(depois.previsto, 2);
  assert.equal(depois.itens.some(item => item.postItId === 'solto' || item.postItId === 'vazio'), false);
}

function conteudoGrade(partial: Partial<GradeContent> & Pick<GradeContent, 'id'>): GradeContent {
  return {
    status: 'Produção',
    seriesId: null,
    pilarId: 'pilar-a',
    funcao: 'atrair',
    funcaoOrigem: 'escolhida',
    classificacaoCongeladaEm: null,
    contaNaGrade: true,
    publishDate: '2026-04-27',
    deletedAt: null,
    plataformas: [],
    ...partial,
  };
}

const serie: GradeSerie[] = [{ id: 'serie-1', funcaoPadrao: 'converter' }];

function testOrigemEPautaNoFluxoDaGrade() {
  const entries = buildGradeEntries({
    series: serie,
    settings: { redeReferenciaId: 'ig' },
    contents: [
      conteudoGrade({
        id: 'live',
        formatoVisual: 'Live',
        contaNaGrade: false,
        contaNaGradeOrigem: 'regra',
        publishDate: '2026-04-27',
        scriptOrigem: 'modelo',
        script: '<p>modelo</p>',
      }),
      conteudoGrade({
        id: 'reter',
        funcao: 'reter',
        contaNaGrade: false,
        contaNaGradeOrigem: 'regra',
        publishDate: '2026-04-28',
        scriptOrigem: 'autor',
      }),
      conteudoGrade({
        id: 'manual',
        formatoVisual: 'Reels',
        contaNaGrade: false,
        contaNaGradeOrigem: 'manual',
        publishDate: '2026-04-29',
        scriptOrigem: 'autor',
      }),
      conteudoGrade({
        id: 'modelo',
        publishDate: '2026-04-30',
        scriptOrigem: 'modelo',
        title: 'Título que não é pauta',
        script: '<p></p>',
      }),
    ],
  });
  const resultado = countGrade({
    entries,
    pilares: pilaresGrandes,
    settings: {},
    periodo: SEMANA,
  });

  assert.equal(entries.find(entry => entry.contentId === 'live')?.contaNaGrade, true);
  assert.equal(entries.find(entry => entry.contentId === 'reter')?.contaNaGrade, true);
  assert.equal(entries.find(entry => entry.contentId === 'manual')?.contaNaGrade, false);
  assert.equal(resultado.previsto, 3);
  assert.equal(resultado.itens.some(item => item.contentId === 'manual'), false);
  assert.equal(resultado.itens.find(item => item.contentId === 'live')?.temPauta, false);
  assert.equal(resultado.itens.find(item => item.contentId === 'reter')?.temPauta, true);
  assert.equal(resultado.itens.find(item => item.contentId === 'modelo')?.temPauta, false);
}

function testPublicadoSoEmOutrasRedesNaoConta() {
  const entries = buildGradeEntries({
    series: serie,
    settings: { redeReferenciaId: 'plat-instagram' },
    contents: [
      conteudoGrade({
        id: 'so-tiktok',
        status: 'Postado',
        publishDate: '2026-04-01',
        plataformas: [
          {
            id: 'm',
            contentId: 'so-tiktok',
            platformId: 'plat-tiktok',
            legenda: '',
            hashtags: '',
            publishDate: '2026-04-28',
            publishTime: '18:00',
            publicationKind: 'post',
            status: 'publicada',
          },
          {
            id: 'a',
            contentId: 'so-tiktok',
            platformId: 'plat-youtube',
            legenda: '',
            hashtags: '',
            publishDate: '2026-04-28',
            publishTime: '09:00',
            publicationKind: 'post',
            status: 'publicada',
          },
        ],
      }),
    ],
  });
  const resultado = countGrade({
    entries,
    pilares: [],
    settings: {},
    periodo: SEMANA,
  });
  assert.equal(entries.length, 0);
  assert.equal(resultado.previsto, 0);
  assert.equal(resultado.publicado, 0);
}

function testContaPorEtapa() {
  const entries = buildGradeEntries({
    series: serie,
    settings: { redeReferenciaId: 'plat-instagram' },
    contents: [
      conteudoGrade({ id: 'ideia', status: 'Ideia', publishDate: '2026-04-27' }),
      conteudoGrade({ id: 'roteiro', status: 'Roteiro', publishDate: '2026-04-28' }),
      conteudoGrade({ id: 'gravado', status: 'Gravado', publishDate: '2026-04-28' }),
      conteudoGrade({
        id: 'no-ar',
        status: 'Produção',
        publishDate: '2026-04-29',
        plataformas: [{
          id: 'pub',
          contentId: 'no-ar',
          platformId: 'plat-instagram',
          legenda: '',
          hashtags: '',
          publishDate: '2026-04-29',
          publishTime: '18:00',
          publicationKind: 'post',
          status: 'publicada',
        }],
      }),
      conteudoGrade({ id: 'sem-data', status: 'Roteiro', publishDate: null, funcao: 'converter' }),
      conteudoGrade({ id: 'sem-objetivo', status: 'Roteiro', publishDate: '2026-04-30', funcao: null, funcaoOrigem: null }),
    ],
  });
  const postIts: PostItContagem[] = [
    { id: 'solto', date: '2026-04-27', texto: '', contentId: null, objetivo: 'atrair' },
    { id: 'solto-sem-objetivo', date: '2026-04-28', texto: 'ideia de gancho', contentId: null },
    // O post-it diz Atrair, o roteiro ligado diz Converter: vale o roteiro.
    { id: 'ligado', date: '2026-04-30', texto: '', contentId: 'sem-data', objetivo: 'atrair' },
    { id: 'orfao', date: '2026-05-01', texto: '', contentId: 'apagado', objetivo: 'atrair' },
  ];
  const resultado = countGrade({
    entries,
    pilares: [],
    settings: {},
    periodo: SEMANA,
    postIts,
    // Antes dos post-its soltos vencerem.
    hoje: '2026-04-27',
  });

  assert.equal(entries.find(entry => entry.contentId === 'ideia')?.etapa, 'ideia');
  // Status antigo "Gravado" cai em Edição.
  assert.equal(entries.find(entry => entry.contentId === 'gravado')?.etapa, 'edicao');
  assert.equal(entries.find(entry => entry.contentId === 'no-ar')?.etapa, 'postado');

  const atrair = resultado.objetivos.find(linha => linha.id === 'atrair');
  assert.deepEqual(atrair?.porEtapa, { planejamento: 2, ideia: 1, roteiro: 1, producao: 0, edicao: 1, postado: 1 });
  assert.equal(atrair?.previsto, 6);
  assert.deepEqual(
    resultado.objetivos.find(linha => linha.id === 'converter')?.porEtapa,
    { planejamento: 0, ideia: 0, roteiro: 1, producao: 0, edicao: 0, postado: 0 },
  );
  assert.deepEqual(resultado.porEtapa, { planejamento: 3, ideia: 1, roteiro: 3, producao: 0, edicao: 1, postado: 1 });
  assert.deepEqual(resultado.semObjetivoPorEtapa, { planejamento: 1, ideia: 0, roteiro: 1, producao: 0, edicao: 0, postado: 0 });
  // O post-it sem conteúdo não entra no aviso: só o roteiro.
  assert.equal(resultado.semObjetivo, 1);
  assert.equal(resultado.itens.find(item => item.postItId === 'solto')?.etapa, 'planejamento');
  assert.equal(resultado.itens.find(item => item.contentId === 'sem-data')?.postItId, 'ligado');
}

const NOVEMBRO = { inicio: '2026-11-01', fim: '2026-11-30' };

/** Um roteiro em duas contas, mais um repost: 1 por roteiro, 3 por publicação. */
function entradasDeTresPublicacoes(): GradeEntry[] {
  return [
    entrada({
      id: 'r1:original', contentId: 'r1', data: '2026-11-03',
      publicacoes: [
        { platformId: 'ig', data: '2026-11-03', realizada: true, contaNaGrade: true, etapa: 'postado' },
        { platformId: 'tt', data: '2026-11-04', realizada: false, contaNaGrade: true, etapa: 'edicao' },
      ],
    }),
    entrada({
      id: 'r1:ciclo:2', contentId: 'r1', tipo: 'repost', data: '2026-11-20',
      publicacoes: [{ platformId: 'ig', data: '2026-11-20', realizada: false, contaNaGrade: true, etapa: 'edicao' }],
    }),
    // Conta desligada à mão: fica fora da meta nos dois métodos.
    entrada({
      id: 'r2:original', contentId: 'r2', data: '2026-11-10',
      publicacoes: [
        { platformId: 'ig', data: '2026-11-10', realizada: false, contaNaGrade: true, etapa: 'roteiro' },
        { platformId: 'tt', data: '2026-11-10', realizada: false, contaNaGrade: false, etapa: 'roteiro' },
      ],
    }),
  ];
}

function settingsComMetodo(metodoCalculo: 'conteudos-v1' | 'publicacoes-v2') {
  return {
    preferencias: { limiteSemanal: 1, reservaForaSeriesSemanal: null, redeReferenciaId: null, reservaProntos: null },
    periodos: [{ ...NOVEMBRO, prioridade: '', metas: {}, ajustesSemana: [], metasPublicacao: 3, metodoCalculo }],
  };
}

function testMetodoMudaMetaGeralETeto() {
  const porRoteiro = countGrade({
    pilares: pilaresGrandes, settings: settingsComMetodo('conteudos-v1'), periodo: NOVEMBRO,
    entries: entradasDeTresPublicacoes(), hoje: '2026-11-11',
  });
  const porPublicacao = countGrade({
    pilares: pilaresGrandes, settings: settingsComMetodo('publicacoes-v2'), periodo: NOVEMBRO,
    entries: entradasDeTresPublicacoes(), hoje: '2026-11-11',
  });
  // A meta (o número) não muda; muda o que se conta contra ela.
  assert.equal(porRoteiro.limite, 3);
  assert.equal(porPublicacao.limite, 3);
  assert.equal(porRoteiro.unidade, 'roteiro');
  assert.equal(porPublicacao.unidade, 'publicacao');
  assert.equal(porRoteiro.previsto, 2, 'r1 e r2, uma vez cada');
  assert.equal(porPublicacao.previsto, 4, 'r1 no Instagram e no TikTok, o repost e r2 no Instagram');
  assert.equal(porRoteiro.excesso, 0);
  assert.equal(porPublicacao.excesso, 1, 'o teto passa no método por publicação');
  assert.equal(porPublicacao.publicado, 1);
  assert.equal(porPublicacao.porEtapa.postado + porPublicacao.porEtapa.edicao + porPublicacao.porEtapa.roteiro, 4);
  assert.equal(porPublicacao.objetivos.find(linha => linha.id === 'atrair')?.previsto, 4);
  // A lista do período (base da Continuidade) é a mesma nos dois métodos: um item por ciclo, não por conta.
  assert.deepEqual(porPublicacao.itens.map(item => item.id), porRoteiro.itens.map(item => item.id));
  // Continuidade conta episódios: o método não muda a apuração da série.
  const serie = { id: 'serie-1', name: 'Série', parentId: null, frequenciaRecomendada: null, frequenciaVezes: 1, frequenciaUnidade: 'semana', frequenciaAPartirDe: null };
  const apurar = (itens: readonly GradeEntry[]) => apurarSerie({ serie, series: [serie], itens, periodo: NOVEMBRO });
  assert.deepEqual(apurar(porPublicacao.itens).noPeriodo, apurar(porRoteiro.itens).noPeriodo);
  assert.deepEqual(
    apurar(porPublicacao.itens).janelas.map(janela => janela.episodios),
    apurar(porRoteiro.itens).janelas.map(janela => janela.episodios),
  );
}

function testMetodoDoPeriodoSegueODecidido() {
  const periodos = [{ ...NOVEMBRO, prioridade: '', metas: {}, ajustesSemana: [], metodoCalculo: 'publicacoes-v2' as const }];
  assert.equal(metodoDoPeriodo(periodos, NOVEMBRO.inicio, NOVEMBRO.fim), 'publicacoes-v2');
  // Recorte de consulta dentro do mês segue o mês.
  assert.equal(metodoDoPeriodo(periodos, '2026-11-09', '2026-11-15'), 'publicacoes-v2');
  assert.equal(metodoDoPeriodo(periodos, '2026-10-26', '2026-11-01'), 'conteudos-v1', 'semana que sai do mês não herda');
  assert.equal(metodoDoPeriodo([], NOVEMBRO.inicio, NOVEMBRO.fim), 'conteudos-v1', 'o padrão é por roteiro');
}

function testPorPublicacaoContaContaDeOutroDiaNoPeriodo() {
  const entries = [entrada({
    id: 'r3:original', contentId: 'r3', data: '2026-10-31',
    publicacoes: [
      { platformId: 'ig', data: '2026-10-31', realizada: false, contaNaGrade: true, etapa: 'edicao' },
      { platformId: 'tt', data: '2026-11-01', realizada: false, contaNaGrade: true, etapa: 'edicao' },
    ],
  })];
  const porPublicacao = countGrade({ pilares: pilaresGrandes, settings: settingsComMetodo('publicacoes-v2'), periodo: NOVEMBRO, entries, hoje: '2026-11-11' });
  const porRoteiro = countGrade({ pilares: pilaresGrandes, settings: settingsComMetodo('conteudos-v1'), periodo: NOVEMBRO, entries, hoje: '2026-11-11' });
  assert.equal(porPublicacao.previsto, 1, 'a publicação do TikTok em novembro conta em novembro');
  assert.equal(porPublicacao.itens.length, 0, 'mas o roteiro de outubro não vira item de novembro');
  assert.equal(porRoteiro.previsto, 0);
}

testContaCicloDeRepostEIgnoraFora();
testPercentualAntigoNaoViraLimite();
testSemanaParcialUsaLimiteDoIntervalo();
testGradePequenaNaoAlargaOPeriodo();
testFrequenciaNaoCortaOItem();
testMetaDoPeriodoNaoEscala();
testPostItLigadoContaUmaVez();
testOrigemEPautaNoFluxoDaGrade();
testPublicadoSoEmOutrasRedesNaoConta();
testContaPorEtapa();
testMetodoMudaMetaGeralETeto();
testMetodoDoPeriodoSegueODecidido();
testPorPublicacaoContaContaDeOutroDiaNoPeriodo();

console.log('gradeCounts tests passed');
