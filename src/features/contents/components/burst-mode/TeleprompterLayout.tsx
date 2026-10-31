import { TextCount } from '../../../../components/ui/TextCount';
import { Text } from '../../../../components/ui/Text';
import { CSSProperties, ReactNode } from 'react';
import {
  CheckCircle2,
  Hand,
  Minus,
  Pause,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';

// Cabeçalho, marca de leitura e barra de controles do teleprompter (BurstModeExperience).
// As cores vêm das variáveis --tp-* que getTeleprompterThemeVars põe na raiz da tela.

export type TeleprompterTheme = 'light' | 'dark' | 'amber';

type TeleprompterTokens = {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  subtle: string;
  accent: string;
  onAccent: string;
  accentKbd: string;
  marker: string;
  track: string;
  knob: string;
};

// Rosa da marca nos botões principais e na marca de leitura; o âmbar mantém a própria cor.
const THEME_TOKENS: Record<TeleprompterTheme, TeleprompterTokens> = {
  light: {
    bg: '#FAF9F7',
    surface: '#FFFFFF',
    border: '#E7E5E0',
    text: '#141824',
    muted: '#6B6B76',
    subtle: '#F2F1EE',
    accent: '#E0185A',
    onAccent: '#FFFFFF',
    accentKbd: 'rgba(255, 255, 255, 0.22)',
    marker: '#FF2D6F',
    track: '#95938C',
    knob: '#8A8882',
  },
  dark: {
    bg: '#0F0F0E',
    surface: '#1B1B19',
    border: '#2E2E29',
    text: '#F5F5F2',
    muted: '#A3A39B',
    subtle: '#23231F',
    accent: '#E0185A',
    onAccent: '#FFFFFF',
    accentKbd: 'rgba(255, 255, 255, 0.2)',
    marker: '#FF2D6F',
    track: '#727269',
    knob: '#7A7A71',
  },
  amber: {
    bg: '#1A1307',
    surface: '#241A0A',
    border: '#4B3920',
    text: '#FFF2D9',
    muted: '#BEA472',
    subtle: '#2F230E',
    accent: '#FFB347',
    onAccent: '#1A1307',
    accentKbd: 'rgba(26, 19, 7, 0.16)',
    marker: '#FFB347',
    track: '#8C6E40',
    knob: '#94784A',
  },
};

export function getTeleprompterThemeVars(theme: TeleprompterTheme): CSSProperties {
  const tokens = THEME_TOKENS[theme] ?? THEME_TOKENS.light;
  return {
    '--tp-bg': tokens.bg,
    '--tp-surface': tokens.surface,
    '--tp-border': tokens.border,
    '--tp-text': tokens.text,
    '--tp-muted': tokens.muted,
    '--tp-subtle': tokens.subtle,
    '--tp-accent': tokens.accent,
    '--tp-on-accent': tokens.onAccent,
    '--tp-accent-kbd': tokens.accentKbd,
    '--tp-marker': tokens.marker,
    '--tp-track': tokens.track,
    '--tp-knob': tokens.knob,
  } as CSSProperties;
}

/** Quanto o + e o − mudam a velocidade (ppm). A "sensibilidade" das configurações só muda esse passo. */
export function getSpeedStep(speedSensitivity: number) {
  return Math.max(5, Math.round(speedSensitivity * 10));
}

/** Mesma largura no texto rolando e na marca de leitura, para a marca ficar colada à coluna. */
export const TELEPROMPTER_COLUMN_CLASS = 'mx-auto w-full max-w-6xl px-6 md:px-16';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

const ACCENT_BUTTON = cn(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-input)] bg-[var(--tp-accent)] t-body-strong text-[var(--tp-on-accent)] transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50',
  FOCUS_RING
);

const OUTLINE_BUTTON = cn(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-input)] border border-[var(--tp-border)] bg-[var(--tp-surface)] t-body-strong transition-colors hover:bg-[var(--tp-subtle)]',
  FOCUS_RING
);

