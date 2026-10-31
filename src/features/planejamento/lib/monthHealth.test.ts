import assert from 'node:assert/strict';
import type {Pilar, Serie} from '../../../lib/database.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {excessosAoAcrescentar, foraDaContaDoMes, publicacoesEmOutrasRedes, periodoDoMes, saudeDoMes, seriesDoPilarNoMes, textoForaDaConta, tomDaSaude} from './monthHealth.ts';
import type {PlanejamentoPostIt} from './postIt.ts';

const PERIODO = {inicio: '2026-10-01', fim: '2026-10-31'};
const PERCENTUAIS = {
  atrair: 100,
  converter: 0,
  aprofundar: 0,
  comunidade: 0,
  acao: 0,
  reter: 0,
};

const serie = {
  id: 'serie-1',
  name: 'Leituras',
  funcaoPadrao: 'atrair',
  pilarPrincipalId: 'pilar-1',
  pilarIds: ['pilar-1'],
} as Serie;

const pilar = {
  id: 'pilar-1',
  nome: 'Literatura',
  ativo: true,
  frequenciaSemanal: 2,
  cor: '#336699',
} as Pilar;

function postIt(partial: Partial<PlanejamentoPostIt> & Pick<PlanejamentoPostIt, 'id'>): PlanejamentoPostIt {
  return {
    userId: '',
    texto: '',
    date: '2026-10-12',
    contentId: null,
    createdAt: '2026-10-04T12:00:00.000Z',
    updatedAt: '2026-10-04T12:00:00.000Z',
    ...partial,
  };
}

function saude(input: {
  postIts?: PlanejamentoPostIt[];
  contents?: ReturnType<typeof createContentDraft>[];
}) {
  return saudeDoMes({
    postIts: input.postIts ?? [],
    contents: input.contents ?? [],
    series: [serie],
    pilares: [pilar],
    settings: {redeReferenciaId: null, proporcaoFuncoes: PERCENTUAIS},
    periodo: PERIODO,
  });
}

function testPeriodoDoMes() {
  const periodo = periodoDoMes(new Date(2026, 9, 15));
  assert.equal(periodo.inicio, '2026-10-01');
  assert.equal(periodo.fim, '2026-10-31');
}

function testPostItHerdadoContaNoPilarENaFuncao() {
  const content = createContentDraft({
    id: 'ideia-1',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serie.id,
    publishDate: null,
  }, serie);
  const counts = saude({
    postIts: [postIt({id: 'post-1', contentId: content.id})],
    contents: [content],
  });
  assert.equal(counts.pilares[0]?.planejado, 1);
  assert.equal(counts.pilares[0]?.meta, null);
  assert.equal(counts.limite, null);
  assert.equal(counts.funcoes.find(linha => linha.id === 'atrair')?.planejado, 1);
}

function testPostItVazioNaoTemPautaESemDataNaoEntra() {
  const semData = saude({
    postIts: [postIt({id: 'pilha', contentId: null, texto: 'nota', date: null})],
  });
  assert.equal(semData.previsto, 0);

  const semPauta = saude({
    postIts: [postIt({id: 'vazio', contentId: null, texto: 'Post-it vazio'})],
  });
  assert.equal(semPauta.previsto, 1);
  assert.equal(semPauta.comPauta, 0);

  const comNota = saude({
    postIts: [postIt({id: 'nota', contentId: null, texto: 'nota'})],
  });
  assert.equal(comNota.previsto, 1);
  assert.equal(comNota.comPauta, 1);
}

function testDataOficialContaQuandoNaoHaPostIt() {
  const content = createContentDraft({
    id: 'roteiro-1',
    status: CONTENT_STATUS.ROTEIRO,
    seriesId: serie.id,
    publishDate: '2026-10-08',
  }, serie);
  const counts = saude({contents: [content]});
  assert.equal(counts.pilares[0]?.planejado, 1);
}

function testPostItNaoDuplicaOOriginalNoMesmoMes() {
  const content = createContentDraft({
    id: 'roteiro-2',
    status: CONTENT_STATUS.ROTEIRO,
    seriesId: serie.id,
    publishDate: '2026-10-03',
  }, serie);
  const counts = saude({
    postIts: [postIt({id: 'post-2', contentId: content.id, date: '2026-10-20'})],
    contents: [content],
  });
  assert.equal(counts.pilares[0]?.planejado, 1);
}

function testPostItForaDoMesNaoConta() {
  const content = createContentDraft({
    id: 'ideia-2',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serie.id,
    publishDate: null,
  }, serie);
  const counts = saude({
    postIts: [postIt({id: 'post-3', contentId: content.id, date: '2026-11-02'})],
    contents: [content],
  });
  assert.equal(counts.somaPlanejado, 0);
}

