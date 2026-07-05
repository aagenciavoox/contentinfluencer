import {useState} from 'react';
import {Check, Eye, Flag, MessageSquare, MoreHorizontal, Sparkles} from 'lucide-react';
import {Text} from '../../../../components/ui/Text';
import type {Content, Pilar, Platform, Serie} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
import {ContentEntityTags} from '../ContentEntityTags';
import {
  formatLastEdit,
  getDisplayTitle,
  getScriptWordCount,
  isDraftTitle,
  isRecentlyCreated,
} from '../../lib/contentCardMeta';
import {getDisplayStatus} from '../../lib/contentPipeline';

interface PipelineContentCardProps {
  content: Content;
  pillar: Pilar | null;
  series: Serie | null;
  platforms: Platform[];
  isSelected: boolean;
  selectionMode?: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onToggleSelect: () => void;
}

function resolvePrimaryPlatformName(content: Content, platforms: Platform[]): string | null {
  const first = content.plataformas[0];
  if (!first) return null;
  return platforms.find(platform => platform.id === first.platformId)?.nome ?? first.platformId;
}

export function PipelineContentCard({
  content,
  pillar,
  series,
  platforms,
  isSelected,
  selectionMode = false,
  onSelect,
  onPreview,
  onToggleSelect,
}: PipelineContentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isDraft = isDraftTitle(content.title);
  const isNew = isRecentlyCreated(content);
  const platformName = resolvePrimaryPlatformName(content, platforms);
  const displayStatus = getDisplayStatus(content);
  const notesCount = (content.scriptNotes || []).length;
  const wordCount = getScriptWordCount(content);

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2.5 text-left shadow-[var(--shadow-card)] transition-colors hover:border-[var(--border-strong)]',
        isSelected && selectionMode && 'border-[var(--text-primary)] ring-1 ring-[var(--text-primary)]/20',
      )}
    >
      <div className={cn('relative', selectionMode ? 'pl-7' : 'pr-7')}>
        {selectionMode ? (
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onToggleSelect();
            }}
            className={cn(
              'absolute left-0 top-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              isSelected
                ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : 'border-[var(--border-color)] hover:border-[var(--border-strong)]',
            )}
            aria-label={isSelected ? 'Desmarcar roteiro' : 'Selecionar roteiro'}
          >
            {isSelected ? <Check className="h-3 w-3 stroke-[3px]" /> : null}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (selectionMode) {
              onToggleSelect();
              return;
            }
            onSelect();
          }}
          className="flex w-full min-w-0 flex-col text-left"
        >
          <div className="flex items-start gap-1">
            {(isNew || isDraft) ? (
              <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5">
                {isNew ? (
                  <Sparkles className="h-3 w-3 text-[var(--accent-blue)]" aria-label="Novo" />
                ) : null}
                {isDraft ? (
                  <Flag className="h-3 w-3 text-[var(--accent-orange)]" aria-label="Rascunho" />
                ) : null}
              </span>
            ) : null}
            <Text
              variant="itemTitle"
              className={cn(
                'line-clamp-3 break-words text-sm font-semibold leading-snug',
                isDraft && 'italic text-[var(--text-secondary)]',
              )}
            >
              {getDisplayTitle(content.title)}
            </Text>
          </div>

          {series ? (
            <ContentEntityTags series={series} seriesId={content.seriesId} className="mt-1.5" size="sm" />
          ) : pillar ? (
            <ContentEntityTags pillar={pillar} pillarId={content.pilarId} className="mt-1.5" size="sm" />
          ) : null}

          <Text variant="meta" as="p" className="mt-1 leading-tight">
            {[displayStatus, platformName].filter(Boolean).join(' · ')}
          </Text>
        </button>

        {!selectionMode ? (
        <div className="absolute right-0 top-0">
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              setMenuOpen(open => !open);
            }}
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-opacity hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              menuOpen || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
            aria-label="Ações do roteiro"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Fechar menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-0.5 min-w-[132px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-dropdown)]">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  onClick={event => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onPreview();
                  }}
                >
                  <Eye className="h-3 w-3" />
                  Pré-visualizar
                </button>
              </div>
            </>
          ) : null}
        </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--border-color)] pt-1.5">
        <Text variant="label" className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-none">
          <span>{formatLastEdit(content.updatedAt)}</span>
          {wordCount > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{wordCount} palavras</span>
            </>
          ) : null}
        </Text>
        {notesCount > 0 ? (
          <Text variant="label" className="inline-flex shrink-0 items-center gap-0.5 tabular-nums leading-none">
            <MessageSquare className="h-3 w-3" />
            {notesCount}
          </Text>
        ) : null}
      </div>
    </article>
  );
}
