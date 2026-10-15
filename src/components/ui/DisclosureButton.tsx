import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DisclosureButtonProps {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** Conteúdo à direita, antes da seta (ex.: contador). */
  trailing?: ReactNode;
  /** `id` da área que abre e fecha. */
  controls?: string;
  className?: string;
}

/**
 * Cabeçalho de seção que abre e fecha. A faixa inteira clica, a seta fica à direita e gira,
 * e o fundo muda no hover: sem isso, o título parecia texto e não botão.
 */
export function DisclosureButton({ open, onToggle, children, trailing, controls, className }: DisclosureButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className={cn(
        'flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-input)] px-2 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        className,
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      {trailing}
      <ChevronDown
        className={cn('h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform', open && 'rotate-180')}
        aria-hidden
      />
    </button>
  );
}
