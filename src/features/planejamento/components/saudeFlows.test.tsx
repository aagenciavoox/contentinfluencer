import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {PlanejamentoWeekGrid} from './PlanejamentoWeekGrid';
import {PlanejamentoMobileView} from './PlanejamentoMobileView';
import {RecordingMobileScreen} from '../../../mobile/screens/recording/RecordingMobileScreen';
import {createContentDraft} from '../../contents/lib/createContentDraft';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline';
import {AvisosFaixa} from './AvisosFaixa';
import {PlanejamentoSaudeBar} from './PlanejamentoSaudeBar';
import type {AvisoOrientacao} from '../lib/orientacaoEditorial';
import {SugestaoGravacaoConteudo} from '../../recording/components/SugestaoGravacaoPanel';
import {SaveFeedbackToast} from '../../../components/ui/SaveFeedbackToast';
import {clearSaveFeedback, getSaveFeedbackState, notifySaveFeedback} from '../../../lib/saveFeedback';
import {DEFAULT_EDITORIAL_SETTINGS} from '../../editorial/lib/editorialSettings';
import {saudeDoMes} from '../lib/monthHealth';
import {SaudeEditorialPanel} from './SaudeEditorialPanel';

const noop = () => {};
const postIt = {id:'p1',userId:'',texto:'Episódio de sexta',date:'2026-11-06',contentId:null,createdAt:'',updatedAt:''};
const byDate = new Map([['2026-11-06',[postIt]]]);
const intervalo = {inicio:'2026-11-01',fim:'2026-11-07'};

describe('fluxos visíveis da Saúde', () => {
  it('renderiza o episódio da sexta na semana acionada no desktop e no celular', () => {
    const desktop = renderToStaticMarkup(<PlanejamentoWeekGrid anchorDate={new Date('2026-11-01T12:00:00')} intervalo={intervalo} byDate={byDate} dragOverDay={null} onDayDragOver={noop} onDayDragLeave={noop} onDayDrop={noop} renderPostIt={p => <span key={p.id}>{p.texto}</span>} onAddPauta={noop} onPuxarConteudo={noop} />);
    const mobile = renderToStaticMarkup(<MemoryRouter><PlanejamentoMobileView month={new Date('2026-11-01T12:00:00')} intervalo={intervalo} onMonthChange={noop} vista="semana" onVistaChange={noop} byDate={byDate} undated={[]} contents={[]} series={[]} temas={[]} renderPostIt={p => <span key={p.id}>{p.texto}</span>} onNovoPostIt={noop} onPuxar={noop} onEditorial={noop} assuntoFiltroId={null} onAssuntoFiltroChange={noop} /></MemoryRouter>);
    assert.match(desktop, /Episódio de sexta/);
    const inicioDia = desktop.indexOf('Ações de 06/11');
    const criar = desktop.indexOf('Criar post-it em sex, 6', inicioDia);
    const puxar = desktop.indexOf('Puxar conteúdo em sex, 6', inicioDia);
    const episodio = desktop.indexOf('Episódio de sexta', inicioDia);
    assert.ok(inicioDia >= 0 && criar > inicioDia && puxar > criar && episodio > puxar, 'as duas ações aparecem antes dos cards do dia');
    assert.match(mobile, /Episódio de sexta/);
    assert.match(desktop, /07\/11/);
  });
  it('mantém a seleção recebida pela gravação no celular', () => {
    const content = createContentDraft({id:'pronto',title:'Roteiro do período',status:CONTENT_STATUS.PRODUCAO});
    const html = renderToStaticMarkup(<MemoryRouter><RecordingMobileScreen readyContents={[content]} selectedIds={new Set(['pronto'])} onSelectionChange={noop} recordingBlocks={[]} allContents={[content]} pilares={[]} series={[]} availableTags={[]} activeTab="queue" onTabChange={noop} onCreateBlock={noop} onAddToExistingBlock={noop} onOpenBlock={noop} onOpenContent={noop} onReadContent={noop} /></MemoryRouter>);
    assert.match(html, /Selecionado/);
    assert.ok(html.includes('Criar bloco (1)'));
  });
});