function testSeriesDoPilarMostraQuantidadeEZero() {
  const outra = {
    id: 'serie-2',
    name: 'Bastidores',
    funcaoPadrao: 'atrair',
    pilarPrincipalId: 'pilar-2',
    pilarIds: ['pilar-2'],
    cor: '#112233',
  } as Serie;
  const vazia = {
    id: 'serie-3',
    name: 'Arquivo',
    funcaoPadrao: null,
    pilarPrincipalId: 'pilar-1',
    pilarIds: ['pilar-1'],
    cor: '#445566',
  } as Serie;
  const content = createContentDraft({
    id: 'ideia-serie',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serie.id,
    publishDate: null,
  }, serie);
  const segundo = createContentDraft({
    id: 'ideia-serie-b',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serie.id,
    publishDate: null,
  }, serie);
  const counts = saude({
    postIts: [
      postIt({id: 'post-a', contentId: content.id}),
      postIt({id: 'post-b', contentId: segundo.id, date: '2026-10-18'}),
    ],
    contents: [content, segundo],
  });
  const linhas = seriesDoPilarNoMes('pilar-1', [serie, outra, vazia], counts.entries);
  assert.deepEqual(linhas.map(linha => [linha.nome, linha.quantidade]), [
    ['Leituras', 2],
    ['Arquivo', 0],
  ]);
}

testPeriodoDoMes();
testPostItHerdadoContaNoPilarENaFuncao();
testPostItVazioNaoTemPautaESemDataNaoEntra();
testDataOficialContaQuandoNaoHaPostIt();
testPostItNaoDuplicaOOriginalNoMesmoMes();
function testTomDaSaude() {
  assert.equal(tomDaSaude(0, 10), 'vazio');
  assert.equal(tomDaSaude(4, 10), 'vazio');
  assert.equal(tomDaSaude(5, 10), 'metade');
  assert.equal(tomDaSaude(10, 10), 'completo');
  assert.equal(tomDaSaude(11, 10), 'passou');
}

function testFrequenciaDoPilarNaoFechaOMes() {
  const cheio = {
    ...pilar,
    frequenciaSemanal: 1,
  } as Pilar;
  const contents = [0, 1, 2, 3, 4].map(index => createContentDraft({
    id: `ideia-${index}`,
    status: CONTENT_STATUS.IDEIA,
    seriesId: serie.id,
    publishDate: `2026-10-${String(index + 1).padStart(2, '0')}`,
  }, serie));
  const extra = createContentDraft({
    id: 'ideia-extra',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serie.id,
    publishDate: null,
  }, serie);
  const semLimite = excessosAoAcrescentar({
    content: extra,
    date: '2026-10-20',
    postIts: [],
    contents: [...contents, extra],
    series: [serie],
    pilares: [cheio],
    settings: {redeReferenciaId: null, proporcaoFuncoes: PERCENTUAIS},
  });
  assert.deepEqual(semLimite, []);

  const lista = excessosAoAcrescentar({
    content: extra,
    date: '2026-10-20',
    postIts: [],
    contents: [...contents, extra],
    series: [serie],
    pilares: [cheio],
    settings: {
      redeReferenciaId: null,
      proporcaoFuncoes: PERCENTUAIS,
      preferencias: {
        limiteSemanal: 1,
        reservaForaSeriesSemanal: null,
        redeReferenciaId: null,
        reservaProntos: null,
        publicoLinguagem: '',
        disponibilidade: '',
        hashtagsForaSeries: '',
        limiteGravacoesDia: null,
      },
    },
  });
  assert.equal(lista.length, 1);
  assert.equal(lista[0]?.nome, 'Limite do período');
  assert.equal(lista[0]?.planejado, 5);
  assert.equal(lista[0]?.meta, 4);
}

function testSemExcessoEnquantoAindaCabe() {
  const content = createContentDraft({
    id: 'ideia-cabe',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serie.id,
    publishDate: null,
  }, serie);
  const lista = excessosAoAcrescentar({
    content,
    date: '2026-10-20',
    postIts: [],
    contents: [content],
    series: [serie],
    pilares: [pilar],
    settings: {redeReferenciaId: null, proporcaoFuncoes: PERCENTUAIS},
  });
  assert.deepEqual(lista, []);
}

