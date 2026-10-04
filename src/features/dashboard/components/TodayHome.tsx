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

function readingProgress(book: BibliotecaItem): number | null {
  if (!book.totalPaginas || book.paginasLidas == null || book.totalPaginas <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((book.paginasLidas / book.totalPaginas) * 100)));
}

/** Mesmo formato do card do livro (capa + 2 linhas), sem texto de vazio nem botão. */
function CurrentBookSkeleton() {
  return (
    <Surface variant="outlined" padding="md" className="h-full" aria-busy="true">
      <div className="flex gap-4">
        <Skeleton className="h-36 w-24 shrink-0 rounded-[var(--radius-card)]" />
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
  scripts,
  scriptsLoading = false,
  series,
  suggestionText,
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
  onOpenSettings,
  agenda = [],
  agendaLoading = false,
  onOpenCalendar,
  density = 'desktop',
}: {
  state: AppState;
  book: BibliotecaItem | null;
  /** Biblioteca ainda carregando: mostra skeleton em vez de "Nenhum livro em leitura". */
  bookLoading?: boolean;
  scripts: Content[];
  /** Roteiros ainda carregando: mostra skeleton em vez de "Nada pronto para gravar agora". */
  scriptsLoading?: boolean;
  series: Serie[];
  suggestionText: string;
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
  onOpenSettings: () => void;
  agenda?: AgendaItem[];
  /** Agenda ainda carregando: skeleton em vez de "Nada na agenda". */
  agendaLoading?: boolean;
  onOpenCalendar?: () => void;
  density?: 'desktop' | 'mobile';
}) {
  const progress = book ? readingProgress(book) : null;

  return (
    <div className="stack-lg">
      <section className="stack-sm">
        <Text variant="eyebrow">Ideia rápida</Text>
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
          variant="compact"
          autoFocus={false}
        />
      </section>

      <div className={density === 'desktop' ? 'grid grid-cols-3 items-stretch gap-4' : 'stack-md'}>
        {book ? (
          <Surface variant="outlined" padding="md" className="h-full" onClick={onOpenBook}>
            <div className="flex gap-4">
              <div className="h-36 w-24 shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-hover)]">
                {book.capaUrl ? (
                  <img src={book.capaUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
                    <BookOpen className="h-6 w-6" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 stack-sm">
                <Text variant="eyebrow">Livro atual</Text>
                <Text variant="itemTitle" className="line-clamp-3">{book.titulo}</Text>
                {book.autorDiretor ? <Text variant="meta">{book.autorDiretor}</Text> : null}
                <Text variant="meta">{book.status}</Text>
                {progress != null ? (
                  <div className="stack-xs pt-1">
                    <div className="h-1 overflow-hidden rounded-full bg-[var(--bg-hover)]">
                      <div className="h-full bg-[var(--brand-accent)]" style={{ width: `${progress}%` }} />
                    </div>
                    <Text variant="meta">
                      {book.paginasLidas} de {book.totalPaginas} páginas
                    </Text>
                  </div>
                ) : null}
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
        )}

        <Surface variant="outlined" padding="lg" className="flex h-full flex-col stack-md">
          <div className="stack-xs">
            <Text variant="eyebrow">Para gravar</Text>
            {recordingEnabled && scripts.length > 0 ? (
              <Text variant="secondary">{suggestionText}</Text>
            ) : null}
          </div>

          {!recordingEnabled ? (
            <>
              <Text variant="body">A gravação está desligada.</Text>
              <AppButton variant="secondary" onClick={onOpenSettings}>
                Abrir configurações
              </AppButton>
            </>
          ) : scripts.length === 0 && scriptsLoading ? (
            <ScriptListSkeleton />
          ) : scripts.length === 0 ? (
            <>
              <Text variant="body">Nada pronto para gravar agora.</Text>
              <AppButton variant="secondary" onClick={onCreateScript}>
                Criar roteiro
              </AppButton>
            </>
          ) : (
            <>
              <ul className="stack-sm">
                {scripts.map(script => {
                  const serieName = series.find(serie => serie.id === script.seriesId)?.name;
                  return (
                    <li key={script.id}>
                      <Link
                        to={buildContentDetailRoute(script.id)}
                        state={detailBack}
                        className="block rounded-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        <Text variant="bodyStrong" className="line-clamp-2">
                          {script.title?.trim() || 'Sem título'}
                        </Text>
                        {serieName ? <Text variant="meta">{serieName}</Text> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {errorMessage ? (
                <Text variant="meta" className="text-[var(--danger)]">{errorMessage}</Text>
              ) : null}
              <div className="mt-auto stack-sm">
                <AppButton
                  variant="primary"
                  fullWidth
                  disabled={isBusy}
                  leftIcon={<Video className="h-4 w-4" />}
                  onClick={onStartSession}
                >
                  {isBusy ? 'Montando…' : 'Iniciar sessão'}
                </AppButton>
                <AppButton variant="ghost" fullWidth onClick={onOpenQueue}>
                  Ver fila de roteiros
                </AppButton>
              </div>
            </>
          )}
        </Surface>

        {density === 'desktop' ? (
          agenda.length === 0 && agendaLoading ? (
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
            <Surface variant="outlined" padding="lg" className="flex h-full flex-col stack-md">
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
              {onOpenCalendar ? (
                <div className="mt-auto">
                  <AppButton variant="ghost" fullWidth onClick={onOpenCalendar} leftIcon={<CalendarDays className="h-4 w-4" />}>
                    Abrir calendário
                  </AppButton>
                </div>
              ) : null}
            </Surface>
          ) : (
            <Surface variant="outlined" padding="lg" className="flex h-full flex-col justify-between stack-md">
              <div className="stack-sm">
                <Text variant="eyebrow">Agenda do dia</Text>
                <Text variant="bodyStrong">Nada na agenda</Text>
                <Text variant="secondary">
                  Os compromissos de hoje aparecem aqui.
                </Text>
              </div>
              {onOpenCalendar ? (
                <AppButton variant="secondary" onClick={onOpenCalendar}>
                  Abrir calendário
                </AppButton>
              ) : null}
            </Surface>
          )
        ) : null}
      </div>
    </div>
  );
}