describe('aviso pontual de concentração', () => {
  it('usa o toast existente com informação neutra, texto legível e ação de dispensar', () => {
    notifySaveFeedback({status: 'info', message: 'Para lembrar', detail: '2 pautas da mesma obra em 7 dias: Livro.', persistent: true, undoLabel: 'Foi de propósito', onUndo: noop});
    try {
      const html = renderToStaticMarkup(<MemoryRouter><SaveFeedbackToast /></MemoryRouter>);
      assert.match(html, /role="status"/);
      assert.match(html, /aria-live="polite"/);
      assert.match(html, /Para lembrar/);
      assert.match(html, /2 pautas da mesma obra/);
      assert.match(html, /Dispensar aviso/);
      assert.match(html, /Foi de propósito/);
      assert.equal(getSaveFeedbackState().onUndo, noop);
      assert.ok(!html.includes('text-[var(--danger)]'));
      assert.equal(getSaveFeedbackState().persistent, true);
    } finally {
      clearSaveFeedback();
    }
    assert.equal(getSaveFeedbackState().status, 'idle');
  });
});


describe('ajustes do planejamento', () => {
  it('começa fechado e mostra só o resumo até o clique', () => {
    const capacidade: AvisoOrientacao = {
      id: 'cap', tipo: 'capacidade-semana',
      texto: 'Esta semana pede 30,5 roteiros e cabem 12 gravações (4 dias × 3).',
      postItIds: [], contentIds: [], severidade: 'revisar',
    };
    const html = renderToStaticMarkup(<AvisosFaixa modo="ajustes" avisos={[capacidade]} onLocalizar={noop} onVerAnalise={noop} />);
    assert.match(html, /Ajustes do planejamento/);
    assert.match(html, /1 ponto para revisar/);
    assert.match(html, /aria-expanded="false"/);
    assert.ok(!html.includes('30,5 roteiros nesta semana'));
    assert.ok(!html.includes('Ajustar ritmo'));
    assert.ok(!html.includes('1 de 1'));
  });
  it('renderiza a barra unificada de saúde recolhida por padrão com período e Ver análise', () => {
    const capacidade: AvisoOrientacao = {
      id: 'cap', tipo: 'capacidade-semana',
      texto: 'Esta semana pede 30,5 roteiros e cabem 12 gravações (4 dias × 3).',
      postItIds: [], contentIds: [], severidade: 'revisar',
    };
    const html = renderToStaticMarkup(
      <PlanejamentoSaudeBar
        avisos={[capacidade]}
        onLocalizar={noop}
        continuidade={null}
        vista="mes"
        trecho="calendario"
        onTrechoChange={noop}
        intervalo={intervalo}
        onIntervaloChange={noop}
        onVerAnalise={noop}
      />,
    );
    assert.match(html, /Ajustes \(1\)/);
    assert.match(html, /Mês visível/);
    assert.match(html, /Ver análise/);
    assert.match(html, /aria-expanded="false"/);
    assert.ok(!html.includes('30,5 roteiros'));
  });
});


describe('ação de concentração na faixa', () => {
  it('oferece Foi de propósito apenas para concentração identificada e com callback', () => {
    const obra: AvisoOrientacao = {id: 'obra:o:2026-11-02', tipo: 'obra-repetida', alvoId: 'o', intervalo, texto: 'Obra repetida', postItIds: [], contentIds: [], severidade: 'info'};
    const assunto: AvisoOrientacao = {...obra, id: 'tema:t', tipo: 'tema-concentrado', alvoId: 't'};
    const outros: AvisoOrientacao[] = [{...obra, id: 'serie', tipo: 'serie-acima'}, {...obra, id: 'sem-alvo', alvoId: undefined}];
    const html = renderToStaticMarkup(<AvisosFaixa avisos={[obra, assunto, ...outros]} onLocalizar={noop} onFoiDeProposito={noop} />);
    assert.match(html, /1 de 4/);
    assert.equal(html.split('Foi de propósito').length - 1, 1, 'só o aviso em foco oferece a ação');
    const semAcao = renderToStaticMarkup(<AvisosFaixa avisos={[obra]} onLocalizar={noop} />);
    assert.ok(!semAcao.includes('Foi de propósito'));
    assert.match(semAcao, /Localizar/);
  });
});


