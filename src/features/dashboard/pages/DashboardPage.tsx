import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format } from 'date-fns';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import type { AppDataDomain, Content, ContentPlataforma } from '../../../lib/database';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { resolveDomainStatus } from '../../../context/domainLoading';
import { DashboardMobileScreen } from '../../../mobile/screens/dashboard/DashboardMobileScreen';
import type { MobileChromeOutletContext } from '../../../mobile/components/shell';
import { getModuleFlags } from '../../settings/lib/moduleFlags';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { buildDetailBackState } from '../../../lib/navigation/detailBack';
import { createIdeaContent, createScriptWithPublications } from '../../contents/lib/creationContent';
import { pilarEscolhidoDaBiblioteca } from '../../library/lib/pilarDeItemDaBiblioteca';
import { ScriptComposer } from '../../creation/components/ScriptComposer';
import { aplicarEscolhasDaSerie } from '../../editorial/lib/escolhasSerie';
import { getGentleExperienceSettings } from '../../settings/lib/gentleExperience';
import { itensPendenciaDoDia } from '../../planejamento/lib/avisosPendencia';
import { CreateMenuButton } from '../../../components/ui/CreateMenuButton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { getErrorMessage, notifySaveFeedback } from '../../../lib/saveFeedback';
import { DayPulse } from '../components/DayPulse';
import { TodayHome } from '../components/TodayHome';
import { buildDailySessionBlock, getSessionCandidates, suggestionSummary, suggestSessionIds } from '../lib/dailySession';
import { buildDayPulse, formatDayTitle, formatWeekdayShort, localDateKey } from '../lib/dayPulse';
import { resolveCurrentRead } from '../lib/currentRead';
import { getTodayAgenda } from '../lib/todayAgenda';
import { getTodayWork } from '../lib/todayWork';
import { getTodayPublications } from '../lib/todayPublications';
import { saveDailySession, type DailySessionPayload } from '../lib/saveDailySession';
import { useToday } from '../hooks/useToday';
import { useTodayIdeaDraft } from '../hooks/useTodayIdeaDraft';
import { TodayWork } from '../components/TodayWork';
import { TodayPublications } from '../components/TodayPublications';
import {
  computeReadingsFromApp,
  leiturasDoHoje,
} from '../../editorial/lib/editorialReadings';

function resolveGreetingName(fullName: unknown, email: string | undefined): string {
  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim().split(/\s+/)[0] ?? 'Criaki';
  }
  const fromEmail = email?.split('@')[0]?.trim();
  return fromEmail || 'Criaki';
}

