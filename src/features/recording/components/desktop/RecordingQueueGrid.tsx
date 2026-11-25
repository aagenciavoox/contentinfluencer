import {redesDoItemDeCriacao} from '../../../creation/lib/creationRedeFilter';
import {BookOpenText, Check, Clapperboard, ExternalLink} from 'lucide-react';
import {CountBadge} from '../../../../components/ui/CountBadge';
import {Surface} from '../../../../components/ui/Surface';
import {Text} from '../../../../components/ui/Text';
import {AppButton} from '../../../../components/ui/AppButton';
import {EmptyState} from '../../../../components/ui/EmptyState';
import {PlatformIcons} from '../../../../components/ui/PlatformIcons';
import type {Content} from '../../../../lib/database';
import {useAppContext} from '../../../../context/AppContext';
import {EMPTY} from '../../../../lib/uiCopy';
import {cn} from '../../../../lib/utils';
import {ContentEntityTags} from '../../../contents/components/ContentEntityTags';
import {
  getDisplayTitle,
  resolveContentEntities,
} from '../../../contents/lib/contentCardMeta';
import {normalizeRecordingTags, recordingTagChipStyle} from '../../lib/recordingWorkflow';
import {
  resolveScriptBodyStatus,
  scriptBodyStatusLabel,
} from '../../../contents/lib/contentBody';

interface RecordingQueueGridProps {
  contents: Content[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onOpen: (id: string) => void;
  onRead: (id: string) => void;
  isHydrating?: (id: string) => boolean;
  hasHydrationError?: (id: string) => boolean;
  onRetryHydration?: (id: string) => void;
}

export function RecordingQueueGrid({
  contents,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onOpen,
  onRead,
  isHydrating = () => false,
  hasHydrationError = () => false,
  onRetryHydration,
}: RecordingQueueGridProps) {
  const {state} = useAppContext();
  const allSelected = contents.length > 0 && contents.every(content => selectedIds.has(content.id));
  const someSelected = contents.some(content => selectedIds.has(content.id));

  if (contents.length === 0) {
    return (
      <EmptyState
        icon={<Clapperboard className="h-10 w-10" />}
        title={EMPTY.roteirosSemBloco.title}
        description={EMPTY.roteirosSemBloco.description}
      />
    );
  }

  return (
    <div className="stack-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSelectAll}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1.5 t-label text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          <span
            className={cn(
              'inline-flex h-4 w-4 items-center justify-center rounded-[var(--radius-input)] border transition-colors',
              allSelected
                ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : someSelected
                  ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/15'
                  : 'border-[var(--border-color)]'
            )}
          >
            {allSelected ? <Check className="h-2.5 w-2.5 stroke-[3px]" /> : null}
            {someSelected && !allSelected ? (
              <span className="h-0.5 w-2 rounded-full bg-[var(--text-primary)]" />
            ) : null}
          </span>
          {allSelected ? 'Desmarcar página' : 'Selecionar página'}
        </button>

        {selectedIds.size > 0 ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="t-label text-[var(--text-tertiary)] underline-offset-2 hover:text-[var(--text-secondary)] hover:underline"
          >
            Limpar seleção <CountBadge count={selectedIds.size} />
          </button>
        ) : (
          <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">Selecione roteiros para criar um bloco</Text>
        )}
      </div>

      <div className="grid-content recording-queue-grid">
        {contents.map(content => {
          const isSelected = selectedIds.has(content.id);
          const displayTitle = getDisplayTitle(content.title);
          const {pillar, series} = resolveContentEntities(content, state.pilares, state.series);
          const accentColor = series?.cor || pillar?.cor || undefined;
          const bodyStatus = resolveScriptBodyStatus(content, {
            hydrating: isHydrating(content.id),
            error: hasHydrationError(content.id),
          });
          const visibleTags = normalizeRecordingTags(content.tags || [])
            .filter(tag => tag.toLowerCase() !== 'gravar')
            .slice(0, 2);
          const redes = redesDoItemDeCriacao(content, state.platforms);
          const hasEntityTags = Boolean(pillar || series || content.pilarId || content.seriesId);
          const hasFooter = hasEntityTags || visibleTags.length > 0 || bodyStatus === 'error';

          return (
            <Surface
              key={content.id}
              as="article"
              variant="interactive"
              padding="none"
              style={{borderTopColor: accentColor}}
              className={cn(
                'recording-queue-card group relative flex flex-col text-left transition-[border-color,box-shadow,background-color,transform] duration-200',
                isSelected && 'recording-queue-card--selected'
              )}
            >
              <button
                type="button"
                onClick={() => onToggleSelect(content.id)}
                aria-pressed={isSelected}
                aria-label={`${isSelected ? 'Remover da seleção' : 'Selecionar para bloco'}: ${displayTitle}`}
                className="absolute inset-0 z-0 rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              />

              <div className="pointer-events-none relative z-[1] flex min-h-0 flex-1 flex-col">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-input)] border transition-colors',
                        isSelected
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                          : 'border-[var(--border-strong)] bg-[var(--bg-primary)] group-hover:border-[var(--text-secondary)]'
                      )}
                    >
                      {isSelected ? <Check className="h-2.5 w-2.5 stroke-[3px]" /> : null}
                    </span>
                    <PlatformIcons redes={redes} max={4} />
                  </div>

                  <div className="recording-queue-card__actions pointer-events-auto flex shrink-0 items-center gap-0.5">
                    <AppButton
                      variant="ghost"
                      size="xs"
                      iconOnly
                      leftIcon={<BookOpenText className="h-3.5 w-3.5" />}
                      onClick={() => onRead(content.id)}
                      className="h-6 w-6 min-h-0 min-w-0 border-0 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      aria-label="Abrir modo leitura"
                      title="Abrir modo leitura"
                    />
                    <AppButton
                      variant="ghost"
                      size="xs"
                      iconOnly
                      leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                      onClick={() => onOpen(content.id)}
                      className="h-6 w-6 min-h-0 min-w-0 border-0 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      aria-label="Abrir detalhes do roteiro"
                      title="Abrir detalhes do roteiro"
                    />
                  </div>
                </div>

                <Text
                  as="h3"
                  variant="itemTitle"
                  className="recording-queue-card__title mt-2 line-clamp-3"
                  title={displayTitle}
                >
                  {displayTitle}
                </Text>

                {hasFooter ? (
                  <div className="mt-auto flex flex-col gap-1.5 pt-3">
                    {hasEntityTags || visibleTags.length > 0 ? (
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <ContentEntityTags
                          pillar={pillar}
                          series={series}
                          pillarId={content.pilarId}
                          seriesId={content.seriesId}
                          size="sm"
                        />
                        {visibleTags.map(tag => (
                          <Text
                            variant="label"
                            as="span"
                            key={`${content.id}-${tag}`}
                            className="rounded-full px-2 py-0.5 text-inherit"
                            style={recordingTagChipStyle}
                          >
                            {tag}
                          </Text>
                        ))}
                      </div>
                    ) : null}

                    {bodyStatus === 'error' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
                          {scriptBodyStatusLabel(bodyStatus)}
                        </Text>
                        {onRetryHydration ? (
                          <button
                            type="button"
                            className="pointer-events-auto self-start rounded-[var(--radius-sm)] t-label text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                            onClick={() => onRetryHydration(content.id)}
                          >
                            Tentar novamente
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Surface>
          );
        })}
      </div>
    </div>
  );
}
