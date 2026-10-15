import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Escolha única que não fica vazia (etapa, conta de referência, conta dos horários).
 * Select nativo numa moldura de controle, com ícone e prefixo opcionais ("Etapa: Roteiro").
 * Para valores que podem ficar vazios ou ser vários, use `TagSelect`.
 */
export function SelectField({
  id,
  value,
  onChange,
  options,
  ariaLabel,
  prefix,
  leadingIcon,
  disabled = false,
  block = false,
  selected = false,
  className,
  describedBy,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectFieldOption[];
  /** Nome para o leitor de tela quando não há `<label htmlFor>` visível. */
  ariaLabel?: string;
  /** Texto antes do valor, dentro da moldura (ex.: "Etapa:"). */
  prefix?: string;
  leadingIcon?: ReactNode;
  disabled?: boolean;
  /** Ocupa a largura toda; sem isso, a moldura acompanha o valor. */
  block?: boolean;
  /** Moldura de item escolhido, como nos grupos de escolha. */
  selected?: boolean;
  className?: string;
  describedBy?: string;
}) {
  return (
    <span
      className={cn(
        'relative items-center gap-2 rounded-[var(--radius-input)] border pl-3 pr-9 transition-colors focus-within:shadow-[var(--focus-ring)]',
        'min-h-[var(--control-height-mobile)] md:min-h-[var(--control-height)]',
        block ? 'flex w-full' : 'inline-flex',
        selected
          ? 'border-[var(--text-primary)] bg-[var(--bg-hover)]'
          : 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]',
        disabled && 'opacity-60',
        className,
      )}
    >
      {leadingIcon ? <span className="flex shrink-0" aria-hidden>{leadingIcon}</span> : null}
      {prefix ? <span className="shrink-0 t-body text-[var(--text-secondary)]" aria-hidden>{prefix}</span> : null}
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        onChange={event => onChange(event.target.value)}
        className={cn(
          '!h-auto !min-h-0 appearance-none !rounded-none !border-0 !bg-transparent !p-0 !shadow-none t-body text-[var(--text-primary)] outline-none disabled:cursor-not-allowed',
          prefix && 'font-semibold',
          block ? 'min-w-0 flex-1' : '[field-sizing:content]',
        )}
      >
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[var(--text-secondary)]" aria-hidden />
    </span>
  );
}
