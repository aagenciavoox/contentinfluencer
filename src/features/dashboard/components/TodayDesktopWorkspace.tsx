import type { RefObject } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Flame,
  Lightbulb,
  ListChecks,
  Subtitles,
  Video,
} from 'lucide-react';
import type { AppState } from '../../../app/providers/appState';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import type { AgendaItem, BibliotecaItem, Content } from '../../../lib/database';
import type { DetailBackState } from '../../../lib/navigation/detailBack';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { LeiturasLista } from '../../editorial/components/LeiturasLista';
import type { Leitura } from '../../editorial/lib/editorialReadings';
import { IdeaQuickCapture } from '../../ideas/components/IdeaQuickCapture';
import type { ItemPendenciaDoDia } from '../../planejamento/lib/avisosPendencia';
import type {
  EditorialFocusItem,
  EditorialFocusStage,
  UpcomingPublicationGroup,
  WeeklyPaceSummary,
} from '../lib/todayOperational';
import { TodayLoadError } from './TodayLoadError';

function readingProgress(book: BibliotecaItem): number | null {
  if (!book.totalPaginas || book.paginasLidas == null || book.totalPaginas <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((book.paginasLidas / book.totalPaginas) * 100)));
}

function StageActionIcon({ stage, colorVar }: { stage: EditorialFocusStage; colorVar: string }) {
  const style = { color: colorVar };
  if (stage === 'gravacao') {
    return <Video className="mt-0.5 h-4 w-4 shrink-0" style={style} aria-hidden />;
  }
  if (stage === 'edicao') {
    return <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0" style={style} aria-hidden />;
  }
  return <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" style={style} aria-hidden />;
}

function FocusCardsSkeleton() {
  return (
    <div className="stack-md" aria-busy="true" aria-label="Carregando conteúdos em andamento">
      {[0, 1].map(index => (
        <Surface key={index} variant="outlined" padding="lg" className="stack-sm">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-36 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-sm)]" />
        </Surface>
      ))}
    </div>
  );
}

export interface TodayDesktopWorkspaceProps {
  state: AppState;
  book: BibliotecaItem | null;
  bookLoading: boolean;
  bookError: boolean;
  libraryEnabled: boolean;
  onRetryBook: () => void;
  scripts: Content[];
  scriptsLoading: boolean;
  scriptsError: boolean;
  onRetryScripts: () => void;
  focusItems: EditorialFocusItem[];
  upcomingPublications: UpcomingPublicationGroup[];
  publicationsLoading: boolean;
  publicationsError: boolean;
  onRetryPublications: () => void;
  weeklyPace: WeeklyPaceSummary;
  ideasAwaitingTriage: number;
  toneReminder: string | null;
  showCounts: boolean;
  ideaSaving: boolean;
  pendencias: ItemPendenciaDoDia[];
  recordingEnabled: boolean;
  isBusy: boolean;
  errorMessage: string | null;
  detailBack: DetailBackState;
  ideaTitle: string;
  ideaNotes: string;
  ideaPilarId: string;
  ideaSeriesId: string;
  ideaOriginId: string;
  onIdeaTitle: (value: string) => void;
  onIdeaNotes: (value: string) => void;
  onIdeaPilar: (value: string) => void;
  onIdeaSeries: (value: string) => void;
  onIdeaOrigin: (value: string) => void;
  onSaveIdea: () => void;
  onOpenBook: () => void;
  onOpenLibrary: () => void;
  onStartSession: () => void;
  onOpenQueue: () => void;
  onCreateScript: () => void;
  agenda: AgendaItem[];
  agendaLoading: boolean;
  agendaError: boolean;
  calendarEnabled: boolean;
  onRetryAgenda: () => void;
  onOpenCalendar?: () => void;
  leituras: Leitura[];
  quickCaptureInputRef?: RefObject<HTMLInputElement | null>;
}

