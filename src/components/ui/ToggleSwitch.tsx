import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ToggleSwitchProps {
  enabled: boolean;
  onToggle: () => void;
  /** Nome lido pelo leitor de tela quando não há texto visível ligado por `id`. */
  label: string;
  /** Permite que um `<label htmlFor>` ao lado ligue e desligue a chave. */
  id?: string;
  size?: 'sm' | 'md';
  /** `brand`: ligada em rosa da marca. Só onde a tela segue a referência rosa (configurações do teleprompter). */
  tone?: 'default' | 'brand';
  disabled?: boolean;
  className?: string;
}

const TRACK = {
  sm: 'h-5 w-9',
  md: 'h-7 w-12',
} as const;

const KNOB = {
  sm: { size: 'h-3.5 w-3.5 top-[2px]', on: 'left-[18px]', off: 'left-[2px]' },
  md: { size: 'h-[18px] w-[18px] top-[3px]', on: 'left-[23px]', off: 'left-[3px]' },
} as const;

/** A chave de liga e desliga do app. Uma só, em todas as telas. */
export function ToggleSwitch({
  enabled,
  onToggle,
  label,
  id,
  size = 'md',
  tone = 'default',
  disabled = false,
  className,
}: ToggleSwitchProps) {
  const knob = KNOB[size];
  const onTrack =
    tone === 'brand'
      ? 'border-[var(--brand-accent-strong)] bg-[var(--brand-accent-strong)] group-hover/switch:opacity-90'
      : 'border-[var(--text-primary)] bg-[var(--text-primary)] group-hover/switch:opacity-85';
  const onKnob = tone === 'brand' ? 'bg-[var(--brand-on-accent)]' : 'bg-[var(--bg-elevated)]';
  return (
    <button
      id={id}
      type="button"
      role="switch"
      onClick={onToggle}
      aria-label={label}
      aria-checked={enabled}
      disabled={disabled}
      className={cn(
        'group/switch relative flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-45',
        className
      )}
    >
      {/* Desligada com contorno e bolinha em cinza escuro: o trilho claro sobre o card claro
          ficava quase invisível (abaixo de 3:1). No hover o contorno escurece. */}
      <span
        className={cn(
          'relative rounded-full border-[1.5px] transition-colors',
          TRACK[size],
          enabled
            ? onTrack
            : 'border-[var(--text-tertiary)] bg-transparent group-hover/switch:border-[var(--text-primary)]'
        )}
      >
        <span
          className={cn(
            'absolute rounded-full transition-all',
            knob.size,
            enabled ? `${knob.on} ${onKnob}` : `${knob.off} bg-[var(--text-tertiary)] group-hover/switch:bg-[var(--text-primary)]`
          )}
        />
      </span>
    </button>
  );
}

interface ToggleRowProps {
  id: string;
  enabled: boolean;
  onToggle: () => void;
  /** Nome da opção. Também é o nome lido da chave. */
  title: string;
  /** Texto e ícones à esquerda da chave. Tudo nele liga e desliga. */
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md';
  tone?: 'default' | 'brand';
}

/**
 * Linha de opção com chave: clicar em qualquer ponto da linha liga e desliga.
 * A linha inteira é o `<label>` da chave, então o clique no texto chega nela.
 */
export function ToggleRow({ id, enabled, onToggle, title, children, className, size, tone }: ToggleRowProps) {
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-center justify-between gap-3', className)}>
      <span className="min-w-0 flex-1">{children}</span>
      <ToggleSwitch id={id} enabled={enabled} onToggle={onToggle} label={title} size={size} tone={tone} />
    </label>
  );
}