function testForaDaContaExplicaOQueNaoEntrou() {
  const base = {
    contentId: 'c',
    tipo: 'original' as const,
    hora: null,
    serieId: null,
    funcao: null,
    realizada: false,
    realizadaEm: null,
  };
  const counts = {
    periodo: {inicio: '2026-10-01', fim: '2026-10-31'},
    pilares: [{id: 'p1', rotulo: 'Literatura', planejado: 1, realizado: 0, meta: 5, previsto: 1, comPauta: 0, publicado: 0}],
  };
  const fora = foraDaContaDoMes(counts, [
    {...base, id: 'a', data: '2026-10-07', contaNaGrade: true, pilarId: 'p1'},
    {...base, id: 'b', data: '2026-10-10', contaNaGrade: true, pilarId: null},
    {...base, id: 'c', data: '2026-10-11', contaNaGrade: true, pilarId: null},
    {...base, id: 'd', data: '2026-10-12', contaNaGrade: true, pilarId: 'inativo'},
    {...base, id: 'e', data: '2026-10-13', contaNaGrade: false, pilarId: 'p1'},
    {...base, id: 'f', data: '2026-11-02', contaNaGrade: true, pilarId: null},
  ], 0);
  assert.deepEqual(fora, {semPilar: 0, foraDaGrade: 1, pilarSemEspaco: 0, outrasRedes: 0});
  assert.equal(
    textoForaDaConta(fora),
    '1 item com data neste mês não entra na conta: 1 marcados fora das metas.',
  );
  assert.equal(textoForaDaConta({semPilar: 0, foraDaGrade: 0, pilarSemEspaco: 0, outrasRedes: 0}), null);

  const tiktok = createContentDraft({id: 'so-tiktok', status: CONTENT_STATUS.POSTADO, publishDate: '2026-10-10'}, serie);
  tiktok.plataformas = [{
    id: 'p-tt', contentId: 'so-tiktok', platformId: 'tiktok', legenda: '', hashtags: '',
    publishDate: '2026-10-10', publishDateEnabled: true,
  }];
  const insta = createContentDraft({id: 'no-insta', status: CONTENT_STATUS.POSTADO, publishDate: '2026-10-11'}, serie);
  insta.plataformas = [{
    id: 'p-ig', contentId: 'no-insta', platformId: 'instagram', legenda: '', hashtags: '',
    publishDate: '2026-10-11', publishDateEnabled: true,
  }];
  assert.equal(
    publicacoesEmOutrasRedes({
      contents: [tiktok, insta],
      settings: {redeReferenciaId: 'instagram'},
      periodo: {inicio: '2026-10-01', fim: '2026-10-31'},
    }),
    0,
  );
}

testPostItForaDoMesNaoConta();
testSeriesDoPilarMostraQuantidadeEZero();
testTomDaSaude();
testFrequenciaDoPilarNaoFechaOMes();
testSemExcessoEnquantoAindaCabe();
testForaDaContaExplicaOQueNaoEntrou();

function testPublicacaoGravadaComNomeContaQuandoReferenciaEhOId() {
  const platforms = [{id: 'plat-instagram', nome: 'Instagram'}];
  const content = createContentDraft({
    id: 'nome-vs-id',
    status: CONTENT_STATUS.POSTADO,
    seriesId: serie.id,
    publishDate: '2026-10-09',
  }, serie);
  content.plataformas = [{
    id: 'p-ig', contentId: 'nome-vs-id', platformId: 'Instagram', legenda: '', hashtags: '',
    publishDate: '2026-10-09', publishDateEnabled: true, status: 'publicada',
  }];
  const counts = saudeDoMes({
    postIts: [],
    contents: [content],
    series: [serie],
    pilares: [pilar],
    settings: {redeReferenciaId: 'plat-instagram', proporcaoFuncoes: PERCENTUAIS},
    periodo: PERIODO,
    platforms,
  });
  assert.equal(counts.entries.some(entry => entry.contentId === 'nome-vs-id'), true);
  assert.equal(counts.pilares[0]?.planejado, 1);
}

function testPublicacoesEmOutrasRedesNaoContaPublicacaoNaPropriaReferencia() {
  const platforms = [{id: 'plat-instagram', nome: 'Instagram'}];
  const insta = createContentDraft({
    id: 'nome-na-referencia',
    status: CONTENT_STATUS.POSTADO,
    publishDate: '2026-10-11',
  }, serie);
  insta.plataformas = [{
    id: 'p-ig', contentId: 'nome-na-referencia', platformId: 'Instagram', legenda: '', hashtags: '',
    publishDate: '2026-10-11', publishDateEnabled: true,
  }];
  assert.equal(
    publicacoesEmOutrasRedes({
      contents: [insta],
      settings: {redeReferenciaId: 'plat-instagram'},
      periodo: PERIODO,
      platforms,
    }),
    0,
  );
}

testPublicacaoGravadaComNomeContaQuandoReferenciaEhOId();
testPublicacoesEmOutrasRedesNaoContaPublicacaoNaPropriaReferencia();

function testProporcaoDefineMetaDosObjetivos() {
  const content = createContentDraft({
    id: 'com-proporcao',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serie.id,
    publishDate: '2026-10-05',
  }, serie);
  const counts = saudeDoMes({
    postIts: [],
    contents: [content],
    series: [serie],
    pilares: [pilar],
    settings: {
      redeReferenciaId: null,
      proporcaoFuncoes: PERCENTUAIS,
      preferencias: {
        limiteSemanal: 7,
        reservaForaSeriesSemanal: null,
        redeReferenciaId: null,
        reservaProntos: null,
        publicoLinguagem: '',
        disponibilidade: '',
        hashtagsForaSeries: '',
        limiteGravacoesDia: null,
      },
    },
    periodo: {inicio: '2026-10-04', fim: '2026-10-10'},
  });
  assert.equal(counts.limite, 7);
  assert.equal(counts.funcoes.find(linha => linha.id === 'atrair')?.meta, 7);
  assert.equal(counts.funcoes.find(linha => linha.id === 'atrair')?.planejado, 1);
}

testProporcaoDefineMetaDosObjetivos();
