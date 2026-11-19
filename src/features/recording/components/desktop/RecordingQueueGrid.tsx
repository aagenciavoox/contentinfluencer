import {energiaDaSerie} from '../../../editorial/lib/herancaSerie';
import {redesDoItemDeCriacao} from '../../../creation/lib/creationRedeFilter';
import {BookOpenText, Check, Clapperboard, ExternalLink, Zap} from 'lucide-react';
import { CountBadge } from '../../../../components/ui/CountBadge';
import {Text} from '../../../../components/ui/Text';
import {AppButton} from '../../../../components/ui/AppButton';
import {PlatformIcons} from '../../../../components/ui/PlatformIcons';
import type {Content} from '../../../../lib/database';
import {useAppContext} from '../../../../context/AppContext';
import {EMPTY} from '../../../../lib/uiCopy';
import {cn} from '../../../../lib/utils';
import {ContentEntityTags} from '../../../contents/components/ContentEntityTags';
import {
  getDisplayTitle,
  getScriptWordCount,
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
      <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 py-16 text-center">
        <Clapperboard className="mx-auto mb-4 h-10 w-10 text-[var(--text-tertiary)]" />
        <Text variant="itemTitle" as="p" className="text-[var(--text-primary)]">{EMPTY.roteirosSemBloco.title}</Text>
        <Text variant="secondary" as="p" className="mx-auto mt-2 max-w-sm text-[var(--text-secondary)]">
          {EMPTY.roteirosSemBloco.description}
        </Text>
      </div>
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
          const {pillar, series} = resolveContentEntities(content, state.pilares, state.series);
          // Sem energia no conteúdo, vale a da série (ou da série acima).
          const energia = energiaDaSerie(content, state.series);
          const wordCount = getScriptWordCount(content);
          const bodyStatus = resolveScriptBodyStatus(content, {
            hydrating: isHydrating(content.id),
            error: hasHydrationError(content.id),
          });
          const statusLabel = scriptBodyStatusLabel(bodyStatus, wordCount);
          const recordingTags = normalizeRecordingTags(content.tags || []);
          const redes = redesDoItemDeCriacao(content, state.platforms);

          return (
            <article
              key={content.id}
              className={cn(
                'ds-card ds-card-interactive group relative flex flex-col gap-2 p-3 text-left',
                isSelected && 'border-[var(--text-primary)] bg-[var(--bg-hover)]'
              )}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => onToggleSelect(content.id)}
                  className={cn(
                    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-input)] border transition-colors',
                    isSelected
                      ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
                  )}
                  aria-label={isSelected ? 'Remover da seleção' : 'Selecionar para bloco'}
                >
                  {isSelected ? <Check className="h-3 w-3 stroke-[3px]" /> : null}
                </button>

                <button
                  type="button"
                  onClick={() => onToggleSelect(content.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <Text variant="itemTitle" className="line-clamp-2 leading-snug">
                    {getDisplayTitle(content.title)}
                  </Text>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <AppButton
                    variant="ghost"
                    size="xs"
                    iconOnly
                    leftIcon={<BookOpenText className="h-3.5 w-3.5" />}
                    onClick={() => onRead(content.id)}
                    className="h-6 w-6 min-h-0 min-w-0 border-[var(--border-color)] p-0 opacity-70 group-hover:opacity-100"
                    aria-label="Abrir modo leitura"
                  />
                  <button
                    type="button"
                    onClick={() => onOpen(content.id)}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] text-[var(--text-tertiary)] transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    aria-label="Abrir detalhes do roteiro"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleSelect(content.id)}
                className="flex min-w-0 flex-col gap-2 text-left"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <PlatformIcons redes={redes} max={4} />
                  <ContentEntityTags
                    pillar={pillar}
                    series={series}
                    pillarId={content.pilarId}
                    seriesId={content.seriesId}
                    size="sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {energia ? (
                    <Text variant="label" as="span" className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-hover)] px-2 py-0.5 capitalize text-[var(--text-secondary)]">
                      <Zap className="h-3 w-3" />
                      {energia}
                    </Text>
                  ) : null}
                  {bodyStatus === 'ready' && wordCount > 0 ? (
                    <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
                      {wordCount === 1 ? '1 palavra' : `${wordCount} palavras`}
                    </Text>
                  ) : bodyStatus !== 'ready' ? (
                    <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">{statusLabel}</Text>
                  ) : null}
                  {recordingTags.slice(0, 2).map(tag => (
                    <Text variant="label" as="span"
                      key={`${content.id}-${tag}`}
                      className="rounded-full px-2 py-0.5 text-inherit"
                      style={recordingTagChipStyle}
                    >
                      {tag}
                    </Text>
                  ))}
                </div>
              </button>
              {bodyStatus === 'error' && onRetryHydration ? (
                <button
                  type="button"
                  className="self-start rounded-[var(--radius-sm)] t-label text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  onClick={() => onRetryHydration(content.id)}
                >
                  Tentar novamente
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
