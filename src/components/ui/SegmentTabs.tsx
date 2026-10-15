import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface SegmentTabOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  /** Ícone à esquerda do rótulo (ex.: Grade, Lista, Kanban). */
  icon?: ReactNode;
}

interface SegmentTabsProps<T extends string = string> {
  options: SegmentTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Nome do grupo para leitor de tela (ex.: "Vista do calendário"). */
  ariaLabel?: string;
}

/**
 * O único seletor de vista e aba do app: Criação, Editorial, Calendário, Biblioteca, Pilar.
 * Setas, Home e End trocam a aba, como numa lista de abas.
 */
export function SegmentTabs<T extends string = string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: SegmentTabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = options.findIndex(option => option.id === value);
    let next = -1;
    if (event.key === 'ArrowRight') next = (current + 1) % options.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    if (next < 0 || next === current) return;
    event.preventDefault();
    onChange(options[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className={cn('segment-tabs', className)} role="tablist" aria-label={ariaLabel} onKeyDown={handleKeyDown}>
      {options.map((option, index) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            ref={element => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.id)}
            className={cn(
              'segment-tabs-item inline-flex items-center gap-1.5',
              active && 'segment-tabs-item-active',
            )}
          >
            {option.icon ? (
              <span className={cn('flex shrink-0', active && 'text-[var(--bg-primary)]')} aria-hidden>
                {option.icon}
              </span>
            ) : null}
            {/* Na aba ativa a cor fica no texto: o `:hover` de `.segment-tabs-item` trocava
                para --text-primary sobre o fundo --text-primary e o rótulo (com o contador) sumia. */}
            <span
              className={cn('text-xs font-semibold', active && 'text-[var(--bg-primary)]')}
            >
              {option.label}
            </span>
            {typeof option.count === 'number' ? (
              // `leading-none` mantém a aba com contador na mesma altura das outras.
              <span
                className={cn(
                  'rounded-[var(--radius-sm)] px-1.5 py-0.5 t-meta leading-none tabular-nums',
                  active
                    ? 'bg-[color-mix(in_srgb,var(--bg-primary)_22%,transparent)] !text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]',
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