export function TodayDesktopWorkspace({
  state,
  book,
  bookLoading,
  bookError,
  libraryEnabled,
  onRetryBook,
  scripts,
  scriptsLoading,
  scriptsError,
  onRetryScripts,
  focusItems,
  upcomingPublications,
  publicationsLoading,
  publicationsError,
  onRetryPublications,
  weeklyPace,
  ideasAwaitingTriage,
  toneReminder,
  showCounts,
  ideaSaving,
  pendencias,
  recordingEnabled,
  isBusy,
  errorMessage,
  detailBack,
  ideaTitle,
  ideaNotes,
  ideaPilarId,
  ideaSeriesId,
  ideaOriginId,
  onIdeaTitle,
  onIdeaNotes,
  onIdeaPilar,
  onIdeaSeries,
  onIdeaOrigin,
  onSaveIdea,
  onOpenBook,
  onOpenLibrary,
  onStartSession,
  onOpenQueue,
  onCreateScript,
  agenda,
  agendaLoading,
  agendaError,
  calendarEnabled,
  onRetryAgenda,
  onOpenCalendar,
  leituras,
  quickCaptureInputRef,
}: TodayDesktopWorkspaceProps) {
  const navigate = useNavigate();
  const progress = book ? readingProgress(book) : null;
  const visiblePendencias = pendencias.slice(0, 3);
  const visibleAgenda = calendarEnabled ? agenda.slice(0, 3) : [];
  const showRecordingShortcut = recordingEnabled && scripts.length > 0 && !scriptsLoading && !isBusy;
  const unlockCount =
    (ideasAwaitingTriage > 0 ? 1 : 0) +
    visiblePendencias.length +
    (showRecordingShortcut ? 1 : 0) +
    visibleAgenda.length;
  const maxDayCount = Math.max(1, ...weeklyPace.days.map(day => day.count));

  return (
    <div className="stack-xl">
      {/* 1. Captura rápida inline */}
      <section className="stack-xs" aria-label="Captura rápida de ideias">
        <fieldset disabled={ideaSaving} className="min-w-0" aria-busy={ideaSaving}>
          <IdeaQuickCapture
            title={ideaTitle}
            notes={ideaNotes}
            selectedPilarId={ideaPilarId}
            selectedSeries={ideaSeriesId}
            selectedBibliotecaId={ideaOriginId}
            state={state}
            onTitleChange={onIdeaTitle}
            onNotesChange={onIdeaNotes}
            onSelectedPilarIdChange={onIdeaPilar}
            onSelectedSeriesChange={onIdeaSeries}
            onSelectedBibliotecaIdChange={onIdeaOrigin}
            onSave={onSaveIdea}
            variant="operational"
            autoFocus={false}
            inputRef={quickCaptureInputRef}
          />
        </fieldset>
        {ideaSaving ? <Text variant="meta" role="status">Salvando ideia…</Text> : null}
      </section>

      {/* 2. Grade editorial em 2 colunas (8 / 4) */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Coluna principal: Trabalhar hoje + Publicações próximas */}
        <div className="stack-xl min-w-0 lg:col-span-8">
          <section className="stack-md" aria-labelledby="today-work-title">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--status-writing)]"
                  aria-hidden
                />
                <Text variant="sectionTitle" id="today-work-title">
                  Trabalhar hoje
                </Text>
                {showCounts && focusItems.length > 0 && !scriptsLoading ? (
                  <Text variant="meta">
                    {focusItems.length} em andamento
                  </Text>
                ) : null}
              </div>
              <Link
                to="/criacao"
                className="eyebrow-label shrink-0 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]"
              >
                Fluxo editorial
              </Link>
            </div>

            {errorMessage ? (
              <Surface variant="outlined" padding="md" className="stack-sm" role="alert">
                <Text variant="secondary">{errorMessage}</Text>
                <div>
                  <AppButton variant="secondary" size="sm" disabled={isBusy} onClick={onStartSession}>
                    Tentar preparar sessão novamente
                  </AppButton>
                </div>
              </Surface>
            ) : null}

            {isBusy ? (
              <Text variant="meta" role="status">
                Preparando sessão…
              </Text>
            ) : null}

            {scriptsError ? (
              <Surface variant="outlined" padding="md">
                <TodayLoadError label="os roteiros" onRetry={onRetryScripts} />
              </Surface>
            ) : scriptsLoading || isBusy ? (
              <FocusCardsSkeleton />
            ) : focusItems.length === 0 ? (
              <Surface variant="outlined" padding="lg" className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="stack-xs">
                  <Text variant="bodyStrong">Tudo em dia por aqui</Text>
                  <Text variant="secondary">
                    Nenhum roteiro aberto, gravação pendente ou edição em andamento no momento.
                  </Text>
                </div>
                <AppButton variant="secondary" onClick={onCreateScript}>
                  Criar roteiro
                </AppButton>
              </Surface>
            ) : (
              <div className="stack-md">
                {focusItems.map((item, index) => (
                  <Surface
                    key={item.id}
                    as="article"
                    variant="outlined"
                    padding="lg"
                    className="group relative overflow-hidden transition-shadow hover:shadow-[var(--shadow-card-hover)]"
                  >
                    <div
                      className="absolute bottom-0 left-0 top-0 w-1"
                      style={{ backgroundColor: item.accentColorVar }}
                      aria-hidden
                    />
                    <div className="stack-sm pl-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="status" status={item.badgeStatus}>
                            {item.stageLabel}
                          </Badge>
                          {item.seriesName ? (
                            <>
                              <Text variant="meta" aria-hidden>·</Text>
                              <Text variant="meta">Série: {item.seriesName}</Text>
                            </>
                          ) : null}
                        </div>
                        {item.platformNames.length > 0 ? (
                          <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                            {item.platformNames.slice(0, 3).map(platform => (
                              <PlatformIcon key={platform} platform={platform} className="h-3.5 w-3.5" />
                            ))}
                            <Text variant="meta">{item.platformNames.join(' / ')}</Text>
                          </div>
                        ) : null}
                      </div>

                      <div className="stack-xs">
                        <Link
                          to={item.to}
                          state={detailBack}
                          className="block rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                        >
                          <Text
                            variant="itemTitle"
                            as="h3"
                            className="transition-colors group-hover:text-[var(--brand-accent-text)]"
                          >
                            {item.title}
                          </Text>
                        </Link>
                        <Text variant="secondary" className="line-clamp-2">
                          {item.excerpt}
                        </Text>
                      </div>

                      <div className="mt-1 flex flex-col items-start justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] p-3 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <StageActionIcon stage={item.stage} colorVar={item.accentColorVar} />
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <Text variant="eyebrow" as="span">
                              Próxima ação
                            </Text>
                            <Text variant="bodyStrong" as="p" className="line-clamp-2">
                              {item.nextAction}
                            </Text>
                          </div>
                        </div>
                        <Link
                          to={item.to}
                          state={detailBack}
                          className={
                            index === 0
                              ? 'inline-flex h-8 shrink-0 items-center gap-1.5 self-end rounded-[var(--radius-input)] bg-[var(--accent)] px-3 t-button text-[var(--bg-elevated)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] sm:self-center'
                              : 'inline-flex h-8 shrink-0 items-center gap-1.5 self-end rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 t-button text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] sm:self-center'
                          }
                        >
                          <span>{item.ctaLabel}</span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </Surface>
                ))}

                {recordingEnabled && scripts.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <Text variant="meta">
                      {scripts.length === 1
                        ? '1 roteiro pronto para gravar no teleprompter.'
                        : `${scripts.length} roteiros prontos para gravar em sequência.`}
                    </Text>
                    <div className="flex items-center gap-2">
                      <AppButton variant="secondary" size="xs" onClick={onOpenQueue}>
                        Ver fila de gravação
                      </AppButton>
                      <AppButton
                        variant="secondary"
                        size="xs"
                        leftIcon={<Video className="h-3.5 w-3.5" />}
                        onClick={onStartSession}
                      >
                        Iniciar sessão
                      </AppButton>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          {/* Publicações próximas (próximos 3 dias) */}
          {calendarEnabled ? (
            <section className="stack-md" aria-labelledby="today-publications-title">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CalendarClock className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden />
                  <Text variant="sectionTitle" id="today-publications-title">
                    Publicações próximas
                  </Text>
                  <Text variant="meta">Próximos 3 dias</Text>
                </div>
                <Link
                  to="/calendario"
                  className="t-label shrink-0 text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]"
                >
                  Ver calendário
                </Link>
              </div>

              <Surface variant="outlined" padding="none" className="overflow-hidden">
                {publicationsError ? (
                  <div className="p-4">
                    <TodayLoadError label="as publicações" onRetry={onRetryPublications} />
                  </div>
                ) : publicationsLoading ? (
                  <div className="p-4 stack-sm" aria-busy="true" aria-label="Carregando publicações">
                    <Skeleton className="h-12 w-full rounded-[var(--radius-sm)]" />
                    <Skeleton className="h-12 w-full rounded-[var(--radius-sm)]" />
                  </div>
                ) : upcomingPublications.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <Text variant="secondary">
                      Nenhuma publicação prevista para os próximos 3 dias.
                    </Text>
                    {onOpenCalendar ? (
                      <AppButton variant="secondary" size="xs" onClick={onOpenCalendar}>
                        Abrir calendário
                      </AppButton>
                    ) : null}
                  </div>
                ) : (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {upcomingPublications.map(group => (
                      <li key={group.key}>
                        <Link
                          to={buildContentDetailRoute(group.contentId, 'publicacao')}
                          state={detailBack}
                          className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-center">
                              <Text
                                variant="eyebrow"
                                as="span"
                                className={group.isToday ? 'text-[var(--brand-accent-text)]' : undefined}
                              >
                                {group.dayBadge}
                              </Text>
                              <Text variant="bodyStrong" as="span" className="t-label tabular-nums">
                                {group.time || '—'}
                              </Text>
                            </div>
                            <div className="min-w-0 flex-1">
                              <Text variant="itemTitle" as="span" truncate className="block">
                                {group.content.title.trim() || 'Sem título'}
                              </Text>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[var(--text-secondary)]">
                                {group.platforms.length > 0 ? (
                                  <>
                                    <span className="inline-flex items-center gap-1">
                                      {group.platforms.slice(0, 2).map(platform => (
                                        <PlatformIcon key={platform} platform={platform} className="h-3.5 w-3.5" colored />
                                      ))}
                                      <Text variant="meta">{group.platforms.join(' · ')}</Text>
                                    </span>
                                    <Text variant="meta" aria-hidden>·</Text>
                                  </>
                                ) : null}
                                <Text variant="meta">{group.subtitleNote}</Text>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <Badge variant="status" status={group.status}>
                              {group.statusLabel}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Surface>
            </section>
          ) : null}
        </div>

        {/* Coluna lateral: Destravar fluxo, Leitura & Tom Editorial, Ritmo de postagens */}
        <aside className="stack-lg min-w-0 lg:col-span-4" aria-label="Resumo operacional">
          {/* Card 1: Destravar fluxo */}
          <Surface variant="outlined" padding="lg" className="stack-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ListChecks className="h-4 w-4 shrink-0 text-[var(--brand-accent-strong)]" aria-hidden />
                <Text variant="itemTitle" as="h2">
                  Destravar fluxo
                </Text>
              </div>
              {showCounts && unlockCount > 0 ? (
                <Text variant="meta">
                  {unlockCount === 1 ? '1 pendência' : `${unlockCount} pendências`}
                </Text>
              ) : null}
            </div>

            {agendaError ? (
              <TodayLoadError label="a agenda" onRetry={onRetryAgenda} />
            ) : null}

            {unlockCount === 0 && !agendaError && !agendaLoading ? (
              <Text variant="secondary">
                Nenhuma pendência no fluxo agora.
              </Text>
            ) : (
              <div className="stack-sm">
                {ideasAwaitingTriage > 0 ? (
                  <Link
                    to="/criacao?tab=ideias"
                    className="group flex items-start justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] p-3 transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-idea)]" aria-hidden />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <Text variant="bodyStrong" as="span" className="t-label text-[var(--text-primary)] group-hover:text-[var(--brand-accent-text)] transition-colors">
                          {ideasAwaitingTriage === 1
                            ? '1 ideia aguardando triagem'
                            : `${ideasAwaitingTriage} ideias aguardando triagem`}
                        </Text>
                        <Text variant="meta">Na fila de criação</Text>
                      </div>
                    </div>
                    <Text variant="label" className="mt-0.5 shrink-0 text-[var(--brand-accent-text)]">
                      Triar →
                    </Text>
                  </Link>
                ) : null}

                {visiblePendencias.map(item => (
                  <Link
                    key={`${item.contentId}:${item.date}`}
                    to={buildContentDetailRoute(item.contentId, 'publicacao')}
                    state={detailBack}
                    className="group flex items-start justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] p-3 transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      <Subtitles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-accent-strong)]" aria-hidden />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <Text variant="bodyStrong" as="span" className="line-clamp-1 t-label text-[var(--text-primary)] group-hover:text-[var(--brand-accent-text)] transition-colors">
                          {item.titulo}
                        </Text>
                        <Text variant="meta" className="line-clamp-1">
                          {item.pendencias.join(' · ')}
                        </Text>
                      </div>
                    </div>
                    <Text variant="label" className="mt-0.5 shrink-0 text-[var(--text-secondary)]">
                      Revisar
                    </Text>
                  </Link>
                ))}

                {showRecordingShortcut ? (
                  <button
                    type="button"
                    onClick={onStartSession}
                    className="group flex w-full items-start justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] p-3 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      <Video className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-ready)]" aria-hidden />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <Text variant="bodyStrong" as="span" className="t-label text-[var(--text-primary)] group-hover:text-[var(--brand-accent-text)] transition-colors">
                          {scripts.length === 1
                            ? '1 roteiro pronto para gravar'
                            : `${scripts.length} roteiros prontos para gravar`}
                        </Text>
                        <Text variant="meta">Abrir sessão no teleprompter</Text>
                      </div>
                    </div>
                    <Text variant="label" className="mt-0.5 shrink-0 text-[var(--text-secondary)]">
                      Gravar
                    </Text>
                  </button>
                ) : null}

                {visibleAgenda.map(item => (
                  <Link
                    key={item.id}
                    to="/calendario"
                    className="group flex items-start justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] p-3 transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-blue)]" aria-hidden />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <Text variant="bodyStrong" as="span" className="line-clamp-1 t-label text-[var(--text-primary)] group-hover:text-[var(--brand-accent-text)] transition-colors">
                          {item.title.trim() || 'Compromisso'}
                        </Text>
                        <Text variant="meta">
                          {[item.time, item.tipo].filter(Boolean).join(' · ') || 'Hoje na agenda'}
                        </Text>
                      </div>
                    </div>
                    <Text variant="label" className="mt-0.5 shrink-0 text-[var(--text-secondary)]">
                      Ver
                    </Text>
                  </Link>
                ))}

                {agendaLoading && visibleAgenda.length === 0 ? (
                  <Skeleton className="h-14 w-full rounded-[var(--radius-sm)]" />
                ) : null}
              </div>
            )}
          </Surface>

          {/* Card 2: Leitura & Tom editorial */}
          {libraryEnabled || toneReminder ? (
            <Surface variant="outlined" padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
                <Text variant="eyebrow">
                  {libraryEnabled ? 'Leitura & Tom editorial' : 'Tom editorial'}
                </Text>
                <Link
                  to="/editorial"
                  className="t-label text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]"
                >
                  Editorial
                </Link>
              </div>

              <div className="stack-sm px-4 pb-4">
                {libraryEnabled ? (
                  bookError ? (
                    <TodayLoadError label="a leitura atual" onRetry={onRetryBook} />
                  ) : bookLoading ? (
                    <Skeleton className="h-36 w-full rounded-[var(--radius-sm)]" />
                  ) : book ? (
                    <div className="stack-xs">
                      <button
                        type="button"
                        onClick={onOpenBook}
                        className="group relative block h-36 w-full overflow-hidden rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        {book.capaUrl ? (
                          <img
                            src={book.capaUrl}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[var(--surface-subtle)] text-[var(--text-tertiary)]">
                            <BookOpen className="h-8 w-8" aria-hidden />
                          </div>
                        )}
                        <div
                          className="absolute inset-0 flex flex-col justify-end p-3"
                          style={{
                            background: 'linear-gradient(to top, var(--overlay-scrim), transparent 72%)',
                          }}
                        >
                          <Text variant="bodyStrong" as="span" className="line-clamp-2 text-[var(--brand-on-accent)]">
                            {book.titulo}
                          </Text>
                          {book.autorDiretor ? (
                            <Text variant="meta" className="line-clamp-1 text-[var(--brand-on-accent)]">
                              {book.autorDiretor}
                            </Text>
                          ) : null}
                        </div>
                      </button>

                      {book.paginasLidas != null || progress != null ? (
                        <div className="stack-xs pt-1">
                          <div className="flex items-center justify-between gap-2">
                            <Text variant="meta">
                              {book.totalPaginas && book.totalPaginas > 0
                                ? `Pág. ${book.paginasLidas ?? 0} de ${book.totalPaginas}`
                                : `Pág. ${book.paginasLidas} · Em leitura`}
                            </Text>
                            {progress != null ? (
                              <Text variant="meta" className="tabular-nums">
                                {progress}%
                              </Text>
                            ) : null}
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                            <div
                              className="h-full rounded-full bg-[var(--brand-accent)] transition-all"
                              style={{ width: `${progress ?? 0}%` }}
                              aria-label={`Progresso de leitura: ${progress ?? 0}%`}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] p-3">
                      <div className="min-w-0">
                        <Text variant="bodyStrong" className="t-label text-[var(--text-primary)]">
                          Nenhum livro em leitura
                        </Text>
                        <Text variant="meta" className="block">
                          Marque um livro como lendo na biblioteca.
                        </Text>
                      </div>
                      <AppButton variant="secondary" size="xs" onClick={onOpenLibrary}>
                        Biblioteca
                      </AppButton>
                    </div>
                  )
                ) : null}

                <div className="stack-xs rounded-[var(--radius-sm)] bg-[var(--bg-primary)] p-3">
                  <Text variant="eyebrow">Lembrete de tom</Text>
                  {toneReminder ? (
                    <p className="font-mono t-secondary leading-relaxed text-[var(--text-primary)]">
                      “{toneReminder}”
                    </p>
                  ) : (
                    <Text variant="secondary">
                      Defina seu tom de voz em Editorial para manter sua referência visível ao escrever.
                    </Text>
                  )}
                </div>
              </div>
            </Surface>
          ) : null}

          {/* Card 3: Ritmo de postagens */}
          {calendarEnabled ? (
            <Surface
              variant="interactive"
              padding="md"
              onClick={() => navigate('/planejamento')}
              className="flex items-center justify-between gap-3"
              aria-label={`Ritmo de postagens: ${weeklyPace.summaryText}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-accent-soft)] text-[var(--brand-accent-text)]">
                  <Flame className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <Text variant="bodyStrong" truncate>
                    Ritmo de postagens
                  </Text>
                  <Text variant="meta" truncate className="block">
                    {weeklyPace.summaryText}
                  </Text>
                </div>
              </div>

              <div className="flex h-8 shrink-0 items-end gap-1" aria-hidden>
                {weeklyPace.days.map(day => {
                  const ratio = day.count > 0 ? Math.max(0.35, day.count / maxDayCount) : 0.2;
                  const heightPx = Math.round(ratio * 32);
                  return (
                    <span
                      key={day.dayKey}
                      title={`${day.label}: ${day.count}`}
                      className={
                        day.count > 0
                          ? 'w-2 rounded-t-[var(--radius-sm)] bg-[var(--brand-accent-strong)] transition-all'
                          : day.isToday
                            ? 'w-2 rounded-t-[var(--radius-sm)] bg-[var(--border-strong)] transition-all'
                            : 'w-2 rounded-t-[var(--radius-sm)] bg-[var(--surface-subtle)] transition-all'
                      }
                      style={{ height: `${heightPx}px` }}
                    />
                  );
                })}
              </div>
            </Surface>
          ) : null}

          {/* Leituras editoriais (sobrecarga semanal / livro concluído) */}
          <LeiturasLista leituras={leituras} />
        </aside>
      </div>
    </div>
  );
}
