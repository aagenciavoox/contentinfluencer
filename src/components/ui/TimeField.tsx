import { cn } from '../../lib/utils';

/** Hora no padrão dos campos do app. O seletor nativo acompanha o tema claro ou escuro. */
export function TimeField({
  id,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      id={id}
      type="time"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={event => onChange(event.target.value)}
      className={cn(
        'ds-input min-h-[var(--control-height-mobile)] w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-elevated)] px-3 text-[var(--text-primary)] md:min-h-[var(--control-height)]',
        '[color-scheme:light] [[data-theme=dark]_&]:[color-scheme:dark]',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60',
        className,
      )}
    />
  );
}
