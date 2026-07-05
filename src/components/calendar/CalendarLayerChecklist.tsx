import type {LucideIcon} from 'lucide-react';
import {Check} from 'lucide-react';
import {Text} from '../ui/Text';
import {cn} from '../../lib/utils';

export interface CalendarChecklistItem {
  id: string;
  label: string;
  color: string;
  icon?: LucideIcon;
}

interface CalendarLayerChecklistProps {
  title?: string;
  items: CalendarChecklistItem[];
  activeIds: string[];
  onToggle: (id: string) => void;
  /** When true, only one item can be active at a time (platform filter mode). */
  singleSelect?: boolean;
  className?: string;
}

export function CalendarLayerChecklist({
  title = 'Minhas camadas',
  items,
  activeIds,
  onToggle,
  singleSelect = false,
  className,
}: CalendarLayerChecklistProps) {
  return (
    <div className={cn('stack-sm', className)}>
      <Text variant="label" className="text-[var(--text-secondary)]">
        {title}
      </Text>
      <ul className="space-y-0.5">
        {items.map(item => {
          const active = activeIds.includes(item.id);
          const Icon = item.icon;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-1 py-1.5 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors',
                    active ? 'border-transparent' : 'border-[var(--border-color)] bg-transparent',
                  )}
                  style={active ? {backgroundColor: item.color} : undefined}
                  aria-hidden
                >
                  {active ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /> : null}
                </span>
                {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" /> : null}
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    active ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                  )}
                >
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {singleSelect && activeIds.length === 1 && activeIds[0] !== 'all' ? (
        <button
          type="button"
          onClick={() => onToggle('all')}
          className="text-xs font-semibold text-[var(--accent-blue)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          Mostrar todas
        </button>
      ) : null}
    </div>
  );
}
