import {Text} from '../../../components/ui/Text';
import {Tooltip} from '../../../components/ui/Tooltip';
import {cn} from '../../../lib/utils';
import {formatRhythmSlot, type WeekRhythmQuota} from '../../../utils/pilarRhythm';

const DEFAULT_MAX_VISIBLE = 6;

function toneRank(tone: WeekRhythmQuota['tone']): number {
  if (tone === 'deficit') return 0;
  if (tone === 'over') return 1;
  return 2;
}

function toneColor(tone: WeekRhythmQuota['tone']): string {
  if (tone === 'over') return 'var(--danger)';
  if (tone === 'deficit') return 'var(--warning)';
  return 'var(--success)';
}

function quotaDetail(item: WeekRhythmQuota): string {
  const slots = item.suggestions.map(formatRhythmSlot);
  return [`${item.label} ${item.count}/${item.target}`, item.windowTag, ...slots].filter(Boolean).join(' · ');
}

function chipClass(tone: WeekRhythmQuota['tone']): string {
  if (tone === 'over') return 'border-[var(--danger)]/40 bg-[var(--danger)]/10';
  if (tone === 'deficit') return 'border-[var(--warning)]/40 bg-[var(--warning-bg)]';
  return 'border-[var(--border-color)] bg-[var(--bg-elevated)]';
}

function QuotaRow({item, showSlot = false}: {item: WeekRhythmQuota; showSlot?: boolean}) {
  const width = item.target <= 0 ? 0 : Math.min(item.count / item.target, 1);
  const percent = Math.round(width * 100);
  const color = toneColor(item.tone);
  const slot = showSlot ? item.suggestions[0] : null;

  return (
    <Tooltip side="right" label={quotaDetail(item)} className="min-w-0 w-full">
      <div className="min-w-0 w-full">
        <div className="flex min-w-0 items-center gap-1 px-0.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{backgroundColor: item.color || color}}
            aria-hidden
          />
          <Text variant="meta" as="span" className="min-w-0 flex-1 truncate text-[var(--text-primary)]">
            {item.label}
          </Text>
          <span className="h-1 w-6 shrink-0 overflow-hidden rounded-full bg-[var(--bg-primary)]" aria-hidden>
            <span className="block h-full rounded-full" style={{width: `${percent}%`, backgroundColor: color}} />
          </span>
          <Text variant="meta" as="span" className="shrink-0 font-bold tabular-nums text-[var(--text-primary)]">
            {item.count}/{item.target}
          </Text>
        </div>
        {slot ? (
          <Text variant="meta" as="span" className="block truncate pl-3 text-[var(--text-tertiary)]">
            {formatRhythmSlot(slot)}
          </Text>
        ) : null}
      </div>
    </Tooltip>
  );
}

function byAttention(left: WeekRhythmQuota, right: WeekRhythmQuota): number {
  return toneRank(left.tone) - toneRank(right.tone) || left.label.localeCompare(right.label, 'pt-BR');
}

export function WeekRhythmRail({
  quotas,
  className,
  maxVisible = DEFAULT_MAX_VISIBLE,
}: {
  quotas: WeekRhythmQuota[];
  className?: string;
  maxVisible?: number;
}) {
  if (quotas.length === 0) {
    return (
      <Text variant="meta" className={className}>
        Sem meta nesta semana
      </Text>
    );
  }

  const pillars = quotas.filter(item => item.kind === 'pilar').sort(byAttention);
  const series = quotas.filter(item => item.kind === 'serie').sort(byAttention);
  const hiddenWithoutSlots = Math.max(0, pillars.length - maxVisible) + series.length;
  const budget = hiddenWithoutSlots > 0 ? Math.max(1, maxVisible - 1) : maxVisible;
  const visiblePillars = pillars.slice(0, budget);
  const slotLines = visiblePillars.filter(item => item.suggestions.length > 0).length;
  const showSlots = visiblePillars.length === pillars.length && slotLines > 0 && visiblePillars.length + slotLines <= budget;
  const usedLines = visiblePillars.length + (showSlots ? slotLines : 0);
  const visibleSeries = series.slice(0, Math.max(0, budget - usedLines));
  const hidden = [...pillars.slice(visiblePillars.length), ...series.slice(visibleSeries.length)];

  return (
    <div className={cn('flex min-h-0 flex-col gap-0.5', className)}>
      {visiblePillars.map(item => (
        <QuotaRow key={item.key} item={item} showSlot={showSlots} />
      ))}
      {visibleSeries.map(item => (
        <QuotaRow key={item.key} item={item} />
      ))}
      {hidden.length > 0 ? (
        <Tooltip side="right" label={hidden.map(quotaDetail).join(' · ')}>
          <Text variant="meta" as="span" className="px-1 font-semibold">
            +{hidden.length}
          </Text>
        </Tooltip>
      ) : null}
    </div>
  );
}

export function WeekRhythmChips({quotas}: {quotas: WeekRhythmQuota[]}) {
  if (quotas.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {quotas.map(item => {
        const slot = item.suggestions[0];
        return (
          <span
            key={item.key}
            className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1', chipClass(item.tone))}
          >
            <Text variant="meta" as="span" className="font-semibold text-[var(--text-primary)]">
              {item.label} {item.count}/{item.target}
              {item.windowTag ? ` ${item.windowTag}` : ''}
              {slot ? ` · ${formatRhythmSlot(slot)}` : ''}
            </Text>
          </span>
        );
      })}
    </div>
  );
}
