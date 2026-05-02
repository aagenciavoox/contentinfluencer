import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Settings2,
  SkipForward,
  X,
} from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import type { Content, RecordingBlock } from '../../../lib/database';
import { cn, htmlToReadableText } from '../../../lib/utils';
import { isRecordingBlockTeleprompterEnabled } from '../../../features/recording/lib/recordingWorkflow';

type BurstTheme = 'paper' | 'night' | 'amber';
type BurstTextAlign = 'left' | 'center';

type MobileBurstSettings = {
  fontSize: number;
  lineHeight: number;
  textAlign: BurstTextAlign;
  theme: BurstTheme;
  wpm: number;
  countdown: number;
  highlightCurrentLine: boolean;
};

type BurstModeMobileEntry = {
  content: Content;
  gravado: boolean;
};

interface BurstModeMobileScreenProps {
  block: RecordingBlock;
  entries: BurstModeMobileEntry[];
  onClose: () => void;
  onMarkRecorded: (contentId: string) => void;
  onFinish: () => void;
}

const DEFAULT_SETTINGS: MobileBurstSettings = {
  fontSize: 34,
  lineHeight: 1.58,
  textAlign: 'left',
  theme: 'paper',
  wpm: 120,
  countdown: 2,
  highlightCurrentLine: true,
};

