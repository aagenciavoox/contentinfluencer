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
import type {AvisoOrientacao} from '../lib/orientacaoEditorial';
import {SugestaoGravacaoConteudo} from '../../recording/components/SugestaoGravacaoPanel';
import {SaveFeedbackToast} from '../../../components/ui/SaveFeedbackToast';
import {clearSaveFeedback, getSaveFeedbackState, notifySaveFeedback} from '../../../lib/saveFeedback';

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


describe('ação de concentração na faixa', () => {
  it('oferece Foi de propósito apenas para concentração identificada e com callback', () => {
    const obra: AvisoOrientacao = {id: 'obra:o:2026-11-02', tipo: 'obra-repetida', alvoId: 'o', intervalo, texto: 'Obra repetida', postItIds: [], contentIds: [], severidade: 'info'};
    const assunto: AvisoOrientacao = {...obra, id: 'tema:t', tipo: 'tema-concentrado', alvoId: 't'};
    const outros: AvisoOrientacao[] = [{...obra, id: 'serie', tipo: 'serie-acima'}, {...obra, id: 'sem-alvo', alvoId: undefined}];
    const html = renderToStaticMarkup(<AvisosFaixa avisos={[obra, assunto, ...outros]} onLocalizar={noop} onFoiDeProposito={noop} />);
    assert.equal(html.split('Foi de propósito').length - 1, 2);
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
