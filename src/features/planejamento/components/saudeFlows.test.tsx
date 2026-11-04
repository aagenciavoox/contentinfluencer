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

const noop = () => {};
const postIt = {id:'p1',userId:'',texto:'Episódio de sexta',date:'2026-11-06',contentId:null,createdAt:'',updatedAt:''};
const byDate = new Map([['2026-11-06',[postIt]]]);
const intervalo = {inicio:'2026-11-01',fim:'2026-11-07'};

describe('fluxos visíveis da Saúde', () => {
  it('renderiza o episódio da sexta na semana acionada no desktop e no celular', () => {
    const desktop = renderToStaticMarkup(<PlanejamentoWeekGrid anchorDate={new Date('2026-11-01T12:00:00')} intervalo={intervalo} byDate={byDate} publicacoesDoDia={new Map()} dragOverDay={null} onDayDragOver={noop} onDayDragLeave={noop} onDayDrop={noop} renderPostIt={p => <span key={p.id}>{p.texto}</span>} renderPublicacao={() => null} onAddPauta={noop} onPuxarConteudo={noop} />);
    const mobile = renderToStaticMarkup(<MemoryRouter><PlanejamentoMobileView month={new Date('2026-11-01T12:00:00')} intervalo={intervalo} onMonthChange={noop} vista="semana" onVistaChange={noop} byDate={byDate} publicacoesDoDia={new Map()} undated={[]} contents={[]} series={[]} temas={[]} renderPostIt={p => <span key={p.id}>{p.texto}</span>} renderPublicacao={() => null} onNovoPostIt={noop} onPuxar={noop} onEditorial={noop} resumo={null} assuntoFiltroId={null} onAssuntoFiltroChange={noop} /></MemoryRouter>);
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
