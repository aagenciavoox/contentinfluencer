import type { ReactNode } from 'react';
import { BookOpen, CalendarDays, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import type { AgendaItem, BibliotecaItem, Content, Serie } from '../../../lib/database';
import type { DetailBackState } from '../../../lib/navigation/detailBack';
import type { AppState } from '../../../app/providers/appState';
import { IdeaQuickCapture } from '../../ideas/components/IdeaQuickCapture';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { LeiturasLista } from '../../editorial/components/LeiturasLista';
import type { Leitura } from '../../editorial/lib/editorialReadings';
import { TodayLoadError } from './TodayLoadError';
import { TodayMetricsSummary, type TodayMetrics } from './TodayMetricsSummary';
import { TodayWork } from './TodayWork';
import type { TodayWorkItem } from '../lib/todayWork';
import type { ItemPendenciaDoDia } from '../../planejamento/lib/avisosPendencia';

function readingProgress(book: BibliotecaItem): number | null {
  if (!book.totalPaginas || book.paginasLidas == null || book.totalPaginas <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((book.paginasLidas / book.totalPaginas) * 100)));
}

/** Mesmo formato do card do livro (capa + 2 linhas), sem texto de vazio nem botão. */
function CurrentBookSkeleton() {
  return (
    <Surface variant="outlined" padding="md" className="h-full" aria-busy="true">
      <div className="flex gap-4">
        <Skeleton className="h-44 w-32 shrink-0 rounded-[var(--radius-card)]" />
        <div className="min-w-0 flex-1 stack-sm">
          <Text variant="eyebrow">Livro atual</Text>
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </Surface>
  );
}

/** Lista de roteiros em carregamento, no lugar de "Nada pronto para gravar agora". */
function ScriptListSkeleton() {
  return (
    <>
      <ul className="stack-sm" aria-busy="true">
        {[0, 1, 2].map(index => (
          <li key={index} className="stack-xs">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/3" />
          </li>
        ))}
      </ul>
      <div className="mt-auto">
        <Skeleton className="h-10 w-full rounded-[var(--radius-input)]" />
      </div>
    </>
  );
}

