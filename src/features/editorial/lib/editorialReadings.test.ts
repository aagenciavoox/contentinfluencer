import assert from 'node:assert/strict';
import type { EditorialSettings } from './editorialSettings.ts';
import {
  computeReadings,
  leiturasDaSemana,
  leiturasDoEditorial,
  leiturasDoHoje,
  type ReadingsState,
} from './editorialReadings.ts';

const NOW = new Date(2026, 9, 5, 12, 0, 0);

const settings: Pick<EditorialSettings, 'redeReferenciaId' | 'distribuicaoFuncoes' | 'estoqueDesejado' | 'openInfoNotices'> = {
  redeReferenciaId: 'ig',
  distribuicaoFuncoes: {
    atrair: 35,
    converter: 30,
    aprofundar: 20,
    comunidade: 15,
    acao: 0,
    reter: 0,
  },
  estoqueDesejado: 2,
  openInfoNotices: true,
};

function baseState(partial: Partial<ReadingsState> = {}): ReadingsState {
  return {
    contents: [],
    series: [],
    pilares: [{ id: 'pilar-1', nome: 'Literatura', ativo: true, frequenciaSemanal: 14 }],
    projetos: [],
    bibliotecaItems: [],
    pauseMode: false,
    mostrarNumeros: true,
    libraryEnabled: true,
    ...partial,
  };
}

function conteudo(
  partial: Partial<ReadingsState['contents'][number]> & Pick<ReadingsState['contents'][number], 'id'>,
): ReadingsState['contents'][number] {
  return {
    status: 'Roteiro',
    seriesId: null,
    pilarId: 'pilar-1',
    funcao: null,
    funcaoOrigem: null,
    classificacaoCongeladaEm: null,
    contaNaGrade: true,
    publishDate: null,
    plataformas: [],
    deletedAt: null,
    archivedAt: null,
    tags: [],
    title: partial.id,
    script: null,
    recordedAt: null,
    postedAt: null,
    ...partial,
  };
}

function testChecarNosProximosTresDias() {
  const leituras = computeReadings(baseState({
    contents: [
      conteudo({ id: 'perto', tags: ['checar'], publishDate: '2026-10-07' }),
      conteudo({ id: 'longe', tags: ['checar'], publishDate: '2026-10-09' }),
      conteudo({ id: 'sem-etiqueta', publishDate: '2026-10-06' }),
    ],
  }), settings, NOW);
  const checar = leituras.filter(leitura => leitura.chave.startsWith('checar:'));
  assert.deepEqual(checar.map(leitura => leitura.chave), ['checar:perto']);
  assert.equal(checar[0]?.mensagem, "«perto» tem 'checar' e sai em 2 dias");
  assert.equal(checar[0]?.prioridade, 1);
}

function testLivroNaoLidoSoComBiblioteca() {
  const contents = [
    conteudo({ id: 'aberto', bibliotecaItemId: 'livro-1' }),
    conteudo({ id: 'lido', bibliotecaItemId: 'livro-2' }),
    conteudo({ id: 'lista', livroIds: ['livro-3'], bibliotecaItemId: null }),
  ];
  const bibliotecaItems = [
    { id: 'livro-1', status: 'Lendo' as const, deletedAt: null, titulo: 'O Nome do Vento' },
    { id: 'livro-2', status: 'Lido' as const, deletedAt: null },
    { id: 'livro-3', status: 'Quero ler' as const, deletedAt: null },
  ];
  const ligadas = computeReadings(baseState({ contents, bibliotecaItems }), settings, NOW);
  assert.deepEqual(
    ligadas.filter(leitura => leitura.chave.startsWith('livro:')).map(leitura => leitura.chave),
    ['livro:aberto', 'livro:lista'],
  );
  const aberto = ligadas.find(leitura => leitura.chave === 'livro:aberto');
  assert.equal(aberto?.mensagem, '«aberto» cita «O Nome do Vento», ainda não marcado como lido');
  assert.deepEqual(aberto?.resolver, { rotulo: 'Marcar como lido', tipo: 'marcar-lido', livroId: 'livro-1' });
  assert.equal(
    ligadas.find(leitura => leitura.chave === 'livro:lista')?.mensagem,
    '«lista» cita um livro, ainda não marcado como lido',
  );

  const desligadas = computeReadings(baseState({
    contents,
    bibliotecaItems,
    libraryEnabled: false,
  }), settings, NOW);
  assert.equal(desligadas.some(leitura => leitura.chave.startsWith('livro:')), false);
}