const THEME_CLASSNAMES: Record<BurstTheme, { shell: string; card: string; border: string; muted: string; text: string }> = {
  paper: {
    shell: 'bg-[#f7f4ef]',
    card: 'bg-[#fcfaf7]',
    border: 'border-[#e5ddd2]',
    muted: 'text-[#9e9588]',
    text: 'text-[#312c27]',
  },
  night: {
    shell: 'bg-[#07111f]',
    card: 'bg-[#0f1b2d]',
    border: 'border-[#1d314c]',
    muted: 'text-[#8ea3c1]',
    text: 'text-[#f4f7fb]',
  },
  amber: {
    shell: 'bg-[#1a1207]',
    card: 'bg-[#2a1d0c]',
    border: 'border-[#5f4524]',
    muted: 'text-[#d2b179]',
    text: 'text-[#fff4df]',
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatSeconds(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function buildPrompterLines(script: string) {
  const paragraphs = script
    .replace(/\r/g, '')
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);

  const lines: string[] = [];

  paragraphs.forEach(paragraph => {
    const sentences = paragraph.split(/(?<=[.!?…:;])\s+/).filter(Boolean);

    sentences.forEach(sentence => {
      const words = sentence.split(/\s+/).filter(Boolean);

      if (words.length <= 10) {
        lines.push(words.join(' '));
        return;
      }

      let cursor = 0;
      while (cursor < words.length) {
        const remaining = words.length - cursor;
        const size = remaining <= 8 ? remaining : remaining >= 16 ? 8 : Math.min(10, remaining);
        lines.push(words.slice(cursor, cursor + size).join(' '));
        cursor += size;
      }
    });

    lines.push('');
  });

  const compacted = lines.filter((line, index) => {
    if (line !== '') return true;
    return index > 0 && lines[index - 1] !== '';
  });

  return compacted.length > 0 ? compacted : ['Sem roteiro. Grave no freestyle.'];
}

function getInitialIndex(entries: BurstModeMobileEntry[]) {
  const firstPendingIndex = entries.findIndex(entry => !entry.gravado);
  return firstPendingIndex >= 0 ? firstPendingIndex : 0;
}

export function BurstModeMobileScreen({
  block,
  entries,
  onClose,
  onMarkRecorded,
  onFinish,
}: BurstModeMobileScreenProps) {
  const teleprompterEnabled = isRecordingBlockTeleprompterEnabled(block);
  const [currentIndex, setCurrentIndex] = useState(() => getInitialIndex(entries));
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const [playhead, setPlayhead] = useState(0);

  useEffect(() => {
    setCurrentIndex(previous => clamp(previous, 0, Math.max(entries.length - 1, 0)));
  }, [entries.length]);

  const currentEntry = entries[currentIndex] ?? null;
  const currentContent = currentEntry?.content ?? null;
  const currentScript = useMemo(
    () => htmlToReadableText(currentContent?.script) || 'Sem roteiro. Grave no freestyle.',
    [currentContent?.script]
  );
  const scriptLines = useMemo(() => buildPrompterLines(currentScript), [currentScript]);
  const lineWordCounts = useMemo(() => scriptLines.map(line => Math.max(1, countWords(line))), [scriptLines]);
  const totalWords = useMemo(() => lineWordCounts.reduce((sum, count) => sum + count, 0), [lineWordCounts]);
  const totalEstimatedSeconds = useMemo(() => (totalWords > 0 ? (totalWords / settings.wpm) * 60 : 0), [settings.wpm, totalWords]);
  const currentLineIndex = clamp(Math.round(playhead), 0, Math.max(scriptLines.length - 1, 0));
  const elapsedRatio = scriptLines.length <= 1 ? 0 : clamp(playhead / Math.max(scriptLines.length - 1, 1), 0, 1);
  const elapsedSeconds = totalEstimatedSeconds * elapsedRatio;
  const recordedCount = entries.filter(entry => entry.gravado).length;
  const progressPercentage = entries.length === 0 ? 0 : Math.round((recordedCount / entries.length) * 100);
  const theme = THEME_CLASSNAMES[settings.theme];

  useEffect(() => {
    setPlayhead(0);
    setIsPlaying(false);
    setCountdownRemaining(null);
  }, [currentContent?.id]);

  useEffect(() => {
    if (!teleprompterEnabled || countdownRemaining === null) return;

    if (countdownRemaining <= 0) {
      setCountdownRemaining(null);
      setIsPlaying(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdownRemaining(previous => (previous === null ? null : previous - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdownRemaining, teleprompterEnabled]);

  useEffect(() => {
    if (!teleprompterEnabled || !isPlaying || scriptLines.length <= 1) return;

    let frameId = 0;
    let previousTime = performance.now();
    const averageWordsPerLine = totalWords > 0 ? totalWords / Math.max(scriptLines.length, 1) : 8;
    const linesPerMs = (settings.wpm / Math.max(averageWordsPerLine, 1)) / 60000;

    const animate = (time: number) => {
      const delta = time - previousTime;
      previousTime = time;

      setPlayhead(previous => {
        const next = Math.min(previous + delta * linesPerMs, scriptLines.length - 1);
        if (next >= scriptLines.length - 1) {
          setIsPlaying(false);
        }
        return next;
      });

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying, scriptLines.length, settings.wpm, teleprompterEnabled, totalWords]);

  useEffect(() => {
    if (!teleprompterEnabled || !containerRef.current || scriptLines.length === 0) return;

    const currentLine = lineRefs.current[Math.floor(playhead)];
    if (!currentLine) return;

    const container = containerRef.current;
    const offset = currentLine.offsetTop - container.clientHeight * 0.28;
    container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
  }, [playhead, scriptLines.length, teleprompterEnabled]);

  const handleTogglePlayback = () => {
    if (!teleprompterEnabled) return;

    if (countdownRemaining !== null) {
      setCountdownRemaining(null);
      setIsPlaying(false);
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (settings.countdown > 0) {
      setCountdownRemaining(settings.countdown);
      return;
    }

    setIsPlaying(true);
  };

  const handleMarkRecorded = () => {
    if (!currentContent || currentEntry?.gravado) return;

    onMarkRecorded(currentContent.id);

    if (currentIndex < entries.length - 1) {
      setCurrentIndex(previous => previous + 1);
      return;
    }

    window.setTimeout(() => {
      onFinish();
    }, 150);
  };

  const handleNext = () => {
    if (currentIndex >= entries.length - 1) {
      onFinish();
      return;
    }

    setCurrentIndex(previous => previous + 1);
  };

  const handlePrevious = () => {
    if (currentIndex <= 0) return;
    setCurrentIndex(previous => previous - 1);
  };

  const updateSetting = <K extends keyof MobileBurstSettings>(key: K, value: MobileBurstSettings[K]) => {
    setSettings(previous => ({ ...previous, [key]: value }));
  };

  if (!currentContent) {
    return null;
  }

  const fullTextStyle = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    textAlign: settings.textAlign,
  } as const;

  return (
    <div className={cn('fixed inset-0 z-[160] flex min-h-screen flex-col overflow-hidden', theme.shell, theme.text)}>
      {teleprompterEnabled ? (
        <>
          <div className="px-4 pb-4 pt-[calc(env(safe-area-inset-top)+14px)]">
            <section className={cn('rounded-[2rem] border p-4 shadow-[0_12px_40px_rgba(0,0,0,0.08)]', theme.card, theme.border)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-secondary)]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Voltar
                  </button>
                  <p className={cn('mt-3 text-[11px] font-black uppercase tracking-[0.22em]', theme.muted)}>
                    Modo Explosao
                  </p>
                  <h2 className="mt-2 text-4xl font-black leading-none">{entries.length}</h2>
                  <p className={cn('mt-2 text-sm leading-relaxed', theme.muted)}>
                    Leitura guiada ativa para este bloco.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full border', theme.border)}
                  aria-label="Abrir configuracoes"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <MetricCard label="Fila" value={`${currentIndex + 1}/${entries.length}`} />
                <MetricCard label="Tempo" value={formatSeconds(totalEstimatedSeconds)} />
                <MetricCard label="Feitos" value={`${recordedCount}`} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <InfoPill icon={<Video className="h-3 w-3" />} label={`${progressPercentage}% pronto`} />
                <InfoPill icon={<Play className="h-3 w-3" />} label={currentContent.title || 'Sem titulo'} />
              </div>
            </section>
          </div>

          <div className="flex-1 overflow-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+7.25rem)]">
            <div
              ref={containerRef}
              className={cn('h-full overflow-y-auto rounded-[2rem] border px-5 py-6', theme.card, theme.border)}
            >
              <div style={fullTextStyle}>
                {scriptLines.map((line, index) => {
                  const isActive = index === currentLineIndex;
                  const distance = Math.abs(index - currentLineIndex);
                  const opacity = settings.highlightCurrentLine
                    ? isActive
                      ? 1
                      : Math.max(0.18, 1 - distance * 0.24)
                    : 1;

                  return (
                    <p
                      key={`${currentContent.id}-${index}`}
                      ref={element => {
                        lineRefs.current[index] = element;
                      }}
                      className={cn('transition-all duration-200', line === '' ? 'h-4' : '')}
                      style={{
                        opacity,
                        transform: isActive ? 'scale(1.01)' : 'scale(1)',
                        fontWeight: isActive ? 900 : 700,
                        marginBottom: line === '' ? 0 : '0.55em',
                      }}
                    >
                      {line === '' ? '\u00A0' : line}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top)+10px)]">
            <div className="min-w-0">
              <p className={cn('text-[11px] font-black uppercase tracking-[0.22em]', theme.muted)}>
                Modo Explosao
              </p>
              <h2 className="mt-1 truncate text-base font-black">{currentContent.title || 'Sem titulo'}</h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full border', theme.border, theme.card)}
              aria-label="Fechar modo explosao"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+6.5rem)]">
            <article className="mx-auto max-w-3xl whitespace-pre-wrap" style={fullTextStyle}>
              {currentScript}
            </article>
          </div>
        </>
      )}

      {teleprompterEnabled && countdownRemaining !== null && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/16 px-6">
          <div className={cn('rounded-[2rem] border px-10 py-8 text-center shadow-2xl', theme.card, theme.border)}>
            <p className={cn('text-[10px] font-black uppercase tracking-[0.22em]', theme.muted)}>Preparar</p>
            <p className="mt-2 text-6xl font-black">{countdownRemaining}</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)]">
        <div className={cn('pointer-events-auto mx-auto grid grid-cols-3 gap-3 rounded-[1.75rem] border p-3 shadow-[0_16px_40px_rgba(0,0,0,0.12)]', theme.card, theme.border)}>
          <ActionIconButton
            icon={isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            label={isPlaying ? 'Pausar' : 'Play'}
            onClick={handleTogglePlayback}
            disabled={!teleprompterEnabled}
          />
          <ActionIconButton
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Gravado"
            onClick={handleMarkRecorded}
            disabled={currentEntry.gravado}
            active={currentEntry.gravado}
          />
          <ActionIconButton
            icon={currentIndex > 0 ? <ChevronRight className="h-5 w-5" /> : <SkipForward className="h-5 w-5" />}
            label="Proximo"
            onClick={handleNext}
          />
        </div>
      </div>

      <BottomSheetModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} zIndex="z-[200]">
        <section className="flex max-h-[80vh] flex-col overflow-hidden bg-[var(--bg-primary)]">
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              Modo Explosao
            </p>
            <h3 className="mt-2 text-xl font-black text-[var(--text-primary)]">Ajustes mobile</h3>
          </div>

          <div className="space-y-5 overflow-y-auto px-5 py-5">
            <MobileSliderSetting label="Tamanho da fonte" value={`${settings.fontSize}px`}>
              <input type="range" min="24" max="56" step="2" value={settings.fontSize} onChange={event => updateSetting('fontSize', Number(event.target.value))} className="w-full" />
            </MobileSliderSetting>

            <MobileSliderSetting label="Espacamento" value={settings.lineHeight.toFixed(2)}>
              <input type="range" min="1.2" max="2" step="0.05" value={settings.lineHeight} onChange={event => updateSetting('lineHeight', Number(event.target.value))} className="w-full" />
            </MobileSliderSetting>

            <MobileSliderSetting label="Velocidade" value={`${settings.wpm} wpm`}>
              <input type="range" min="70" max="220" step="5" value={settings.wpm} onChange={event => updateSetting('wpm', Number(event.target.value))} className="w-full" />
            </MobileSliderSetting>

            <MobileSliderSetting label="Contagem regressiva" value={`${settings.countdown}s`}>
              <input type="range" min="0" max="5" step="1" value={settings.countdown} onChange={event => updateSetting('countdown', Number(event.target.value))} className="w-full" />
            </MobileSliderSetting>

            <ChoiceCluster label="Alinhamento">
              <ChoiceButton active={settings.textAlign === 'left'} onClick={() => updateSetting('textAlign', 'left')}>Esquerda</ChoiceButton>
              <ChoiceButton active={settings.textAlign === 'center'} onClick={() => updateSetting('textAlign', 'center')}>Centro</ChoiceButton>
            </ChoiceCluster>

            <ChoiceCluster label="Tema">
              <ChoiceButton active={settings.theme === 'paper'} onClick={() => updateSetting('theme', 'paper')}>Claro</ChoiceButton>
              <ChoiceButton active={settings.theme === 'night'} onClick={() => updateSetting('theme', 'night')}>Noite</ChoiceButton>
              <ChoiceButton active={settings.theme === 'amber'} onClick={() => updateSetting('theme', 'amber')}>Ambar</ChoiceButton>
            </ChoiceCluster>
          </div>
        </section>
      </BottomSheetModal>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] bg-[var(--bg-hover)] px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-1 text-base font-black text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function InfoPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
      {icon}
      {label}
    </span>
  );
}

function ActionIconButton({
  icon,
  label,
  onClick,
  disabled = false,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-[1.25rem] border px-3 py-3 text-center transition-colors disabled:opacity-40',
        active
          ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-500'
          : 'border-[var(--border-color)] text-[var(--text-primary)]'
      )}
    >
      {icon}
      <span className="text-[10px] font-black uppercase tracking-[0.18em]">{label}</span>
    </button>
  );
}

function MobileSliderSetting({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-[var(--text-primary)]">{label}</span>
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{value}</span>
      </div>
      {children}
    </div>
  );
}

function ChoiceCluster({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-bold text-[var(--text-primary)]">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-2 text-sm font-black transition-colors',
        active
          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
          : 'border-[var(--border-color)] text-[var(--text-secondary)]'
      )}
    >
      {children}
    </button>
  );
}
