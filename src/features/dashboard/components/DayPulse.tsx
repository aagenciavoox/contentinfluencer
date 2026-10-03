import { Link } from 'react-router-dom';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import type { DayPulseSegment } from '../lib/dayPulse';

export function DayPulse({
  segments,
  tone = 'default',
}: {
  segments: DayPulseSegment[];
  tone?: 'default' | 'onAccent';
}) {
  const toneClass = tone === 'onAccent' ? '!text-[var(--brand-on-accent)]' : undefined;
  const focusClass = tone === 'onAccent'
    ? 'focus-visible:shadow-[var(--focus-ring-brand)]'
    : 'focus-visible:shadow-[var(--focus-ring)]';

  return (
    <Text variant="secondary" className={toneClass}>
      {segments.map((segment, index) => (
        <span key={`${segment.label}-${index}`}>
          {index > 0 ? ' · ' : null}
          {segment.to ? (
            <Link
              to={segment.to}
              className={cn('rounded-sm underline-offset-2 hover:underline focus-visible:outline-none', focusClass, toneClass)}
            >
              {segment.label}
            </Link>
          ) : (
            segment.label
          )}
        </span>
      ))}
    </Text>
  );
}
