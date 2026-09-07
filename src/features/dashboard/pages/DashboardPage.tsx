import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, FolderKanban, Sparkles, Video } from 'lucide-react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { DashboardMobileScreen } from '../../../mobile/screens/dashboard/DashboardMobileScreen';
import type { MobileChromeOutletContext } from '../../../mobile/components/shell';
import { getModuleFlags } from '../../settings/lib/moduleFlags';
import { CONTENT_STATUS } from '../../contents/lib/contentPipeline';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { buildDetailBackState } from '../../../lib/navigation/detailBack';
import { createContentDraft } from '../../contents/lib/createContentDraft';
import { getGentleExperienceSettings } from '../../settings/lib/gentleExperience';
import { CreateMenuButton } from '../../../components/ui/CreateMenuButton';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { getErrorMessage } from '../../../lib/saveFeedback';
import { DailySessionPanel } from '../components/DailySessionPanel';
import {
  buildDailySessionBlock,
  defaultSelectedSessionIds,
  getSessionCandidates,
} from '../lib/dailySession';
import { getUpcomingAgenda } from '../lib/dashboardMetrics';

function resolveGreetingName(fullName: unknown, email: string | undefined): string {
  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim().split(/\s+/)[0] ?? 'Criaki';
  }
  const fromEmail = email?.split('@')[0]?.trim();
  return fromEmail || 'Criaki';
}