export function TodayHome({
  state,
  book,
  bookLoading = false,
  bookError = false,
  libraryEnabled = true,
  onRetryBook,
  scripts,
  scriptsLoading = false,
  scriptsError = false,
  onRetryScripts,
  ideaSaving = false,
  series,
  suggestionText,
  pendencias = [],
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
  agenda = [],
  agendaLoading = false,
  agendaError = false,
  calendarEnabled = true,
  onRetryAgenda,
  onOpenCalendar,
  density = 'desktop',
  leituras = [],
  workItems,
  metrics,
  publicationsSlot,
}: {
  state: AppState;
  book: BibliotecaItem | null;
  /** Biblioteca ainda carregando: mostra skeleton em vez de "Nenhum livro em leitura". */
  bookLoading?: boolean;
  bookError?: boolean;
  libraryEnabled?: boolean;
  onRetryBook: () => void;
  scripts: Content[];
  /** Roteiros ainda carregando: mostra skeleton em vez de "Nada pronto para gravar agora". */
  scriptsLoading?: boolean;
  scriptsError?: boolean;
  onRetryScripts: () => void;
  ideaSaving?: boolean;
  series: Serie[];
  suggestionText: string;
  pendencias?: ItemPendenciaDoDia[];
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
  agenda?: AgendaItem[];
  /** Agenda ainda carregando: skeleton em vez de "Nada na agenda". */
  agendaLoading?: boolean;
  agendaError?: boolean;
  calendarEnabled?: boolean;
  onRetryAgenda: () => void;
  onOpenCalendar?: () => void;
  density?: 'desktop' | 'mobile';
  leituras?: Leitura[];
  workItems?: TodayWorkItem[];
  metrics?: TodayMetrics;
  publicationsSlot?: ReactNode;
}) {
  const progress = book ? readingProgress(book) : null;
  // Agenda vazia não ganha card: o subtítulo do dia já diz "nada na agenda".
  const showAgendaCard = calendarEnabled && (agenda.length > 0 || agendaLoading || agendaError);
  const mainGridClass = density === 'desktop'
    ? (showAgendaCard ? 'grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch' : 'grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch')
    : 'stack-md';

  return (
    <div className="stack-lg">
      {pendencias.length > 0 ? (
        <Surface variant="outlined" padding="md" className="stack-sm">
          <Text variant="eyebrow">O que falta para postar</Text>
          <ul className="stack-sm">
            {pendencias.map(item => (
              <li key={item.contentId + ':' + item.date}>
                <Link
                  to={buildContentDetailRoute(item.contentId)}
                  state={detailBack}
                  className="block rounded-[var(--radius-sm)] px-1 py-1 hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Text variant="bodyStrong" className="line-clamp-1">{item.titulo}</Text>
                  <Text variant="meta">{item.pendencias.join(' · ')}</Text>
                </Link>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      {/* 1. Posicionamento da "Ideia Rápida": integrado logo abaixo do cabeçalho, linha única */}
      <section className="stack-xs" aria-labelledby="today-quick-idea">
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
            variant="single-line"
            autoFocus={false}
          />
        </fieldset>
        {ideaSaving ? <Text variant="meta" role="status">Salvando ideia…</Text> : null}
      </section>

      {/* 2. Layout em 2 Colunas no Topo: Continuar trabalho + Resumo rápido de métricas */}
      {metrics ? (
        <div className={density === 'desktop' ? 'grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch' : 'stack-md'}>
          <TodayWork items={workItems ?? []} detailBack={detailBack} />
          <TodayMetricsSummary metrics={metrics} />
        </div>
      ) : workItems && workItems.length > 0 ? (
        <TodayWork items={workItems} detailBack={detailBack} />
      ) : null}

      {/* 3. Publicações de hoje */}
      {publicationsSlot}

      {/* 4. Secção Livro Atual e Para Gravar: Harmonização de Alturas e Espaçamentos */}
      <div className={mainGridClass}>
        {libraryEnabled ? (bookError ? (
          <Surface variant="outlined" padding="md"><TodayLoadError label="a leitura atual" onRetry={onRetryBook} /></Surface>
        ) : book ? (
          <Surface variant="outlined" padding="md" className="flex h-full flex-col justify-between" onClick={onOpenBook}>
            <div className="flex gap-4">
              <div className="h-44 w-32 shrink-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)] shadow-sm">
                {book.capaUrl ? (
                  <img src={book.capaUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
                    <BookOpen className="h-8 w-8" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-between stack-sm">
                <div className="stack-xs">
                  <Text variant="eyebrow">Livro atual</Text>
                  <Text variant="itemTitle" className="line-clamp-3">{book.titulo}</Text>
                  {book.autorDiretor ? <Text variant="meta">{book.autorDiretor}</Text> : null}
                </div>
                {/* Barra de progresso de leitura sutil */}
                <div className="stack-xs pt-1 mt-auto">
                  <div className="flex items-center justify-between">
                    <Text variant="meta">
                      {book.totalPaginas && book.totalPaginas > 0
                        ? `Pág. ${book.paginasLidas ?? 0} de ${book.totalPaginas} • ${progress ?? 0}%`
                        : book.paginasLidas
                          ? `Pág. ${book.paginasLidas} • Em leitura`
                          : 'Em leitura'}
                    </Text>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
                    <div
                      className="h-full rounded-full bg-[var(--brand-accent)] transition-all"
                      style={{ width: `${progress ?? 0}%` }}
                      aria-label={`Progresso de leitura: ${progress ?? 0}%`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Surface>
        ) : bookLoading ? (
          <CurrentBookSkeleton />
        ) : (
          <Surface variant="outlined" padding="lg" className="flex h-full flex-col justify-between stack-md">
            <div className="stack-sm">
              <Text variant="eyebrow">Livro atual</Text>
              <Text variant="bodyStrong">Nenhum livro em leitura</Text>
              <Text variant="secondary">
                Marque um livro como lendo para ele ficar aqui.
              </Text>
            </div>
            <AppButton variant="secondary" onClick={onOpenLibrary}>
              Abrir biblioteca
            </AppButton>
          </Surface>
        )) : null}

        {recordingEnabled ? (
          <Surface variant="outlined" padding="lg" className="flex h-full flex-col justify-between stack-md">
            <div className="stack-sm">
              <div className="stack-xs">
                <Text variant="eyebrow">Para gravar</Text>
                {isBusy ? <Text variant="meta" role="status">Preparando sessão…</Text> : null}
                {recordingEnabled && scripts.length > 0 && !scriptsLoading && suggestionText ? (
                  <Text variant="secondary">{suggestionText}</Text>
                ) : null}
              </div>

              {errorMessage ? (
                <div className="stack-sm" role="alert">
                  <Text variant="secondary">{errorMessage}</Text>
                  <AppButton variant="secondary" disabled={isBusy} onClick={onStartSession}>Tentar preparar sessão novamente</AppButton>
                </div>
              ) : null}
              {scriptsError ? (
                <TodayLoadError label="os roteiros" onRetry={onRetryScripts} />
              ) : scriptsLoading || isBusy ? (
                // Mesmo com roteiros na mão, espera os blocos: senão a lista mostra 3 e encolhe para 1.
                <ScriptListSkeleton />
              ) : scripts.length === 0 ? (
                <>
                  <Text variant="body">Nada pronto para gravar agora.</Text>
                  <AppButton variant="secondary" onClick={onCreateScript}>
                    Criar roteiro
                  </AppButton>
                </>
              ) : (
                <ul className="stack-sm">
                  {scripts.map(script => {
                    const serieName = series.find(serie => serie.id === script.seriesId)?.name;
                    return (
                      <li
                        key={script.id}
                        className="group flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--surface-subtle)] p-2.5 transition-colors hover:bg-[var(--bg-hover)]"
                      >
                        <Link
                          to={buildContentDetailRoute(script.id)}
                          state={detailBack}
                          className="min-w-0 flex-1 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                        >
                          <Text variant="bodyStrong" className="line-clamp-1 group-hover:text-[var(--accent-blue)] transition-colors">
                            {script.title?.trim() || 'Sem título'}
                          </Text>
                          {serieName ? <Text variant="meta">{serieName}</Text> : null}
                        </Link>
                        <Link
                          to={buildContentDetailRoute(script.id, 'gravacao')}
                          state={detailBack}
                          aria-label={`Gravar ${script.title?.trim() || 'roteiro'}`}
                          title="Gravar agora"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--brand-accent)] hover:bg-[var(--brand-accent)] hover:text-[var(--brand-on-accent)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                        >
                          <Video className="h-4 w-4" aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {scripts.length > 0 && !scriptsLoading && !isBusy ? (
              <div className="mt-auto stack-sm pt-2">
                <AppButton
                  variant="primary"
                  fullWidth
                  disabled={isBusy}
                  leftIcon={<Video className="h-4 w-4" />}
                  onClick={onStartSession}
                >
                  {isBusy ? 'Preparando…' : 'Gravar agora'}
                </AppButton>
                <AppButton variant="secondary" fullWidth onClick={onOpenQueue}>
                  Ver roteiros prontos
                </AppButton>
              </div>
            ) : null}
          </Surface>
        ) : null}

        {showAgendaCard ? (
          agendaError ? (
            <Surface variant="outlined" padding="md"><TodayLoadError label="a agenda" onRetry={onRetryAgenda} /></Surface>
          ) : agenda.length === 0 && agendaLoading ? (
            <Surface variant="outlined" padding="lg" className="flex h-full flex-col stack-md" aria-busy="true">
              <Text variant="eyebrow">Agenda do dia</Text>
              <ul className="stack-sm">
                {[0, 1, 2].map(index => (
                  <li key={index} className="stack-xs">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-1/3" />
                  </li>
                ))}
              </ul>
            </Surface>
          ) : agenda.length > 0 ? (
            <Surface variant="outlined" padding="lg" className="flex h-full flex-col justify-between stack-md">
              <div className="stack-sm">
                <Text variant="eyebrow">Agenda do dia</Text>
                <ul className="stack-sm">
                  {agenda.map(item => (
                    <li key={item.id} className="stack-xs">
                      <Text variant="bodyStrong" className="line-clamp-2">
                        {item.title.trim() || 'Compromisso'}
                      </Text>
                      <Text variant="meta">
                        {[item.time, item.tipo].filter(Boolean).join(' · ')}
                      </Text>
                    </li>
                  ))}
                </ul>
              </div>
              {onOpenCalendar ? (
                <div className="mt-auto pt-2">
                  <AppButton variant="ghost" fullWidth onClick={onOpenCalendar} leftIcon={<CalendarDays className="h-4 w-4" />}>
                    Abrir calendário
                  </AppButton>
                </div>
              ) : null}
            </Surface>
          ) : null
        ) : null}
      </div>

      {/* 5. Bloco Organização (Rodapé com visualização de limite semanal) */}
      <LeiturasLista leituras={leituras} />
    </div>
  );
}