function Kbd({ children, onAccent = false, className }: { children: ReactNode; onAccent?: boolean; className?: string }) {
  return (
    <kbd
      aria-hidden="true"
      className={cn(
        'rounded-[var(--radius-sm)] px-1.5 py-1 font-sans t-label leading-none',
        className,
        onAccent
          ? 'bg-[var(--tp-accent-kbd)] text-[var(--tp-on-accent)]'
          : 'border border-[var(--tp-border)] bg-[var(--tp-subtle)] text-[var(--tp-text)]'
      )}
    >
      {children}
    </kbd>
  );
}

function Divider({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('h-10 w-px shrink-0 bg-[var(--tp-border)]', className)} />;
}

type TeleprompterHeaderProps = {
  title: string;
  position: number;
  total: number;
  estimatedLabel: string;
  totalWords: number;
  onOpenSettings: () => void;
  onExit: () => void;
};

export function TeleprompterHeader({
  title,
  position,
  total,
  estimatedLabel,
  totalWords,
  onOpenSettings,
  onExit,
}: TeleprompterHeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-[var(--tp-border)] bg-[var(--tp-surface)] px-4 py-3 md:gap-6 md:px-8 md:py-4">
      <div className="shrink-0">
        <Text variant="itemTitle" as="p" className="text-inherit">Modo gravação</Text>
        <Text variant="body" as="p" className="mt-0.5 text-[var(--tp-muted)]">
          Roteiro {position} de {total}
        </Text>
      </div>

      <Divider className="hidden md:block" />

      <Text variant="sectionTitle" as="p" className="min-w-0 flex-1 truncate tracking-tight text-inherit" title={title}>
        {title}
      </Text>

      <div className="hidden shrink-0 items-center gap-6 lg:flex">
        <Divider />
        <div>
          <Text variant="body" as="p" className="text-[var(--tp-muted)]">Estimado</Text>
          <Text variant="sectionTitle" as="p" className="tabular-nums text-inherit">{estimatedLabel}</Text>
        </div>
        <Divider />
        <div>
          <TextCount count={totalWords} mode="words" style={{ color: 'var(--tp-muted)' }} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <button type="button" onClick={onOpenSettings} className={cn(OUTLINE_BUTTON, 'h-11 px-4')}>
          <SlidersHorizontal className="h-4 w-4" />
          Configurações
        </button>
        <button
          type="button"
          onClick={onExit}
          aria-keyshortcuts="Escape"
          aria-label="Sair do modo gravação"
          className={cn(OUTLINE_BUTTON, 'h-11 gap-3 px-4')}
        >
          <X className="h-4 w-4" />
          Sair
          <Kbd>ESC</Kbd>
        </button>
      </div>
    </header>
  );
}

type ReadingMarkerProps = {
  /** Altura da linha de leitura, em % da área do texto (margem vertical). */
  topPercent: number;
  /** Meio da primeira linha visual da frase atual, em px abaixo da linha de leitura. */
  offsetPx: number;
  textWidth: number;
};

