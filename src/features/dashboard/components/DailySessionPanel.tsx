import { Check, ListVideo, Video } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { EMPTY } from '../../../lib/uiCopy';
import { cn } from '../../../lib/utils';
import type { Content, Serie } from '../../../lib/database';
import { getDisplayStatus } from '../../contents/lib/contentPipeline';

export function DailySessionPanel({
  candidates,
  series,
  selectedIds,
  showCounts,
  isBusy,
  density = 'desktop',
  onToggle,
  onSelectAll,
  onClear,
  onStartSession,
  onBuildOnly,
  onOpenQueue,
  onCreateScript,
}: {
  candidates: Content[];
  series: Serie[];
  selectedIds: Set<string>;
  showCounts: boolean;
  isBusy: boolean;
  density?: 'desktop' | 'mobile';
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onStartSession: () => void;
  onBuildOnly: () => void;
  onOpenQueue: () => void;
  onCreateScript: () => void;
}) {
  const selectedCount = selectedIds.size;
  const allSelected = candidates.length > 0 && candidates.every(item => selectedIds.has(item.id));
  const isMobile = density === 'mobile';

  const resolveMeta = (content: Content) => {
    const serieName = series.find(serie => serie.id === content.seriesId)?.name;
    const status = getDisplayStatus(content);
    return [serieName, status].filter(Boolean).join(' · ');
  };

  const resolveSerie = (content: Content) =>
    series.find(serie => serie.id === content.seriesId)?.name ?? null;

  if (isMobile) {
    return (
      <section className="stack-lg">
        <div className="stack-sm">
          <Text variant="itemTitle" as="h2">
            Montar gravação
          </Text>
          {showCounts && candidates.length > 0 ? (
            <Text variant="meta">
              {candidates.length === 1
                ? '1 roteiro disponível'
                : `${candidates.length} roteiros disponíveis`}
              {selectedCount > 0 ? ` · ${selectedCount} na sessão` : ''}
            </Text>
          ) : null}
        </div>

        {candidates.length === 0 ? (
          <div className="stack-md rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
            <Text variant="bodyStrong">{EMPTY.dailySession.title}</Text>
            <Text variant="body" className="text-[var(--text-secondary)]">
              {EMPTY.dailySession.description}
            </Text>
            <div className="flex flex-col gap-2">
              <AppButton variant="primary" onClick={onCreateScript} fullWidth>
                Criar roteiro
              </AppButton>
              <AppButton variant="secondary" onClick={onOpenQueue} fullWidth>
                Abrir gravação
              </AppButton>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <AppButton variant="ghost" size="sm" onClick={allSelected ? onClear : onSelectAll}>
                {allSelected ? 'Limpar seleção' : 'Selecionar todos'}
              </AppButton>
              <AppButton variant="ghost" size="sm" onClick={onOpenQueue}>
                Ver fila completa
              </AppButton>
            </div>

            <ul className="stack-sm">
              {candidates.map(content => {
                const selected = selectedIds.has(content.id);
                return (
                  <li key={content.id}>
                    <button
                      type="button"
                      onClick={() => onToggle(content.id)}
                      aria-pressed={selected}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-left',
                        'transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                        selected && 'border-l-2 border-l-[var(--brand-accent)]',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border',
                          selected
                            ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)] text-[var(--brand-on-accent)]'
                            : 'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-transparent',
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <Text variant="bodyStrong" truncate>
                          {content.title || '(sem título)'}
                        </Text>
                        <Text variant="meta" className="mt-0.5" truncate>
                          {resolveMeta(content)}
                        </Text>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="stack-sm">
              <AppButton
                variant="primary"
                size="lg"
                fullWidth
                disabled={selectedCount === 0 || isBusy}
                leftIcon={<Video className="h-4 w-4" />}
                onClick={onStartSession}
              >
                {isBusy
                  ? 'Montando…'
                  : selectedCount === 0
                    ? 'Escolha roteiros para gravar'
                    : selectedCount === 1
                      ? 'Iniciar sessão (1 roteiro)'
                      : `Iniciar sessão (${selectedCount} roteiros)`}
              </AppButton>
              <AppButton
                variant="secondary"
                fullWidth
                disabled={selectedCount === 0 || isBusy}
                onClick={onBuildOnly}
              >
                Só montar bloco
              </AppButton>
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="stack-lg">
      <div className="stack-sm">
        <Text variant="pageTitle" as="h2">
          Montar gravação
        </Text>
        <Text variant="secondary">
          Escolha os roteiros e grave em sequência.
        </Text>
        {showCounts && candidates.length > 0 ? (
          <div className="inline-stack-sm pt-1">
            <Badge>
              {candidates.length === 1
                ? '1 disponível'
                : `${candidates.length} disponíveis`}
            </Badge>
            {selectedCount > 0 ? (
              <Badge variant="neutral">
                {selectedCount === 1
                  ? '1 selecionado'
                  : `${selectedCount} selecionados`}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      {candidates.length === 0 ? (
        <Surface variant="outlined" padding="lg" className="stack-md">
          <Text variant="bodyStrong">{EMPTY.dailySession.title}</Text>
          <Text variant="secondary">{EMPTY.dailySession.description}</Text>
          <div className="flex flex-wrap gap-2">
            <AppButton variant="primary" onClick={onCreateScript}>
              Criar roteiro
            </AppButton>
            <AppButton variant="secondary" onClick={onOpenQueue}>
              Abrir gravação
            </AppButton>
          </div>
        </Surface>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <AppButton
              variant="secondary"
              size="sm"
              onClick={allSelected ? onClear : onSelectAll}
            >
              {allSelected ? 'Limpar seleção' : 'Selecionar todos'}
            </AppButton>
            <AppButton
              variant="ghost"
              size="sm"
              leftIcon={<ListVideo className="h-3.5 w-3.5" />}
              onClick={onOpenQueue}
            >
              Ver fila
            </AppButton>
          </div>

          <Surface variant="outlined" padding="none" className="overflow-hidden">
            <ul className="stack-sm p-2">
              {candidates.map(content => {
                const selected = selectedIds.has(content.id);
                const serieName = resolveSerie(content);
                const status = getDisplayStatus(content);

                return (
                  <li key={content.id}>
                    <button
                      type="button"
                      onClick={() => onToggle(content.id)}
                      aria-pressed={selected}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-[var(--radius-input)] px-3 py-3 text-left',
                        'transition-colors duration-150',
                        'hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                        selected && 'bg-[var(--bg-hover)]',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border transition-colors duration-150',
                          selected
                            ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                            : 'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-transparent',
                        )}
                      >
                        <Check className="h-3 w-3 stroke-[3px]" />
                      </span>

                      <span className="min-w-0 flex-1 stack-xs">
                        <Text variant="itemTitle" className="font-semibold" truncate>
                          {content.title?.trim() || 'Sem título'}
                        </Text>
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                          {serieName ? (
                            <Text variant="meta" truncate>
                              {serieName}
                            </Text>
                          ) : null}
                          <Badge variant="status" status={status} className="h-5 px-1.5 text-2xs">
                            {status}
                          </Badge>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Surface>

          <div className="stack-sm max-w-md">
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              disabled={selectedCount === 0 || isBusy}
              leftIcon={<Video className="h-4 w-4" />}
              onClick={onStartSession}
            >
              {isBusy
                ? 'Montando…'
                : selectedCount === 0
                  ? 'Escolha roteiros para gravar'
                  : selectedCount === 1
                    ? 'Iniciar sessão · 1 roteiro'
                    : `Iniciar sessão · ${selectedCount} roteiros`}
            </AppButton>
            <AppButton
              variant="secondary"
              fullWidth
              disabled={selectedCount === 0 || isBusy}
              onClick={onBuildOnly}
            >
              Só montar bloco
            </AppButton>
          </div>
        </>
      )}
    </section>
  );
}