export function DashboardPage() {
  const { state, dispatch, ensureDataDomains, domainStatus, isDomainReady } = useAppContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const chrome = useOutletContext<MobileChromeOutletContext | null>();
  const moduleFlags = getModuleFlags(state.preferences);
  const detailBackState = buildDetailBackState(`${location.pathname}${location.search}`);
  const greetingName = resolveGreetingName(user?.user_metadata?.full_name, user?.email);
  const gentleExperience = getGentleExperienceSettings(state.preferences);
  const today = useToday();
  const todayKey = localDateKey(today);
  const dayTitle = formatDayTitle(today);
  const weekdayLabel = formatWeekdayShort(today);

  const { draft, updateDraft, clearDraft } = useTodayIdeaDraft(user?.id || 'local');
  const { title: ideaTitle, notes: ideaNotes, pilarId: ideaPilarId, seriesId: ideaSeriesId, originId: ideaOriginId } = draft;
  const [scriptComposerOpen, setScriptComposerOpen] = useState(false);
  const [ideaSaving, setIdeaSaving] = useState(false);
  const [scriptSaving, setScriptSaving] = useState(false);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const savingIdea = useRef(false);
  const savingScript = useRef(false);
  const savingSession = useRef(false);
  const pendingSession = useRef<DailySessionPayload | null>(null);
  const pendingIdea = useRef<{ snapshot: string; content: Content } | null>(null);
  const pendingScript = useRef<Content | null>(null);

  const domains = (requested: AppDataDomain[]) => {
    const ready = requested.every(isDomainReady);
    const error = requested.some(domain => !isDomainReady(domain) && resolveDomainStatus(domainStatus, domain) === 'error');
    return { ready, error, loading: !ready && !error };
  };
  const library = domains(moduleFlags.library ? ['library'] : []);
  const scripts = domains(['content', 'production', ...(moduleFlags.recording ? ['recording' as const] : [])]);
  const agenda = domains(moduleFlags.calendar ? ['agenda'] : []);
  const projects = domains(moduleFlags.projects ? ['projects'] : []);
  const publications = domains(['content', 'production']);
  const retry = (requested: AppDataDomain[]) => {
    void ensureDataDomains(requested, { force: true }).catch(() => {});
  };

  useEffect(() => {
    const requested: AppDataDomain[] = ['content', 'production'];
    if (moduleFlags.library) requested.push('library');
    if (moduleFlags.recording) requested.push('recording');
    if (moduleFlags.calendar) requested.push('agenda');
    if (moduleFlags.projects) requested.push('projects');
    void ensureDataDomains(requested).catch(() => {});
  }, [ensureDataDomains, moduleFlags.library, moduleFlags.recording, moduleFlags.calendar, moduleFlags.projects]);

  const candidates = useMemo(
    () => getSessionCandidates(state.contents, state.recordingBlocks),
    [state.contents, state.recordingBlocks],
  );
  const suggestedScripts = useMemo(() => {
    const ids = new Set(suggestSessionIds(candidates));
    return candidates.filter(content => ids.has(content.id));
  }, [candidates]);
  const suggestionText = useMemo(
    () => suggestionSummary(candidates, state.series),
    [candidates, state.series],
  );
  const pendenciasDoDia = useMemo(() => {
    if (!gentleExperience.calmSuggestions || gentleExperience.pauseMode) return [];
    return itensPendenciaDoDia({
      contents: state.contents,
      platforms: state.platforms,
      series: state.series,
      redeReferenciaId: state.editorial.preferencias.redeReferenciaId,
      diasGravacao: state.editorial.preferencias.diasGravacao,
      antecedenciaPostagemDias: state.editorial.preferencias.antecedenciaPostagemDias,
      pausas: state.editorial.pausas ?? [],
      hoje: today,
    });
  }, [
    today,
    gentleExperience.calmSuggestions,
    gentleExperience.pauseMode,
    state.contents,
    state.platforms,
    state.series,
    state.editorial.preferencias.redeReferenciaId,
    state.editorial.preferencias.diasGravacao,
    state.editorial.preferencias.antecedenciaPostagemDias,
    state.editorial.pausas,
  ]);
  const currentBook = useMemo(() => {
    const preferredId = typeof state.preferences.mobile_notes_primary_book_id === 'string'
      ? state.preferences.mobile_notes_primary_book_id
      : null;
    return resolveCurrentRead(state.bibliotecaItems, preferredId);
  }, [state.bibliotecaItems, state.preferences.mobile_notes_primary_book_id]);

  const agendaToday = useMemo(
    () => moduleFlags.calendar ? getTodayAgenda(state.agendaItems, todayKey) : [],
    [state.agendaItems, todayKey, moduleFlags.calendar],
  );
  const in7days = format(addDays(today, 7), 'yyyy-MM-dd');
  const urgentProjects = moduleFlags.projects && projects.ready && gentleExperience.realDeadlineHighlights
    ? state.projetos
        .filter(
          project =>
            !project.deletedAt && project.status !== 'Concluido' &&
            project.dataFim &&
            project.dataFim >= todayKey &&
            project.dataFim <= in7days,
        )
        .sort((left, right) => (left.dataFim! > right.dataFim! ? 1 : -1))
    : [];
  const leiturasHoje = useMemo(
    () => scripts.ready && projects.ready && library.ready
      ? leiturasDoHoje(computeReadingsFromApp({ ...state, projetos: moduleFlags.projects ? state.projetos : [] }, { now: today }))
      : [],
    [state, today, scripts.ready, projects.ready, library.ready, moduleFlags.projects],
  );
  const pulseSegments = buildDayPulse({
    readyCount: gentleExperience.calmSuggestions && !gentleExperience.pauseMode
      ? pendenciasDoDia.length
      : candidates.length,
    showCounts: gentleExperience.dashboardCounts,
    agendaToday,
    urgentProjects,
    dataReady: scripts.ready && agenda.ready && projects.ready,
    recordingEnabled: moduleFlags.recording,
    calendarEnabled: moduleFlags.calendar,
    pendencyMode: gentleExperience.calmSuggestions && !gentleExperience.pauseMode,
  });

  // Novo roteiro passa antes pela escolha das redes, como na Criação.
  const handleNovoRoteiro = () => setScriptComposerOpen(true);

  const criarRoteiro = async (plataformas: ContentPlataforma[]) => {
    if (savingScript.current) return;
    savingScript.current = true;
    setScriptSaving(true);
    const content = createScriptWithPublications(plataformas, pendingScript.current ?? { title: 'Novo roteiro' });
    pendingScript.current = content;
    try {
      await dispatch({ type: state.contents.some(item => item.id === content.id) ? 'UPDATE_CONTENT' : 'ADD_CONTENT', payload: content });
      pendingScript.current = null;
      setScriptComposerOpen(false);
      navigate(buildContentDetailRoute(content.id) + '&focus=script', detailBackState);
    } catch {
      // O contexto informa a falha; o compositor permanece aberto para tentar novamente.
    } finally {
      savingScript.current = false;
      setScriptSaving(false);
    }
  };

  const scriptComposer = (
    <ScriptComposer open={scriptComposerOpen} saving={scriptSaving}
      onClose={() => { if (!savingScript.current) { setScriptComposerOpen(false); pendingScript.current = null; } }}
      onCreate={criarRoteiro} />
  );

  const saveIdea = async () => {
    const title = ideaTitle.trim();
    const notes = ideaNotes.trim();
    if ((!title && !notes) || savingIdea.current) return;
    savingIdea.current = true;
    setIdeaSaving(true);
    const snapshot = JSON.stringify(draft);
    let content = pendingIdea.current?.snapshot === snapshot ? pendingIdea.current.content : null;
    if (!content) {
      const serie = ideaSeriesId ? state.series.find(item => item.id === ideaSeriesId) ?? { id: ideaSeriesId } : null;
      const pilarDaObra = !ideaPilarId && ideaOriginId ? pilarEscolhidoDaBiblioteca(state.pilares) : null;
      content = createIdeaContent({
        userId: user?.id || '', title: title || 'Ideia sem título', notes: notes || null,
        pilarId: pilarDaObra?.pilarId ?? (ideaPilarId || null),
        pilarOrigem: pilarDaObra || ideaPilarId ? 'escolhida' : null,
        seriesId: ideaSeriesId || null, bibliotecaItemId: ideaOriginId || null,
      });
      if (serie) content = aplicarEscolhasDaSerie(content, serie);
      pendingIdea.current = { snapshot, content };
    }
    notifySaveFeedback({ status: 'saving', message: 'Salvando ideia…' });
    try {
      await dispatch({ type: state.contents.some(item => item.id === content.id) ? 'UPDATE_CONTENT' : 'ADD_CONTENT', payload: content }, { silent: true });
      clearDraft();
      pendingIdea.current = null;
      notifySaveFeedback({ status: 'success', message: 'Ideia salva' });
    } catch (error) {
      notifySaveFeedback({ status: 'error', message: getErrorMessage(error) });
    } finally {
      savingIdea.current = false;
      setIdeaSaving(false);
    }
  };

  const startSession = async () => {
    if (savingSession.current || !moduleFlags.recording) return;
    if (!pendingSession.current && (!scripts.ready || suggestedScripts.length === 0)) return;
    const payload = pendingSession.current ?? buildDailySessionBlock({
      contents: state.contents,
      contentIds: suggestedScripts.map(content => content.id),
      userId: user?.id || '',
    });
    if (!payload) return;
    pendingSession.current = payload;
    savingSession.current = true;
    setSessionSaving(true);
    setErrorMessage(null);
    try {
      await saveDailySession(payload, dispatch, state.recordingBlocks.some(block => block.id === payload.block.id));
      pendingSession.current = null;
      navigate('/gravacao/' + payload.block.id + '?burst=1');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      savingSession.current = false;
      setSessionSaving(false);
    }
  };

  const workItems = getTodayWork(state.contents, scripts.ready ? state.recordingBlocks : [], moduleFlags.recording);
  const publicationsToday = useMemo(() => getTodayPublications({
    contents: state.contents, platforms: state.platforms, series: state.series,
    redeReferenciaId: state.editorial.preferencias?.redeReferenciaId ?? state.editorial.redeReferenciaId,
  }, todayKey), [state.contents, state.platforms, state.series, state.editorial, todayKey]);

  const publicationsNode = moduleFlags.calendar ? (
    <TodayPublications
      items={publicationsToday}
      loading={publications.loading}
      error={publications.error}
      onRetry={() => retry(['content', 'production'])}
      detailBack={detailBackState.state}
    />
  ) : null;

  const metricsData = {
    readyScriptsCount: candidates.length,
    publicationsCount: publicationsToday.length,
    urgentDeadlinesCount: urgentProjects.length,
    agendaCount: agendaToday.length,
  };

  const home = (
    <TodayHome
      state={state}
      book={currentBook}
      bookLoading={library.loading}
      bookError={library.error}
      libraryEnabled={moduleFlags.library}
      onRetryBook={() => retry(['library'])}
      scripts={moduleFlags.recording ? suggestedScripts : []}
      scriptsLoading={scripts.loading}
      scriptsError={scripts.error}
      onRetryScripts={() => retry(['content', 'production', 'recording'])}
      series={state.series}
      suggestionText=""
      pendencias={pendenciasDoDia}
      recordingEnabled={moduleFlags.recording}
      isBusy={sessionSaving}
      ideaSaving={ideaSaving}
      errorMessage={errorMessage}
      detailBack={detailBackState.state}
      ideaTitle={ideaTitle}
      ideaNotes={ideaNotes}
      ideaPilarId={ideaPilarId}
      ideaSeriesId={ideaSeriesId}
      ideaOriginId={ideaOriginId}
      onIdeaTitle={value => updateDraft({ ...draft, title: value })}
      onIdeaNotes={value => updateDraft({ ...draft, notes: value })}
      onIdeaPilar={value => updateDraft({ ...draft, pilarId: value })}
      onIdeaSeries={value => updateDraft({ ...draft, seriesId: value })}
      onIdeaOrigin={value => updateDraft({ ...draft, originId: value })}
      onSaveIdea={() => void saveIdea()}
      onOpenBook={() => currentBook && navigate(`/biblioteca/${currentBook.id}`)}
      onOpenLibrary={() => navigate('/biblioteca')}
      onStartSession={() => void startSession()}
      onOpenQueue={() => navigate('/gravacao?tab=queue')}
      onCreateScript={handleNovoRoteiro}
      agenda={agendaToday}
      agendaLoading={agenda.loading}
      agendaError={agenda.error}
      calendarEnabled={moduleFlags.calendar}
      onRetryAgenda={() => retry(['agenda'])}
      onOpenCalendar={() => navigate('/calendario')}
      density={isMobile ? 'mobile' : 'desktop'}
      leituras={leiturasHoje}
      workItems={scripts.ready ? workItems : []}
      metrics={metricsData}
      publicationsSlot={publicationsNode}
    />
  );

  const pause = gentleExperience.pauseMode ? (
    <Surface variant="outlined" padding="md" className="stack-sm">
      <Text variant="bodyStrong">Pausa respeitada</Text>
      <Text variant="secondary">
        Sugestões ficam de lado. A gravação continua disponível se você quiser.
      </Text>
    </Surface>
  ) : null;

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <DashboardMobileScreen
          greetingName={greetingName}
          weekdayLabel={weekdayLabel}
          pulseSegments={pulseSegments}
          pauseMode={gentleExperience.pauseMode}
          onOpenProfile={() => navigate('/configuracoes/perfil')}
          onOpenSearch={() => chrome?.openSearch()}
        >
          {home}
        </DashboardMobileScreen>
        {scriptComposer}
      </div>
    );
  }

  return (
    <PageLayout
      contentWidth="wide"
      header={
        <DesktopPageHeader
          section="Hoje"
          title={dayTitle}
          actions={
            <CreateMenuButton
              variant="secondary"
              onCreateIdea={() => navigate('/criacao?compose=idea')}
              onCreateScript={handleNovoRoteiro}
            />
          }
        />
      }
    >
      {pause}
      {home}
      {scriptComposer}
    </PageLayout>
  );
}
