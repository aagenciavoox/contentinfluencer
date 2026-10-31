import { CSSProperties, ReactNode, useId } from 'react';
import { FileText, Gauge, Keyboard, type LucideIcon, Minus, Palette, Plus, Settings, X } from 'lucide-react';
import { Dialog } from '../../../../components/overlays/Dialog';
import { ToggleRow } from '../../../../components/ui/ToggleSwitch';
import { cn } from '../../../../lib/utils';
import { getSpeedStep } from './TeleprompterLayout';
import type {
  AdvanceType,
  BurstModeSettings,
  BurstTextAlign,
  BurstTextColor,
  BurstTheme,
} from './BurstModeExperience';

type ChoiceOption<T extends string> = { value: T; label: string };

const TEXT_COLOR_OPTIONS: ChoiceOption<BurstTextColor>[] = [
  { value: 'theme', label: 'Tema' },
  { value: 'ink', label: 'Tinta' },
  { value: 'paper', label: 'Clara' },
  { value: 'amber', label: 'Âmbar' },
];

const THEME_OPTIONS: ChoiceOption<BurstTheme>[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'amber', label: 'Âmbar' },
];

const TEXT_ALIGN_OPTIONS: ChoiceOption<BurstTextAlign>[] = [
  { value: 'center', label: 'Centro' },
  { value: 'left', label: 'Esquerda' },
];

const ADVANCE_OPTIONS: ChoiceOption<AdvanceType>[] = [
  { value: 'line', label: 'Linha' },
  { value: 'continuous', label: 'Contínuo' },
];

const SHORTCUTS: Array<{ key: string; spokenKey?: string; label: string }> = [
  { key: 'Espaço', label: 'Iniciar / pausar' },
  { key: '→', spokenKey: 'Seta para a direita', label: 'Próximo roteiro' },
  { key: '←', spokenKey: 'Seta para a esquerda', label: 'Roteiro anterior' },
  { key: '+', spokenKey: 'Mais', label: 'Aumentar fonte' },
  { key: '−', spokenKey: 'Menos', label: 'Diminuir fonte' },
  { key: ']', spokenKey: 'Fecha colchete', label: 'Aumentar velocidade' },
  { key: '[', spokenKey: 'Abre colchete', label: 'Diminuir velocidade' },
  { key: 'G', label: 'Marcar como gravado' },
  { key: 'Esc', label: 'Sair' },
];

const FOCUS_RING = 'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

function formatDecimal(value: number) {
  return value.toFixed(1).replace('.', ',');
}

const FONT_SIZE_MIN = 24;
const FONT_SIZE_MAX = 96;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type TeleprompterSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  settings: BurstModeSettings;
  onChange: <K extends keyof BurstModeSettings>(key: K, value: BurstModeSettings[K]) => void;
  onReset: () => void;
  teleprompterEnabled: boolean;
};

