import {CalendarCheck, Circle, Clapperboard, FileText, Send} from 'lucide-react';
import {Text} from '../../../../../components/ui/Text';
import type {Content} from '../../../../../lib/database';
import {CONTENT_STATUS, getDisplayStatus, normalizeContentStatus} from '../../../lib/contentPipeline';
import {cn} from '../../../../../lib/utils';

interface HistorySectionProps {
  content: Content;
  compact?: boolean;
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString('pt-BR');
}

const STATUS_RANK: Record<string, number> = {
  [CONTENT_STATUS.IDEIA]: 0,
  [CONTENT_STATUS.ROTEIRO]: 1,
  [CONTENT_STATUS.PRODUCAO]: 2,
  [CONTENT_STATUS.POSTADO]: 3,
};

function statusRank(status: string) {
  return STATUS_RANK[normalizeContentStatus(status)] ?? 1;
}

export function HistorySection({content, compact = false}: HistorySectionProps) {
  const rank = statusRank(content.status);
  const displayStatus = getDisplayStatus(content);
  const isScheduled = displayStatus === 'Programado';

  const milestones = [
    {
      id: 'created',
      label: 'Criado',
      date: formatDateTime(content.createdAt),
      reached: true,
      icon: <Circle className="h-3.5 w-3.5" />,
    },
    {
      id: 'script',
      label: 'Roteiro',
      date: formatDateTime(content.createdAt),
      reached: rank >= 1,
      icon: <FileText className="h-3.5 w-3.5" />,
    },
    {
      id: 'production',
      label: 'Produção',
      date: rank >= 2 ? formatDateTime(content.updatedAt) : null,
      reached: rank >= 2,
      icon: <Clapperboard className="h-3.5 w-3.5" />,
    },
    {
      id: 'recorded',
      label: 'Gravado',
      date: formatDateTime(content.recordedAt ?? null),
      reached: Boolean(content.recordedAt),
      icon: <Clapperboard className="h-3.5 w-3.5" />,
    },
    {
      id: 'scheduled',
      label: 'Programado',
      date: isScheduled ? formatDateTime(content.publishDate) : null,
      reached: isScheduled,
      icon: <CalendarCheck className="h-3.5 w-3.5" />,
    },
    {
      id: 'posted',
      label: 'Postado',
      date: formatDateTime(content.postedAt ?? null),
      reached: rank >= 3,
      icon: <Send className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <section
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)]',
        compact ? 'p-4' : 'p-6',
      )}
    >
      <Text variant="sectionTitle" className="mb-4">
        Historico
      </Text>
      <ol className="stack-md">
        {milestones.map(milestone => (
          <li
            key={milestone.id}
            className={cn(
              'flex items-start gap-3 text-sm',
              milestone.reached ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                milestone.reached
                  ? 'border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-hover)]',
              )}
            >
              {milestone.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{milestone.label}</p>
              {milestone.date ? (
                <p className="text-xs text-[var(--text-tertiary)]">{milestone.date}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