describe('gravação por energia', () => {
  it('mostra energia, contexto opcional, motivos e montagem sem criar outra fila', () => {
    const content = createContentDraft({id: 'energia', title: 'Roteiro leve', status: CONTENT_STATUS.ROTEIRO, script: '<p>Texto</p>'});
    const html = renderToStaticMarkup(<SugestaoGravacaoConteudo
      escolha={{energia: 'média', lookId: null, cenarioId: null}} onEscolha={noop} looks={[]} cenarios={[]}
      sugestoes={[{content, energia: 'baixa', pontos: 110, motivos: ['publica amanhã', 'mesmo look']}]}
      quantidade={1} ocupado={false} erro={null} onCriar={noop} />);
    assert.match(html, /Energia de hoje/);
    assert.match(html, /Baixa/);
    assert.match(html, /Média/);
    assert.match(html, /Alta/);
    assert.match(html, /Look opcional/);
    assert.match(html, /Cenário opcional/);
    assert.match(html, /publica amanhã · mesmo look/);
    assert.match(html, /Montar bloco com estes/);
    assert.match(html, /Roteiro leve/);
    assert.match(html, /Sem energia definida aparece no fim/);
  });
  it('exibe o acionamento só na aba Sem bloco do celular e preserva as ações atuais', () => {
    const props = {readyContents: [], selectedIds: new Set<string>(), onSelectionChange: noop, recordingBlocks: [], allContents: [], pilares: [], series: [], availableTags: [], onTabChange: noop, onCreateBlock: noop, onAddToExistingBlock: noop, onOpenBlock: noop, onOpenContent: noop, onReadContent: noop, onGravarComEnergia: noop};
    const fila = renderToStaticMarkup(<MemoryRouter><RecordingMobileScreen {...props} activeTab="queue" /></MemoryRouter>);
    const blocos = renderToStaticMarkup(<MemoryRouter><RecordingMobileScreen {...props} activeTab="blocks" /></MemoryRouter>);
    assert.match(fila, /Gravar com esta energia/);
    assert.ok(!blocos.includes('Gravar com esta energia'));
    assert.match(fila, /Buscar roteiro, pilar ou série/);
  });
});

