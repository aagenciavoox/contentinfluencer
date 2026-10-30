import { Text } from './Text';
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useScrollEdgeFade } from '../../hooks/useScrollEdgeFade';
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
  /**
   * Em telas estreitas as abas inativas mostram só o ícone; a aba ativa mantém o rótulo,
   * para a pessoa saber onde está. O rótulo continua para leitor de tela. Exige `icon` em cada opção.
   */
  iconOnlyOnMobile?: boolean;
  /**
   * iOS + contenteditable: o primeiro toque só tira o foco do editor e o clique se perde.
   * Com isto a aba troca no pointerdown (usado ao lado do editor de roteiro).
   */
  activateOnPointerDown?: boolean;
  /** Trilho de largura toda com abas em partes iguais (também no celular). */
  fullWidth?: boolean;
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
  iconOnlyOnMobile = false,
  activateOnPointerDown = false,
  fullWidth = false,
}: SegmentTabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const edgeFade = useScrollEdgeFade<HTMLDivElement>();
  const { update: updateEdgeFade } = edgeFade;

  useEffect(() => {
    updateEdgeFade();
  }, [options, value, updateEdgeFade]);

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
    <div
      ref={edgeFade.ref}
      className={cn('segment-tabs', fullWidth ? 'segment-tabs--full' : 'scroll-edge-fade', className)}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
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
            onClick={activateOnPointerDown ? undefined : () => onChange(option.id)}
            onPointerDown={
              activateOnPointerDown
                ? event => {
                    event.preventDefault();
                    onChange(option.id);
                  }
                : undefined
            }
            onKeyUp={
              activateOnPointerDown
                ? event => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onChange(option.id);
                  }
                : undefined
            }
            title={iconOnlyOnMobile ? option.label : undefined}
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
            <Text variant="label" as="span"
              className={cn(
                '',
                fullWidth && 'truncate',
                active && 'text-[var(--bg-primary)]',
                iconOnlyOnMobile && option.icon && !active && 'sr-only sm:not-sr-only',
              )}
            >
              {option.label}
            </Text>
            {typeof option.count === 'number' ? (
              // `leading-none` mantém a aba com contador na mesma altura das outras.
              <Text variant="meta" as="span"
                className={cn(
                  'rounded-[var(--radius-sm)] px-1.5 py-0.5 leading-none tabular-nums',
                  active
                    ? 'bg-[color-mix(in_srgb,var(--bg-primary)_22%,transparent)] !text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]',
                )}
              >
                {option.count}
              </Text>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
