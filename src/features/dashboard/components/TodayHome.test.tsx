import React, { type ComponentProps } from 'react';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import { initialState } from '../../../app/providers/appState';
import { TodayHome } from './TodayHome';
import type { AgendaItem } from '../../../lib/database';
import { TodayPublications } from './TodayPublications';

const noop = () => {};
const context = {
  state: initialState, dispatch: async () => {}, createContent: async () => {}, updateContent: async () => {},
  syncFromServer: async () => {}, ensureDataDomains: async () => {}, invalidateListCaches: noop,
  domainStatus: {}, isDomainReady: () => true,
};
function renderHome(patch: Partial<ComponentProps<typeof TodayHome>> = {}) {
  const props: ComponentProps<typeof TodayHome> = {
    state: initialState, book: null, scripts: [], series: [], suggestionText: '', recordingEnabled: true,
    isBusy: false, errorMessage: null, detailBack: { from: '/hoje' }, ideaTitle: 'Ideia preservada', ideaNotes: '',
    ideaPilarId: '', ideaSeriesId: '', ideaOriginId: '', onIdeaTitle: noop, onIdeaNotes: noop,
    onIdeaPilar: noop, onIdeaSeries: noop, onIdeaOrigin: noop, onSaveIdea: noop, onOpenBook: noop,
    onOpenLibrary: noop, onStartSession: noop, onOpenQueue: noop, onCreateScript: noop,
    onRetryBook: noop, onRetryScripts: noop, onRetryAgenda: noop, ...patch,
  };
  return renderToStaticMarkup(<MemoryRouter><AppContext.Provider value={context}><TodayHome {...props} /></AppContext.Provider></MemoryRouter>);
}

describe('Hoje: estados visíveis', () => {
  it('exibe falha recuperável em vez de afirmar que as listas estão vazias', () => {
    const html = renderHome({ bookError: true, scriptsError: true, agendaError: true });
    assert.match(html, /Não foi possível carregar a leitura atual/);
    assert.match(html, /Não foi possível carregar os roteiros/);
    assert.match(html, /Não foi possível carregar a agenda/);
    assert.doesNotMatch(html, /Nenhum livro em leitura|Nada pronto para gravar agora/);
  });
  it('bloqueia a captura durante o salvamento e preserva o texto', () => {
    const html = renderHome({ ideaSaving: true, isBusy: true });
    assert.match(html, /<fieldset[^>]*disabled/);
    assert.match(html, /value="Ideia preservada"/);
    assert.match(html, /Salvando ideia…/);
    assert.match(html, /Preparando sessão…/);
    assert.doesNotMatch(html, /Nada pronto para gravar agora/);
  });
  it('mantém a agenda no mobile e oculta módulos desligados', () => {
    const html = renderHome({ density: 'mobile', libraryEnabled: false, recordingEnabled: false,
      agenda: [{ id: 'a', title: 'Reunião editorial', date: '2026-11-03', time: '14:00' } as AgendaItem] });
    assert.match(html, /Reunião editorial/);
    assert.doesNotMatch(html, /Livro atual|Para gravar/);
  });
  it('distingue erro e carregamento de um dia sem publicações', () => {
    const render = (loading: boolean, error: boolean) => renderToStaticMarkup(<MemoryRouter><TodayPublications items={[]} loading={loading} error={error} onRetry={noop} detailBack={{ from: '/hoje' }} /></MemoryRouter>);
    assert.doesNotMatch(render(true, false), /Nenhuma publicação prevista/);
    assert.doesNotMatch(render(false, true), /Nenhuma publicação prevista/);
    assert.match(render(false, false), /Nenhuma publicação prevista para hoje/);
  });
  it('renderiza os blocos operacionais no desktop com captura rápida, foco, destravar fluxo, tom e ritmo', () => {
    const html = renderHome({
      density: 'desktop',
      ideasAwaitingTriage: 3,
      toneReminder: 'Fale como a amiga que empresta o livro favorito.',
      weeklyPace: {
        weekCount: 4,
        postedCount: 2,
        target: 5,
        summaryText: '4 de 5 na semana',
        days: [{ dayKey: '2026-11-03', label: 'Ter', count: 1, isToday: true, isPastOrToday: true }],
      },
    });
    assert.match(html, /Captura rápida/);
    assert.match(html, /Trabalhar hoje/);
    assert.match(html, /Publicações próximas/);
    assert.match(html, /Destravar fluxo/);
    assert.match(html, /3 ideias aguardando triagem/);
    assert.match(html, /Fale como a amiga que empresta o livro favorito\./);
    assert.match(html, /4 de 5 na semana/);
  });
});