/** Configurações do modo gravação no desktop. No celular quem abre é a folha do BurstModeMobileScreen. */
export function TeleprompterSettingsDialog({
  open,
  onClose,
  settings,
  onChange,
  onReset,
  teleprompterEnabled,
}: TeleprompterSettingsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      ariaLabel="Configurações do modo gravação"
      desktopMaxW="md:max-w-[1220px]"
      desktopPanelClassName="md:max-h-[94dvh]"
      zIndex="z-[140]"
    >
      <section className="flex min-h-0 flex-1 flex-col bg-[var(--bg-elevated)] text-[var(--text-primary)]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] px-5 pb-4 pt-1 md:px-8 md:py-5">
          <div className="min-w-0">
            <p className="text-[13px] text-[var(--text-tertiary)]">Modo gravação</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] md:text-[26px]">Configurações</h2>
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
                'inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
                FOCUS_RING
              )}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          {!teleprompterEnabled && (
            <div className="mb-4 rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--warning),transparent_60%)] bg-[var(--warning-bg)] px-4 py-3 md:mb-5">
              <p className="text-sm font-semibold">Rolagem automática desligada</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                Os ajustes de texto continuam valendo. Velocidade e contagem regressiva voltam quando a rolagem for ligada no bloco.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
            <SettingsCard icon={Palette} title="Aparência">
              <SettingRow label="Tamanho da fonte">
                <FontSizeStepper
                  value={settings.fontSize}
                  onChange={value => onChange('fontSize', clamp(value, FONT_SIZE_MIN, FONT_SIZE_MAX))}
                  min={FONT_SIZE_MIN}
                  max={FONT_SIZE_MAX}
                />
              </SettingRow>
              <SliderRow
                label="Espaçamento entre linhas"
                min={1.1}
                max={2.2}
                step={0.1}
                value={settings.lineHeight}
                display={formatDecimal(settings.lineHeight)}
                onChange={value => onChange('lineHeight', value)}
              />
              <SliderRow
                label="Peso da fonte"
                min={500}
                max={900}
                step={100}
                value={settings.fontWeight}
                display={String(settings.fontWeight)}
                onChange={value => onChange('fontWeight', value)}
              />
              <ChoiceRow
                label="Cor do texto"
                options={TEXT_COLOR_OPTIONS}
                value={settings.textColor}
                onChange={value => onChange('textColor', value)}
              />
              <ChoiceRow
                label="Tema"
                options={THEME_OPTIONS}
                columns={4}
                value={settings.theme}
                onChange={value => onChange('theme', value)}
              />
            </SettingsCard>

            <SettingsCard icon={FileText} title="Texto e layout">
              <ChoiceRow
                label="Alinhamento"
                options={TEXT_ALIGN_OPTIONS}
                value={settings.textAlign}
                onChange={value => onChange('textAlign', value)}
              />
              <SliderRow
                label="Largura do texto"
                min={42}
                max={88}
                step={2}
                value={settings.textWidth}
                display={`${settings.textWidth}%`}
                onChange={value => onChange('textWidth', value)}
              />
              <SliderRow
                label="Margem vertical"
                min={18}
                max={60}
                step={1}
                value={settings.verticalMargin}
                display={`${settings.verticalMargin}%`}
                onChange={value => onChange('verticalMargin', value)}
              />
              <CardDivider />
              <SwitchRow
                label="Quebra automática"
                description="Ajustar as linhas à largura do texto."
                checked={settings.wrapText}
                onChange={() => onChange('wrapText', !settings.wrapText)}
              />
            </SettingsCard>

            <SettingsCard icon={Gauge} title="Avanço e velocidade">
              <ChoiceRow
                label="Tipo de avanço"
                options={ADVANCE_OPTIONS}
                value={settings.advanceType}
                onChange={value => onChange('advanceType', value)}
              />
              <SliderRow
                label="Velocidade de leitura"
                min={60}
                max={280}
                step={5}
                value={settings.wpm}
                display={`${settings.wpm} ppm`}
                onChange={value => onChange('wpm', value)}
              />
              <SliderRow
                label="Passo do + e − da velocidade"
                min={0.6}
                max={1.8}
                step={0.1}
                value={settings.speedSensitivity}
                display={`${getSpeedStep(settings.speedSensitivity)} ppm`}
                onChange={value => onChange('speedSensitivity', value)}
              />
              <CardDivider />
              <SwitchRow
                label="Atalhos de teclado"
                description="Ativar os comandos durante a gravação."
                checked={settings.shortcutsEnabled}
                onChange={() => onChange('shortcutsEnabled', !settings.shortcutsEnabled)}
              />
            </SettingsCard>

            <SettingsCard icon={Settings} title="Comportamento">
              <SwitchRow
                label="Rolagem assistida"
                description="O texto acompanha o ritmo escolhido."
                checked={settings.autoScroll}
                onChange={() => onChange('autoScroll', !settings.autoScroll)}
              />
              <SliderRow
                label="Contagem regressiva"
                min={0}
                max={6}
                step={1}
                value={settings.countdown}
                display={`${settings.countdown} s`}
                onChange={value => onChange('countdown', value)}
              />
              <CardDivider />
              <SwitchRow
                label="Destacar linha atual"
                description="Reduz o destaque das linhas acima e abaixo."
                checked={settings.highlightCurrentLine}
                onChange={() => onChange('highlightCurrentLine', !settings.highlightCurrentLine)}
              />
            </SettingsCard>

            <SettingsCard
              icon={Keyboard}
              title="Atalhos de teclado"
              badge={settings.shortcutsEnabled ? undefined : 'Desligados'}
              subtle
              className="lg:col-span-2"
            >
              <ul
                className={cn(
                  'grid grid-cols-2 gap-x-2 gap-y-5 sm:grid-cols-4 lg:flex lg:gap-0 lg:divide-x lg:divide-[var(--border-color)]',
                  !settings.shortcutsEnabled && 'opacity-50'
                )}
              >
                {SHORTCUTS.map(shortcut => (
                  <li key={shortcut.label} className="flex flex-col items-center gap-2.5 px-2 text-center lg:flex-auto lg:px-3">
                    <kbd className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 font-sans text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-input)]">
                      <span aria-hidden={shortcut.spokenKey ? true : undefined}>{shortcut.key}</span>
                      {shortcut.spokenKey && <span className="sr-only">{shortcut.spokenKey}</span>}
                    </kbd>
                    <span className="text-sm text-[var(--text-secondary)] md:text-[15px] lg:whitespace-nowrap">{shortcut.label}</span>
                  </li>
                ))}
              </ul>
            </SettingsCard>
          </div>
        </div>
      </section>
    </Dialog>
  );
}

