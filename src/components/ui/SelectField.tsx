import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SelectMenu } from './SelectMenu';

export interface SelectFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Escolha única que não fica vazia (etapa, conta de referência, conta dos horários).
 * Botão numa moldura de controle, com ícone e prefixo opcionais ("Etapa: Roteiro"), que abre a
 * lista do design system (`SelectMenu`): flutuante com mouse, folha de baixo no toque.
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
  const current = options.find(option => option.value === value);
  return (
    <SelectMenu
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel={ariaLabel}
      describedBy={describedBy}
      disabled={disabled}
      triggerClassName={cn(
        'relative items-center gap-2 rounded-[var(--radius-input)] border pl-3 pr-9 transition-colors focus-visible:shadow-[var(--focus-ring)] aria-expanded:shadow-[var(--focus-ring)]',
        'min-h-[var(--control-height-mobile)] md:min-h-[var(--control-height)]',
        block ? 'flex w-full' : 'inline-flex max-w-full',
        selected
          ? 'border-[var(--text-primary)] bg-[var(--bg-hover)]'
          : 'border-[var(--border-input)] bg-[var(--bg-elevated)] hover:border-[var(--text-tertiary)]',
        disabled && 'opacity-60',
        className,
      )}
    >
      {leadingIcon ? <span className="flex shrink-0" aria-hidden>{leadingIcon}</span> : null}
      {prefix ? <span className="shrink-0 t-body text-[var(--text-secondary)]" aria-hidden>{prefix}</span> : null}
      <span
        className={cn(
          'truncate t-body text-[var(--text-primary)]',
          prefix && 'font-semibold',
          block ? 'min-w-0 flex-1' : 'min-w-0',
        )}
      >
        {current?.label ?? value}
      </span>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[var(--text-secondary)]" aria-hidden />
    </SelectMenu>
  );
}
