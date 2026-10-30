import { CSSProperties, ReactNode, useId } from 'react';
import { type LucideIcon, Minus, Plus, X } from 'lucide-react';
import { Text } from '../../../../components/ui/Text';
import { ToggleRow } from '../../../../components/ui/ToggleSwitch';
import { cn } from '../../../../lib/utils';

// Peças das configurações do modo gravação, usadas pelo modal do desktop (TeleprompterSettingsDialog)
// e pela folha do celular (BurstModeMobileScreen). Abaixo de md os botões ficam com 44 px para o toque.

export type ChoiceOption<T extends string> = { value: T; label: string };

const FOCUS_RING = 'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

export function formatDecimal(value: number) {
  return value.toFixed(1).replace('.', ',');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const ROW_LABEL = 't-body text-[var(--text-primary)] @[30rem]:min-w-[12rem] @[30rem]:shrink-0';

const CHOICE_ACTIVE =
  'border-[var(--brand-accent-strong)] bg-[var(--brand-accent-soft)] text-[color-mix(in_srgb,var(--brand-accent-strong),black_15%)] dark:text-[color-mix(in_srgb,var(--brand-accent),white_20%)]';
const CHOICE_IDLE =
  'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]';

/** Botão de opção: ativo com borda e fundo rosa da marca. */
export function choiceButtonClass(active: boolean) {
  return cn(
    'inline-flex h-11 min-w-0 items-center justify-center rounded-[var(--radius-input)] border px-2 t-body-strong transition-colors md:h-10',
    FOCUS_RING,
    active ? CHOICE_ACTIVE : CHOICE_IDLE
  );
}

function SettingsHeaderButton({
  onClick,
  className,
  children,
}: {
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 t-body-strong text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] md:h-10 md:px-4',
        FOCUS_RING,
        className
      )}
    >
      {children}
    </button>
  );
}

/** "Modo gravação / Configurações" com Restaurar padrões, Fechar (só no desktop) e X. */
export function SettingsHeader({ onReset, onClose }: { onReset: () => void; onClose: () => void }) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] px-5 pb-4 pt-1 md:px-8 md:py-5">
      <div className="min-w-0">
        <Text variant="secondary" as="p" className="text-[var(--text-tertiary)]">Modo gravação</Text>
        <Text variant="sectionTitle" as="h2" className="mt-1">Configurações</Text>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-4">
        <SettingsHeaderButton onClick={onReset}>
          Restaurar<span className="hidden sm:inline">&nbsp;padrões</span>
        </SettingsHeaderButton>
        <span aria-hidden className="hidden h-8 w-px bg-[var(--border-color)] md:block" />
        <SettingsHeaderButton onClick={onClose} className="hidden md:inline-flex">
          Fechar
        </SettingsHeaderButton>
        <button
          type="button"
          aria-label="Fechar configurações"
          onClick={onClose}
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] md:h-10 md:w-10',
            FOCUS_RING
          )}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

// @container: as linhas ficam lado a lado só quando o card tem largura para isso (desktop),
// e empilham rótulo e controle no celular ou com o modal estreito.
export function SettingsCard({
  icon: Icon,
  title,
  badge,
  subtle = false,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  badge?: string;
  subtle?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        '@container rounded-[var(--radius-card)] border border-[var(--border-color)] p-5 md:p-6',
        subtle ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-elevated)]',
        className
      )}
    >
      <div className="mb-4 flex items-center gap-3 md:mb-5">
        <Icon aria-hidden className="h-6 w-6 shrink-0" strokeWidth={1.75} />
        <h3 id={titleId}>
          <Text variant="itemTitle" as="span" className="leading-tight">{title}</Text>
        </h3>
        {badge && (
          <Text variant="meta" as="span" className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[var(--text-tertiary)]">
            {badge}
          </Text>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function CardDivider() {
  return <hr className="border-[var(--border-color)]" />;
}

export function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
      <Text variant="body" as="span">{label}</Text>
      {children}
    </div>
  );
}

export function FontSizeStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const buttonClass = cn(
    'inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:hover:bg-[var(--bg-elevated)] md:h-10 md:w-10',
    FOCUS_RING
  );

  return (
    <div role="group" aria-label="Tamanho da fonte" className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Diminuir fonte"
        disabled={value <= min}
        onClick={() => onChange(value - 2)}
        className={buttonClass}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span aria-live="polite" className="min-w-[4.5rem] text-center tabular-nums">
        <Text variant="bodyStrong" as="span">{value} px</Text>
      </span>
      <button
        type="button"
        aria-label="Aumentar fonte"
        disabled={value >= max}
        onClick={() => onChange(value + 2)}
        className={buttonClass}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const fill = clamp(((value - min) / (max - min)) * 100, 0, 100);

  return (
    <div className="flex flex-col gap-2 @[30rem]:flex-row @[30rem]:items-center @[30rem]:gap-5">
      <label htmlFor={id} className={ROW_LABEL}>
        {label}
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={display}
          onChange={event => onChange(Number(event.target.value))}
          className="range-brand input-plain min-w-0 flex-1"
          style={{ '--range-fill': `${fill}%` } as CSSProperties}
        />
        <span aria-hidden className="w-[4.75rem] shrink-0 whitespace-nowrap text-right tabular-nums">
          <Text variant="body" as="span" className="text-[var(--text-secondary)]">{display}</Text>
        </span>
      </div>
    </div>
  );
}

export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  columns,
  onChange,
}: {
  label: string;
  options: ChoiceOption<T>[];
  value: T;
  /** Colunas da grade. Mais colunas que opções deixa os botões alinhados com a linha de cima. */
  columns?: number;
  onChange: (value: T) => void;
}) {
  const labelId = useId();

  return (
    <div className="flex flex-col gap-2 @[30rem]:flex-row @[30rem]:items-center @[30rem]:gap-5">
      <span id={labelId} className={ROW_LABEL}>
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="grid flex-1 gap-2"
        style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
      >
        {options.map(option => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={choiceButtonClass(active)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  const id = useId();

  return (
    <ToggleRow id={id} enabled={checked} onToggle={onChange} title={label} tone="brand" className="gap-4">
      <Text variant="bodyStrong" as="span" className="block">{label}</Text>
      <Text variant="secondary" as="span" className="mt-0.5 block text-[var(--text-tertiary)]">{description}</Text>
    </ToggleRow>
  );
}