export function DashboardPage() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const chrome = useOutletContext<MobileChromeOutletContext | null>();
  const moduleFlags = getModuleFlags(state.preferences);
  const detailBackState = buildDetailBackState(`${location.pathname}${location.search}`);
  const greetingName = resolveGreetingName(user?.user_metadata?.full_name, user?.email);
  const gentleExperience = getGentleExperienceSettings(state.preferences);

  const candidates = useMemo(
    () => getSessionCandidates(state.contents, state.recordingBlocks),
    [state.contents, state.recordingBlocks],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const candidateIdsKey = candidates.map(content => content.id).join(',');

  useEffect(() => {
    const validIds = new Set(candidates.map(content => content.id));
    setSelectedIds(previous => {
      const pruned = [...previous].filter(id => validIds.has(id));
      if (pruned.length > 0) return new Set(pruned);
      if (previous.size === 0) return new Set(defaultSelectedSessionIds(candidates));
      return new Set();
    });
    // Membership is tracked by candidateIdsKey; keep intentional clears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateIdsKey]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const agendaToday = useMemo(
    () => getUpcomingAgenda(state.agendaItems, 20).filter(item => item.date === todayKey),
    [state.agendaItems, todayKey],
  );

  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const urgentProjects =
    gentleExperience.realDeadlineHighlights
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

  const handleNovoRoteiro = () => {
    const newContent = createContentDraft({ title: 'Novo Conteudo', status: CONTENT_STATUS.ROTEIRO });
    void dispatch({ type: 'ADD_CONTENT', payload: newContent });
    navigate(`${buildContentDetailRoute(newContent.id)}&focus=script`, detailBackState);
  };

  const handleNovaIdeia = () => {
    navigate('/criacao?compose=idea');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(candidates.map(content => content.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const createSession = async (startBurst: boolean) => {
    if (isBusy || selectedIds.size === 0 || !moduleFlags.recording) return;

    const orderedIds = candidates
      .filter(content => selectedIds.has(content.id))
      .map(content => content.id);
    const payload = buildDailySessionBlock({
      contents: state.contents,
      contentIds: orderedIds,
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
      navigate(
        startBurst
          ? `/gravacao/${payload.block.id}?burst=1`
          : `/gravacao/${payload.block.id}`,
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const sessionPanel = (
    <DailySessionPanel
      candidates={moduleFlags.recording ? candidates : []}
      series={state.series}
      selectedIds={selectedIds}
      showCounts={gentleExperience.dashboardCounts}
      isBusy={isBusy}
      density={isMobile ? 'mobile' : 'desktop'}
      onToggle={toggleSelect}
      onSelectAll={selectAll}
      onClear={clearSelection}
      onStartSession={() => void createSession(true)}
      onBuildOnly={() => void createSession(false)}
      onOpenQueue={() => navigate('/gravacao?tab=queue')}
      onCreateScript={handleNovoRoteiro}
    />
  );

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <DashboardMobileScreen
          greetingName={greetingName}
          pauseMode={gentleExperience.pauseMode}
          agendaToday={agendaToday}
          urgentProjects={urgentProjects}
          errorMessage={errorMessage}
          recordingEnabled={moduleFlags.recording}
          onOpenMenu={() => chrome?.openMobileMenu()}
          onOpenSearch={() => chrome?.openSearch()}
          onNavigate={(path) => {
            if (path.startsWith('/conteudos/')) {
              navigate(path, detailBackState);
              return;
            }
            navigate(path);
          }}
        >
          {sessionPanel}
        </DashboardMobileScreen>
      </div>
    );
  }

  return (
    <PageLayout
      contentWidth="narrow"
      header={
        <DesktopPageHeader
          section="Hoje"
          title="Sessão do dia"
          titleVariant="display"
          icon={Sparkles}
          className="mb-0"
          actions={
            <CreateMenuButton
              onCreateIdea={handleNovaIdeia}
              onCreateScript={handleNovoRoteiro}
            />
          }
        />
      }
    >
      {!moduleFlags.recording ? (
        <section className="editorial-card stack-md p-8">
          <Text variant="bodyStrong">Gravação está desligada</Text>
          <Text variant="body" className="text-[var(--text-secondary)]">
            Ative o módulo de gravação nas configurações para montar a sessão do dia.
          </Text>
          <AppButton variant="secondary" onClick={() => navigate('/configuracoes')}>
            Abrir configurações
          </AppButton>
        </section>
      ) : (
        sessionPanel
      )}

      {errorMessage ? (
        <Text variant="meta" className="text-[var(--danger)]">
          {errorMessage}
        </Text>
      ) : null}

      {gentleExperience.pauseMode ? (
        <section className="editorial-card stack-sm p-6">
          <Text variant="bodyStrong">Pausa respeitada</Text>
          <Text variant="body" className="text-[var(--text-secondary)]">
            Sugestões ficam de lado. Você ainda pode montar uma sessão quando quiser gravar.
          </Text>
        </section>
      ) : null}

      {agendaToday.length > 0 ? (
        <section className="stack-md">
          <Text variant="eyebrow" as="span">
            <CalendarDays className="h-3.5 w-3.5" />
            Para lembrar hoje
          </Text>
          <div className="stack-sm">
            {agendaToday.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate('/calendario')}
                className="editorial-card flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <div className="min-w-0">
                  <Text variant="bodyStrong" truncate>
                    {item.title}
                  </Text>
                  <Text variant="meta" className="mt-0.5">
                    {[item.date, item.time].filter(Boolean).join(' · ')}
                  </Text>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {urgentProjects.length > 0 ? (
        <section className="stack-md">
          <Text variant="eyebrow" as="span">
            <FolderKanban className="h-3.5 w-3.5" />
            Datas combinadas próximas
          </Text>
          <div className="grid-cards-row">
            {urgentProjects.map(project => (
              <button
                key={project.id}
                type="button"
                onClick={() => navigate(`/projetos/${project.id}`)}
                className="editorial-card group flex items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <div className="min-w-0">
                  <Text variant="bodyStrong" truncate>
                    {project.nome}
                  </Text>
                  <Text variant="meta" className="mt-0.5 truncate">
                    {project.brand ? `${project.brand} · ` : ''}
                    {project.dataFim}
                  </Text>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex justify-start">
        <AppButton
          variant="ghost"
          size="sm"
          leftIcon={<Video className="h-3.5 w-3.5" />}
          onClick={() => navigate('/gravacao?tab=blocks')}
        >
          Ver blocos de gravação
        </AppButton>
      </div>
    </PageLayout>
  );
}
