import type {ReactNode} from 'react';
import {cn} from '../../lib/utils';

export type CalendarEventPillVariant = 'compact' | 'expanded';

interface CalendarEventPillProps {
  label: string;
  time?: string | null;
  secondary?: string | null;
  variant?: CalendarEventPillVariant;
  className?: string;
  style?: React.CSSProperties;
  icon?: ReactNode;
  onClick?: (event: React.MouseEvent) => void;
  title?: string;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export function CalendarEventPill({
  label,
  time,
  secondary,
  variant = 'compact',
  className,
  style,
  icon,
  onClick,
  title,
  draggable,
  onDragStart,
  onDragEnd,
}: CalendarEventPillProps) {
  const displayTitle = title ?? [label, time, secondary].filter(Boolean).join(' · ');

  if (variant === 'expanded') {
    return (
      <button
        type="button"
        onClick={onClick}
        title={displayTitle}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={cn(
          'w-full rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
          className,
        )}
        style={style}
      >
        {icon ? <span className="mb-1 flex items-center gap-1">{icon}</span> : null}
        {secondary ? (
          <span className="block text-2xs font-semibold uppercase tracking-wide opacity-80">{secondary}</span>
        ) : null}
        <span className="mt-0.5 block text-sm font-semibold leading-snug text-[var(--text-primary)]">{label}</span>
        {time ? <span className="mt-1 block text-xs text-[var(--text-secondary)]">{time}</span> : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={displayTitle}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'flex w-full min-w-0 items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-left text-xs font-semibold leading-tight transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        className,
      )}
      style={style}
    >
      {time ? <span className="shrink-0 tabular-nums opacity-90">{time}</span> : null}
      <span className="truncate">{label}</span>
    </button>
  );
}
