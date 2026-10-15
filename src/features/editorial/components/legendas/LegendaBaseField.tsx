import { useEffect, useRef } from 'react';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';

/**
 * Legenda-base compartilhada. A mesma peça no roteiro, em Legendas e na série:
 * só muda o rótulo e a frase que explica o alcance.
 */
export function LegendaBaseField({
  id,
  label = 'Legenda-base compartilhada',
  descricao,
  value,
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  placeholder = 'Texto de origem usado pelas publicações deste conteúdo.',
  limite = null,
  minRows = 3,
  compact = false,
}: {
  id: string;
  label?: string;
  descricao?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  /** Menor limite entre as contas que usam a base. */
  limite?: number | null;
  minRows?: number;
  compact?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const acima = limite != null && value.length > limite;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, [value]);

  return (
    <div className="stack-xs">
      <label htmlFor={id} className="block">
        <Text variant="bodyStrong" as="span" className={cn(compact && 'text-sm')}>{label}</Text>
      </label>
      {descricao ? (
        <p id={`${id}-descricao`} className="t-meta text-[var(--text-secondary)]">
          {descricao}
        </p>
      ) : null}
      <div className="relative mt-1">
        <textarea
          id={id}
          ref={ref}
          value={value}
          disabled={disabled}
          rows={minRows}
          placeholder={placeholder}
          aria-describedby={descricao ? `${id}-descricao` : undefined}
          onChange={event => onChange(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className={cn(
            'block w-full resize-none overflow-hidden rounded-[var(--radius-input)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-primary)] px-3 pt-2.5 pb-7 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus-visible:border-solid focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60',
            compact && 'leading-5',
          )}
        />
        <span
          className={cn(
            'pointer-events-none absolute bottom-1.5 right-3 text-xs font-semibold tabular-nums',
            acima ? 'text-[var(--danger)]' : 'text-[var(--text-tertiary)]',
          )}
        >
          {limite != null ? `${value.length} / ${limite}` : value.length}
        </span>
      </div>
    </div>
  );
}
