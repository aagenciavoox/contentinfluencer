import {useMemo, useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import {summarizeRhythmProgress, type RhythmProgress, type Violation} from '../../../utils/pilarRhythm';

interface RhythmDiagnosisProps {
  violations: Violation[];
  className?: string;
}

function fillRatio(item: RhythmProgress): number {
  if (item.target <= 0) return 0;
  return Math.min(item.count / item.target, 1);
}

function RhythmMeter({item, compact = false}: {item: RhythmProgress; compact?: boolean}) {
  const width = `${Math.round(fillRatio(item) * 100)}%`;
  const over = item.tone === 'over';

  return (
    <div className={cn('flex min-w-0 items-center gap-2', compact ? 'max-w-[16rem]' : 'w-full')}>
      <Text variant="label" as="span" className={cn('min-w-0 truncate', compact ? 'max-w-[7.5rem]' : 'flex-1')}>
        {item.label}
      </Text>
      <Text variant="meta" as="span" className="shrink-0 font-bold tabular-nums text-[var(--text-primary)]">
        {item.count}/{item.target}
      </Text>
      <span
        className={cn('h-1.5 shrink-0 overflow-hidden rounded-full bg-[var(--bg-elevated)]', compact ? 'w-12' : 'w-24')}
        aria-hidden
      >
        <span
          className={cn('block h-full rounded-full', over ? 'bg-[var(--danger)]' : 'bg-[var(--warning)]')}
          style={{width}}
        />
      </span>
    </div>
  );
}

export function RhythmDiagnosis({violations, className}: RhythmDiagnosisProps) {
  const [open, setOpen] = useState(false);
  const summary = useMemo(() => summarizeRhythmProgress(violations), [violations]);

  if (violations.length === 0) return null;

  const preview = summary.progress[0] ?? null;
  const hiddenProgress = Math.max(0, summary.progress.length - (preview ? 1 : 0));

  return (
    <section className={cn('rounded-[var(--radius-card-mobile)] border border-[var(--warning)]/30 bg-[var(--warning-bg)]', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform', open && 'rotate-180')} />
        <Text variant="label" as="span" className="shrink-0 text-[var(--text-primary)]">
          Diagnóstico do ritmo
        </Text>
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          {preview ? <RhythmMeter item={preview} /> : null}
          {hiddenProgress > 0 ? (
            <Text variant="meta" as="span" className="shrink-0">
              +{hiddenProgress}
            </Text>
          ) : null}
          {!preview && summary.notes[0] ? (
            <Text variant="meta" as="span" className="truncate">
              {summary.notes[0].label}
            </Text>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-xs font-bold text-[var(--text-secondary)]">
          {violations.length}
        </span>
      </button>

      {open ? (
        <div className="stack-sm max-h-40 overflow-y-auto border-t border-[var(--warning)]/25 px-3 py-2.5">
          {summary.progress.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {summary.progress.map(item => (
                <RhythmMeter key={item.key} item={item} />
              ))}
            </div>
          ) : null}
          {summary.notes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {summary.notes.map(note => (
                <span
                  key={note.key}
                  className="inline-flex min-h-6 items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2 text-2xs font-semibold text-[var(--text-secondary)]"
                >
                  {note.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
