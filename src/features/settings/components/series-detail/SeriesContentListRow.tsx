import { ChevronRight } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Text } from '../../../../components/ui/Text';
import { getDisplayTitle } from '../../../contents/lib/contentCardMeta';
import { getStatusColorVar } from '../../../../lib/statusClasses';
import {
  formatContentListTimestamp,
  seriesListItemPreviewText,
  seriesListItemTitle,
  seriesListItemWordCount,
  type SeriesListItem,
} from '../../lib/seriesContentListUtils';

interface SeriesContentListRowProps {
  item: SeriesListItem;
  onClick: () => void;
}

export function SeriesContentListRow({ item, onClick }: SeriesContentListRowProps) {
  const preview = seriesListItemPreviewText(item);
  const words = seriesListItemWordCount(item);
  const isInboxIdea = item.kind === 'inbox-idea';
  const statusLabel = isInboxIdea ? 'Caixa de ideias' : item.data.status;
  const statusColor = isInboxIdea ? 'var(--accent-blue)' : getStatusColorVar(item.data.status);
  const timestamp = isInboxIdea
    ? formatContentListTimestamp(item.data.createdAt)
    : formatContentListTimestamp(item.data.updatedAt);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <span
        className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: statusColor }}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <Text variant="itemTitle" truncate>
          {isInboxIdea ? seriesListItemTitle(item) : getDisplayTitle(item.data.title)}
        </Text>

        {preview ? (
          <Text variant="secondary" className="mt-0.5 line-clamp-1">
            {preview}
          </Text>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {words > 0 ? (
            <Text variant="meta" className="text-[var(--text-tertiary)]">
              {words} palavras
            </Text>
          ) : null}
          <Badge variant={isInboxIdea ? 'neutral' : 'status'} status={isInboxIdea ? undefined : item.data.status}>
            {statusLabel}
          </Badge>
          <Text variant="meta" className="text-[var(--text-tertiary)]">
            {timestamp}
          </Text>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