function testCotaDeFuncaoEstoqueEEvento() {
  const leituras = computeReadings(baseState({
    projetos: [
      {
        id: 'bienal',
        nome: 'Bienal',
        tipo: 'evento',
        dataInicio: '2026-10-17',
        avisoDias: 14,
        contentIds: [],
        deletedAt: null,
      },
      {
        id: 'longe',
        nome: 'Feira',
        tipo: 'evento',
        dataInicio: '2026-12-01',
        avisoDias: 14,
        contentIds: [],
        deletedAt: null,
      },
      {
        id: 'com-acao',
        nome: 'Sarau',
        tipo: 'evento',
        dataInicio: '2026-10-08',
        avisoDias: 10,
        contentIds: ['acao'],
        deletedAt: null,
      },
    ],
    contents: [
      conteudo({
        id: 'pronto',
        status: 'Produção',
        recordedAt: '2026-10-01T12:00:00.000Z',
      }),
      conteudo({
        id: 'acao',
        funcao: 'acao',
        funcaoOrigem: 'escolhida',
        publishDate: '2026-10-08',
      }),
    ],
  }), settings, NOW);

  const semana = leiturasDaSemana(leituras);
  assert.equal(semana.some(leitura => leitura.chave.startsWith('funcao:')), false);
  assert.equal(semana.some(leitura => leitura.chave === 'limite-semana'), false);
  assert.equal(semana.filter(leitura => leitura.destrava).length, 0);

  const muitos = [0, 1, 2, 3, 4, 5].map(index => conteudo({
    id: `conv-${index}`,
    funcao: 'converter',
    funcaoOrigem: 'escolhida',
    publishDate: '2026-10-06',
  }));
  const semLimite = leiturasDaSemana(computeReadings(baseState({
    contents: muitos,
  }), {
    ...settings,
    distribuicaoFuncoes: {
      atrair: 0,
      converter: 100,
      aprofundar: 0,
      comunidade: 0,
      acao: 0,
      reter: 0,
    },
    estoqueDesejado: null,
  }, NOW));
  assert.equal(semLimite.some(leitura => leitura.chave === 'limite-semana'), false);
  assert.equal(semLimite.some(leitura => leitura.chave.startsWith('funcao:')), false);

  const comLimite = leiturasDaSemana(computeReadings(baseState({
    contents: [
      conteudo({ id: 'domingo', publishDate: '2026-10-04' }),
      conteudo({ id: 'sabado', publishDate: '2026-10-10' }),
      conteudo({ id: 'antes', publishDate: '2026-10-03' }),
      conteudo({ id: 'depois', publishDate: '2026-10-11' }),
    ],
  }), {
    ...settings,
    estoqueDesejado: null,
    preferencias: {
      limiteSemanal: 1,
      reservaForaSeriesSemanal: null,
      redeReferenciaId: 'ig',
      reservaProntos: null,
      publicoLinguagem: '',
      disponibilidade: '',
      hashtagsForaSeries: '',
    },
  }, NOW));
  assert.equal(
    comLimite.find(leitura => leitura.chave === 'limite-semana')?.mensagem,
    'Esta semana tem 2 e o limite é 1',
  );

  assert.equal(semana.some(leitura => leitura.chave === 'estoque'), true);
  assert.equal(
    semana.find(leitura => leitura.chave === 'evento:bienal')?.mensagem,
    'Bienal começa em 12 dias e ainda não tem conteúdo de Ação',
  );
  assert.equal(semana.some(leitura => leitura.chave === 'evento:longe'), false);
  assert.equal(semana.some(leitura => leitura.chave === 'evento:com-acao'), false);
  assert.equal(semana.some(leitura => leitura.prioridade === 1), false);
}

function testSerieEPausaENumeros() {
  const serie = {
    id: 'serie-1',
    name: 'Clube',
    funcaoPadrao: null,
    ativa: true,
    pilarIds: [],
    pilarPrincipalId: null,
    frequenciaRecomendada: null,
    formatoVisualPadrao: [],
    energiaPadrao: null,
  };
  const abertas = computeReadings(baseState({ series: [serie] }), settings, NOW);
  assert.equal(leiturasDoEditorial(abertas).length, 1);
  // A mensagem nomeia a série e o que falta, para o aviso dizer qual é.
  assert.match(leiturasDoEditorial(abertas)[0]?.mensagem ?? '', /^«Clube» tem em aberto: .*pilar/);
  assert.equal(leiturasDoEditorial(abertas)[0]?.acao.href, '/series/serie-1');

  const semAviso = computeReadings(baseState({ series: [serie] }), { ...settings, openInfoNotices: false }, NOW);
  assert.equal(leiturasDoEditorial(semAviso).length, 0);

  const pausa = computeReadings(baseState({
    series: [serie],
    pauseMode: true,
    contents: [conteudo({ id: 'perto', tags: ['checar'], publishDate: '2026-10-06' })],
  }), settings, NOW);
  assert.deepEqual(pausa, []);

  const semNumeros = computeReadings(baseState({
    contents: [conteudo({ id: 'perto', tags: ['checar'], publishDate: '2026-10-07' })],
    mostrarNumeros: false,
    projetos: [{
      id: 'bienal',
      nome: 'Bienal',
      tipo: 'evento',
      dataInicio: '2026-10-17',
      avisoDias: 14,
      contentIds: [],
    }],
  }), settings, NOW);
  const textos = semNumeros.map(leitura => leitura.mensagem).join(' ');
  assert.equal(/\d/.test(textos), false);
  assert.match(textos, /em breve/);
  assert.equal(textos.includes('espaço de Conversão'), false);
}

function testHojeMostraTresEUmaDestrava() {
  const leituras = computeReadings(baseState({
    contents: [0, 1, 2, 3].map(index => conteudo({
      id: `c${index}`,
      tags: ['checar'],
      publishDate: '2026-10-06',
    })),
  }), settings, NOW);
  const hoje = leiturasDoHoje(leituras);
  assert.equal(hoje.length, 3);
  assert.equal(hoje.filter(leitura => leitura.destrava).length <= 1, true);
}

testChecarNosProximosTresDias();
testLivroNaoLidoSoComBiblioteca();
testCotaDeFuncaoEstoqueEEvento();
testSerieEPausaENumeros();
testHojeMostraTresEUmaDestrava();

console.log('editorialReadings.test.ts passed');