export function ReadingMarker({ topPercent, offsetPx, textWidth }: ReadingMarkerProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-10 hidden md:block"
      style={{ top: `calc(${topPercent}% + ${offsetPx}px)` }}
    >
      <div className={TELEPROMPTER_COLUMN_CLASS}>
        <div className="relative mx-auto" style={{ maxWidth: `${textWidth}%` }}>
          <div className="absolute right-full top-0 mr-12 flex -translate-y-1/2 items-center">
            <span className="h-4 w-4 rounded-full bg-[var(--tp-marker)]" />
            <span className="h-px w-14 bg-[var(--tp-marker)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

type StepperProps = {
  label: string;
  value: string;
  decreaseLabel: string;
  increaseLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
};

function Stepper({ label, value, decreaseLabel, increaseLabel, onDecrease, onIncrease, disabled = false }: StepperProps) {
  const stepButton = cn(
    'flex h-7 w-7 items-center justify-center rounded-full border border-[var(--tp-knob)] transition-colors hover:bg-[var(--tp-subtle)] disabled:cursor-not-allowed disabled:opacity-40',
    FOCUS_RING
  );

  return (
    <div className="flex shrink-0 items-center gap-3">
      <Text variant="body" as="span" className="hidden text-[var(--tp-muted)] xl:inline">{label}</Text>
      <div
        role="group"
        aria-label={label}
        className="flex h-12 items-center gap-1 rounded-[var(--radius-input)] border border-[var(--tp-border)] px-2.5"
      >
        <button type="button" onClick={onDecrease} disabled={disabled} aria-label={decreaseLabel} className={stepButton}>
          <Minus className="h-3.5 w-3.5" />
        </button>
        <Text variant="itemTitle" as="span" className="min-w-[4rem] text-center xl:min-w-[4.75rem] tabular-nums text-inherit">{value}</Text>
        <button type="button" onClick={onIncrease} disabled={disabled} aria-label={increaseLabel} className={stepButton}>
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

type ProgressSeekProps = {
  value: number;
  max: number;
  disabled: boolean;
  valueText: string;
  onSeek: (value: number) => void;
};

/** Trilho desenhado em div, com um range nativo invisível por cima para arrastar e usar o teclado. */
function ProgressSeek({ value, max, disabled, valueText, onSeek }: ProgressSeekProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const knobLeft = `calc(8px + (100% - 16px) * ${ratio})`;

  return (
    <div className="relative flex h-6 min-w-[5rem] flex-1 items-center">
      <input
        type="range"
        min={0}
        max={Math.max(max, 0)}
        step="any"
        value={Math.min(value, Math.max(max, 0))}
        disabled={disabled || max <= 0}
        aria-label="Posição no roteiro"
        aria-valuetext={valueText}
        onChange={event => onSeek(Number(event.target.value))}
        onPointerUp={event => event.currentTarget.blur()}
        className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
      />
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--tp-track)]">
        <div className="h-full rounded-full bg-[var(--tp-marker)]" style={{ width: knobLeft }} />
      </div>
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors peer-focus-visible:shadow-[var(--focus-ring)]',
          ratio > 0 ? 'bg-[var(--tp-marker)]' : 'bg-[var(--tp-knob)]'
        )}
        style={{ left: knobLeft }}
      />
    </div>
  );
}

