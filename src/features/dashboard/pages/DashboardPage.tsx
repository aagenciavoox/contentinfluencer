import { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useDomainsReady } from '../../../hooks/useDomainsReady';
import { DashboardMobileScreen } from '../../../mobile/screens/dashboard/DashboardMobileScreen';
import type { MobileChromeOutletContext } from '../../../mobile/components/shell';
import { getModuleFlags } from '../../settings/lib/moduleFlags';
import { CONTENT_STATUS } from '../../contents/lib/contentPipeline';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { buildDetailBackState } from '../../../lib/navigation/detailBack';
import { createContentDraft } from '../../contents/lib/createContentDraft';
import { createIdeaContent } from '../../contents/lib/creationContent';
import { getGentleExperienceSettings } from '../../settings/lib/gentleExperience';
import { CreateMenuButton } from '../../../components/ui/CreateMenuButton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { getErrorMessage, notifySaveFeedback } from '../../../lib/saveFeedback';
import { DayPulse } from '../components/DayPulse';
import { TodayHome } from '../components/TodayHome';
import { buildDailySessionBlock, getSessionCandidates, suggestionSummary, suggestSessionIds } from '../lib/dailySession';
import { buildDayPulse, formatDayTitle, formatWeekdayShort, localDateKey } from '../lib/dayPulse';
import { resolveCurrentRead } from '../lib/currentRead';
import { getUpcomingAgenda } from '../lib/dashboardMetrics';
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
  const { state, dispatch, ensureDataDomains } = useAppContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const chrome = useOutletContext<MobileChromeOutletContext | null>();
  const moduleFlags = getModuleFlags(state.preferences);
  const detailBackState = buildDetailBackState(`${location.pathname}${location.search}`);
  const greetingName = resolveGreetingName(user?.user_metadata?.full_name, user?.email);
  const gentleExperience = getGentleExperienceSettings(state.preferences);
  const today = useMemo(() => new Date(), []);
  const todayKey = localDateKey(today);
  const dayTitle = formatDayTitle(today);
  const weekdayLabel = formatWeekdayShort(today);

  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaNotes, setIdeaNotes] = useState('');
  const [ideaPilarId, setIdeaPilarId] = useState('');
  const [ideaSeriesId, setIdeaSeriesId] = useState('');
  const [ideaOriginId, setIdeaOriginId] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void ensureDataDomains(['library']);
  }, [ensureDataDomains]);

  const libraryReady = useDomainsReady(['library']);
  const scriptsReady = useDomainsReady(['content', 'production']);
  const pulseReady = useDomainsReady(['content', 'production', 'agenda', 'projects']);

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
  const currentBook = useMemo(() => {
    const preferredId = typeof state.preferences.mobile_notes_primary_book_id === 'string'
      ? state.preferences.mobile_notes_primary_book_id
      : null;
    return resolveCurrentRead(state.bibliotecaItems, preferredId);
  }, [state.bibliotecaItems, state.preferences.mobile_notes_primary_book_id]);

  const agendaToday = useMemo(
    () => getUpcomingAgenda(state.agendaItems, 20).filter(item => item.date === todayKey),
    [state.agendaItems, todayKey],
  );
  const in7days = format(addDays(today, 7), 'yyyy-MM-dd');
  const urgentProjects = gentleExperience.realDeadlineHighlights
    ? state.projetos
        .filter(
          project =>
            project.status !== 'Concluido' &&
            project.dataFim &&
            project.dataFim >= todayKey &&
            project.dataFim <= in7days,
        )
        .sort((left, right) => (left.dataFim! > right.dataFim! ? 1 : -1))
    : [];
  const leiturasHoje = useMemo(
    () => leiturasDoHoje(computeReadingsFromApp(state, { now: today })),
    [state, today],
  );
  const pulseSegments = buildDayPulse({
    readyCount: candidates.length,
    showCounts: gentleExperience.dashboardCounts,
    agendaToday,
    urgentProjects,
    dataReady: pulseReady,
  });

  const handleNovoRoteiro = () => {
    const newContent = createContentDraft({ title: 'Novo roteiro', status: CONTENT_STATUS.ROTEIRO });
    void dispatch({ type: 'ADD_CONTENT', payload: newContent });
    navigate(`${buildContentDetailRoute(newContent.id)}&focus=script`, detailBackState);
  };

  const saveIdea = async () => {
    const title = ideaTitle.trim();
    const notes = ideaNotes.trim();
    if (!title && !notes) return;

    try {
      const content = createIdeaContent({
        userId: user?.id || '',
        title: title || 'Ideia sem título',
        notes: notes || null,
        pilarId: ideaPilarId || null,
        seriesId: ideaSeriesId || null,
        bibliotecaItemId: ideaOriginId || null,
      });
      await dispatch({ type: 'ADD_CONTENT', payload: content });
      setIdeaTitle('');
      setIdeaNotes('');
      setIdeaPilarId('');
      setIdeaSeriesId('');
      setIdeaOriginId('');
      notifySaveFeedback({ status: 'success', message: 'Ideia guardada.' });
    } catch (error) {
      notifySaveFeedback({ status: 'error', message: getErrorMessage(error) });
    }
  };

  const startSession = async () => {
    if (isBusy || suggestedScripts.length === 0 || !moduleFlags.recording) return;
    const payload = buildDailySessionBlock({
      contents: state.contents,
      contentIds: suggestedScripts.map(content => content.id),
      userId: user?.id || '',
    });
    if (!payload) return;

    setIsBusy(true);
    setErrorMessage(null);
    try {
      await dispatch({ type: 'ADD_RECORDING_BLOCK', payload: payload.block });
      await dispatch({
        type: 'UPDATE_BLOCK_CONTENTS',
        payload: { blockId: payload.block.id, contents: payload.blockContents },
      });
      navigate(`/gravacao/${payload.block.id}?burst=1`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const home = (
    <TodayHome
      state={state}
      book={currentBook}
      bookLoading={!libraryReady}
      scripts={moduleFlags.recording ? suggestedScripts : []}
      scriptsLoading={!scriptsReady}
      series={state.series}
      suggestionText={suggestionText}
      recordingEnabled={moduleFlags.recording}
      isBusy={isBusy}
      errorMessage={errorMessage}
      detailBack={detailBackState.state}
      ideaTitle={ideaTitle}
      ideaNotes={ideaNotes}
      ideaPilarId={ideaPilarId}
      ideaSeriesId={ideaSeriesId}
      ideaOriginId={ideaOriginId}
      onIdeaTitle={setIdeaTitle}
      onIdeaNotes={setIdeaNotes}
      onIdeaPilar={setIdeaPilarId}
      onIdeaSeries={setIdeaSeriesId}
      onIdeaOrigin={setIdeaOriginId}
      onSaveIdea={() => void saveIdea()}
      onOpenBook={() => currentBook && navigate(`/biblioteca/${currentBook.id}`)}
      onOpenLibrary={() => navigate('/biblioteca')}
      onStartSession={() => void startSession()}
      onOpenQueue={() => navigate('/gravacao?tab=queue')}
      onCreateScript={handleNovoRoteiro}
      onOpenSettings={() => navigate('/configuracoes')}
      agenda={agendaToday}
      agendaLoading={!pulseReady}
      onOpenCalendar={() => navigate('/calendario')}
      density={isMobile ? 'mobile' : 'desktop'}
      leituras={leiturasHoje}
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
          onOpenMenu={() => chrome?.openMobileMenu()}
          onOpenSearch={() => chrome?.openSearch()}
        >
          {home}
        </DashboardMobileScreen>
      </div>
    );
  }

  return (
    <PageLayout
      contentWidth="full"
      header={
        <DesktopPageHeader
          section="Hoje"
          title={dayTitle}
          actions={
            <CreateMenuButton
              onCreateIdea={() => navigate('/criacao?compose=idea')}
              onCreateScript={handleNovoRoteiro}
            />
          }
        >
          <DayPulse segments={pulseSegments} />
        </DesktopPageHeader>
      }
    >
      {pause}
      {home}
    </PageLayout>
  );
}