describe('Saúde do Planejamento (placar e 3 perguntas)', () => {
  it('renderiza cabeçalho com navegação, placar de 3 sinais e as 3 perguntas sem rodapé artificial', () => {
    const pilares = [
      { id: 'pil-1', userId: '', nome: 'Literatura Clássica', descricao: '', cor: '#914660', ativo: true, plataformas: [], createdAt: '', updatedAt: '' },
      { id: 'pil-2', userId: '', nome: 'Hábitos de Leitura', descricao: '', cor: '#B80049', ativo: true, plataformas: [], createdAt: '', updatedAt: '' },
    ];
    const contents = [
      createContentDraft({ id: 'c1', title: 'Clássicos Sem Medo #12', status: CONTENT_STATUS.PRODUCAO, publishDate: '2026-11-10', pilarId: 'pil-1' }),
    ];
    const counts = {
      ...saudeDoMes({
        postIts: [],
        contents,
        series: [],
        pilares,
        settings: {
          ...DEFAULT_EDITORIAL_SETTINGS,
          preferencias: { ...DEFAULT_EDITORIAL_SETTINGS.preferencias, limiteSemanal: 7 },
        },
        periodo: { inicio: '2026-11-09', fim: '2026-11-15' },
        platforms: [],
      }),
      previsto: 5,
      limite: 7,
      preparo: { total: 5, publicadas: 1, prontas: 0, gravacao: 1, escrita: 2, edicao: 1 },
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SaudeEditorialPanel
          rotuloPeriodo="11 a 17 nov"
          escopoRotulo="Semana visível"
          onFechar={noop}
          onPeriodoAnterior={noop}
          onProximoPeriodo={noop}
          pilares={pilares}
          counts={counts}
          contents={contents}
          foraDoPrazo={[
            { id: 'i-late', contentId: 'c1', tipo: 'original', postItId: null, data: '2026-11-01', hora: null, contaNaGrade: true, etapa: 'roteiro', realizada: false, realizadaEm: null, pilarId: 'pil-1', serieId: 's1', funcao: 'aprofundar' },
          ]}
          roteiroIds={['c1']}
          onResolverData={noop}
          objetivos={{
            total: 5,
            linhas: [
              { funcao: 'aprofundar', rotulo: 'Aprofundar', quantidade: 3, previstoPct: 60, desejadoPct: 50, metaQuantidade: 3, metaAjustada: false, itens: [] },
              { funcao: 'atrair', rotulo: 'Atrair alcance', quantidade: 2, previstoPct: 40, desejadoPct: 50, metaQuantidade: 3, metaAjustada: false, itens: [] },
            ],
            semObjetivo: [],
            semObjetivoPct: 0,
            incompleta: false,
            temProporcao: true,
          }}
          faixas={{
            gerais: [
              { id: 'postagem', rotulo: 'Postagem', valor: 5, faixa: { minimo: 5, meta: 7, maximo: 9 }, leitura: { estado: 'progresso', referencia: 'meta', aviso: null }, secao: 'producao' },
            ],
            contas: [],
          }}
          continuidade={{
            nenhumaAcompanhada: false,
            linhas: [
              {
                chave: 's1',
                serieId: 's1',
                nome: 'Clássicos Sem Medo',
                tipo: 'serie',
                paiNome: null,
                frequencia: '1 por semana',
                intervalos: [{ inicio: '2026-11-09', fim: '2026-11-15', quantidade: 0, meta: 1, episodios: 0, reservas: 0, foraDoPeriodo: 0, estado: 'abaixo', nota: null, abaixo: true, pausada: false, parcial: false }],
                abaixo: [],
                reservadas: [],
                concentrada: false,
                semEpisodios: false,
                foraDoPeriodo: 0,
                precisaAtencao: true,
                itens: [],
              },
            ],
            pendencias: [],
            naoAvaliadas: [],
            resumo: '',
            resumoPendencias: null,
          }}
          onAddReserva={noop}
          onOpenGravacao={noop}
        />
      </MemoryRouter>,
    );

    assert.match(html, /Saúde do Planejamento/);
    assert.match(html, /Período anterior/);
    assert.match(html, /Próximo período/);
    assert.match(html, /Metas/);
    assert.match(html, /Placar de diagnóstico rápido/);
    assert.match(html, /1\. Equilíbrio/);
    assert.match(html, /2\. Ritmo/);
    assert.match(html, /3\. Séries/);
    assert.match(html, /Mín 5 · Meta 7 · Máx 9/);
    assert.match(html, /Está equilibrado\?/);
    assert.match(html, /Falta algo\?/);
    assert.match(html, /As séries estão em dia\?/);
    assert.match(html, /id="conferencia-series"/);
    assert.match(html, /Resolver data/);
    assert.match(html, /Preparar sessão/);
    assert.match(html, /Adicionar reserva/);
    assert.match(html, /Clássicos Sem Medo/);
    assert.ok(!html.includes('Validar Planejamento'));
    assert.ok(!html.includes('Versão 2'));
    assert.ok(!html.includes('OS Ativo'));
  });
});