type TeleprompterControlsProps = {
  teleprompterEnabled: boolean;
  isPlaying: boolean;
  /** Rolagem assistida desligada: não há o que iniciar, a pessoa rola o texto. */
  manualScroll: boolean;
  onTogglePlayback: () => void;
  elapsedLabel: string;
  totalLabel: string;
  playhead: number;
  maxPlayhead: number;
  onSeek: (value: number) => void;
  wpm: number;
  onSlower: () => void;
  onFaster: () => void;
  fontSize: number;
  onSmaller: () => void;
  onBigger: () => void;
  isCompleted: boolean;
  onMarkRecorded: () => void;
  position: number;
  total: number;
  canGoPrevious: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export function TeleprompterControls({
  teleprompterEnabled,
  isPlaying,
  manualScroll,
  onTogglePlayback,
  elapsedLabel,
  totalLabel,
  playhead,
  maxPlayhead,
  onSeek,
  wpm,
  onSlower,
  onFaster,
  fontSize,
  onSmaller,
  onBigger,
  isCompleted,
  onMarkRecorded,
  position,
  total,
  canGoPrevious,
  onPrevious,
  onNext,
}: TeleprompterControlsProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-4 pb-4 xl:px-8 xl:pb-6">
      <div className="pointer-events-auto rounded-[var(--radius-card)] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
        {/* Abaixo de 1280px a primeira linha ainda cabe inteira: sem divisores, espaços menores e sem as dicas de tecla. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 xl:gap-x-6 xl:px-6">
          {manualScroll && teleprompterEnabled ? (
            <Text variant="itemTitle" as="span"
              title="Rolagem automática desligada nos ajustes: role o texto e a guia acompanha."
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-[var(--radius-input)] border border-[var(--tp-border)] bg-[var(--tp-subtle)] px-4 text-[var(--tp-muted)] xl:min-w-[11rem] xl:px-6"
            >
              <Hand className="h-4 w-4" />
              Rolagem manual
            </Text>
          ) : (
            <button
              type="button"
              onClick={onTogglePlayback}
              disabled={!teleprompterEnabled}
              aria-keyshortcuts="Space"
              className={cn(ACCENT_BUTTON, 'h-12 gap-3 px-4 xl:min-w-[11rem] xl:px-6')}
            >
              {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
              <span className="flex-1 text-left">{isPlaying ? 'Pausar' : 'Iniciar'}</span>
              <Kbd onAccent className="hidden xl:inline-block">Espaço</Kbd>
            </button>
          )}

          <Divider className="hidden xl:block" />

          <div className="flex min-w-[11rem] flex-1 items-center gap-3 xl:min-w-[14rem] xl:gap-4">
            <Text variant="itemTitle" as="span" className="shrink-0 tabular-nums text-inherit">
              {elapsedLabel} / {totalLabel}
            </Text>
            <ProgressSeek
              value={playhead}
              max={maxPlayhead}
              disabled={!teleprompterEnabled}
              valueText={`${elapsedLabel} de ${totalLabel}`}
              onSeek={onSeek}
            />
          </div>

          <Divider className="hidden xl:block" />

          <Stepper
            label="Velocidade"
            value={`${wpm} ppm`}
            decreaseLabel="Diminuir velocidade"
            increaseLabel="Aumentar velocidade"
            onDecrease={onSlower}
            onIncrease={onFaster}
            disabled={!teleprompterEnabled}
          />

          <Divider className="hidden xl:block" />

          <Stepper
            label="Fonte"
            value={`${fontSize} px`}
            decreaseLabel="Diminuir fonte"
            increaseLabel="Aumentar fonte"
            onDecrease={onSmaller}
            onIncrease={onBigger}
          />

          <Divider className="hidden xl:block" />

          <button
            type="button"
            onClick={onMarkRecorded}
            aria-keyshortcuts="G"
            className={cn(
              isCompleted
                ? cn(ACCENT_BUTTON, 'h-12 gap-3 px-4')
                : cn(OUTLINE_BUTTON, 'h-12 gap-3 px-4'),
              'ml-auto'
            )}
          >
            <CheckCircle2 className={cn('h-5 w-5', !isCompleted && 'text-[var(--tp-marker)]')} />
            {isCompleted ? 'Marcado como gravado' : 'Marcar como gravado'}
            <Kbd onAccent={isCompleted} className="hidden xl:inline-block">G</Kbd>
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[var(--tp-border)] px-4 py-3 xl:px-6">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            aria-keyshortcuts="ArrowLeft"
            className={cn(
              'inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--radius-input)] bg-[var(--tp-subtle)] px-4 t-body-strong transition-colors hover:bg-[var(--tp-border)] disabled:cursor-not-allowed disabled:text-[var(--tp-muted)] disabled:hover:bg-[var(--tp-subtle)]',
              FOCUS_RING
            )}
          >
            <SkipBack className="h-4 w-4" />
            Roteiro anterior
          </button>

          <Text variant="bodyStrong" as="span" className="tabular-nums text-inherit">
            {position} de {total}
          </Text>

          <button
            type="button"
            onClick={onNext}
            aria-keyshortcuts="ArrowRight"
            className={cn(ACCENT_BUTTON, 'h-10 gap-3 px-6')}
          >
            Próximo roteiro
            <SkipForward className="h-4 w-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