const ROW_LABEL = 'text-[15px] text-[var(--text-primary)] @[30rem]:min-w-[12rem] @[30rem]:shrink-0';

const CHOICE_ACTIVE =
  'border-[var(--brand-accent-strong)] bg-[var(--brand-accent-soft)] text-[color-mix(in_srgb,var(--brand-accent-strong),black_15%)] dark:text-[color-mix(in_srgb,var(--brand-accent),white_20%)]';
const CHOICE_IDLE =
  'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]';

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
        'inline-flex h-10 items-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] md:px-4',
        FOCUS_RING,
        className
      )}
    >
      {children}
    </button>
  );
}

// @container: as linhas ficam lado a lado só quando o card tem largura para isso (desktop),
// e empilham rótulo e controle no celular ou com o modal estreito.
function SettingsCard({
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
        <h3 id={titleId} className="text-[17px] font-semibold leading-tight">
          {title}
        </h3>
        {badge && (
          <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function CardDivider() {
  return <hr className="border-[var(--border-color)]" />;
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
      <span className="text-[15px] text-[var(--text-primary)]">{label}</span>
      {children}
    </div>
  );
}

function FontSizeStepper({
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
    'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:hover:bg-[var(--bg-elevated)]',
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
      <span aria-live="polite" className="min-w-[4.5rem] text-center text-[15px] font-semibold tabular-nums">
        {value} px
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

function SliderRow({
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
        <span aria-hidden className="w-[4.75rem] shrink-0 whitespace-nowrap text-right text-[15px] tabular-nums text-[var(--text-secondary)]">
          {display}
        </span>
      </div>
    </div>
  );
}

function ChoiceRow<T extends string>({
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
              className={cn(
                'inline-flex h-10 min-w-0 items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors',
                FOCUS_RING,
                active ? CHOICE_ACTIVE : CHOICE_IDLE
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SwitchRow({
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
      <span className="block text-[15px] font-semibold">{label}</span>
      <span className="mt-0.5 block text-[13px] text-[var(--text-tertiary)]">{description}</span>
    </ToggleRow>
  );
}
