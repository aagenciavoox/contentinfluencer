import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Minus,
  Pause,
  Play,
  Plus,
  Settings2,
  SkipBack,
  SkipForward,
  Type,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../../../../components/feedback/modals/ConfirmModal';
import { FixedPanelModal } from '../../../../components/overlays/FixedPanelModal';
import { useAppContext } from '../../../../context/AppContext';
import { Content, RecordingBlock } from '../../../../lib/database';
import { cn, htmlToReadableText } from '../../../../lib/utils';
import { isRecordingBlockTeleprompterEnabled } from '../../../recording/lib/recordingWorkflow';

const READY_STATUS = 'Pronto para Gravar';
const RECORDED_STATUS = 'Gravado';
const BURST_SETTINGS_PREFERENCE_KEY = 'burstModeSettings';

type ConfirmState = { message: string; onConfirm: () => void } | null;
type BurstTheme = 'light' | 'dark' | 'amber';
type BurstTextColor = 'theme' | 'ink' | 'paper' | 'amber';
type BurstTextAlign = 'left' | 'center';
type AdvanceType = 'line' | 'continuous';

type BurstModeSettings = {
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
  textColor: BurstTextColor;
  theme: BurstTheme;
  textAlign: BurstTextAlign;
  textWidth: number;
  verticalMargin: number;
  wrapText: boolean;
  shortcutsEnabled: boolean;
  speedSensitivity: number;
  advanceType: AdvanceType;
  autoScroll: boolean;
  wpm: number;
  countdown: number;
  highlightCurrentLine: boolean;
};

type BurstModeExperienceProps = {
  block: RecordingBlock;
  completedIds: Set<string>;
  setCompletedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onExit: () => void;
};

const DEFAULT_SETTINGS: BurstModeSettings = {
  fontSize: 44,
  lineHeight: 1.5,
  fontWeight: 800,
  textColor: 'theme',
  theme: 'light',
  textAlign: 'center',
  textWidth: 62,
  verticalMargin: 36,
  wrapText: true,
  shortcutsEnabled: true,
  speedSensitivity: 1,
  advanceType: 'continuous',
  autoScroll: true,
  wpm: 120,
  countdown: 3,
  highlightCurrentLine: true,
};

const THEME_STYLES: Record<BurstTheme, { shell: string; panel: string; panelBorder: string; muted: string; accent: string; accentSoft: string; text: string; controls: string; glow: string; cursor: string }> = {
  light: {
    shell: 'bg-[#fbfaf7]',
    panel: 'bg-white/88',
    panelBorder: 'border-[#e7e0d5]',
    muted: 'text-[#8f9582]',
    accent: 'text-[#4f46e5]',
    accentSoft: 'bg-[#4f46e5]/10 border-[#4f46e5]/20',
    text: 'text-[#141824]',
    controls: 'bg-white/88',
    glow: 'shadow-[0_0_120px_rgba(79,70,229,0.08)]',
    cursor: 'bg-[#4f46e5]',
  },
  dark: {
    shell: 'bg-[#090d16]',
    panel: 'bg-[#111827]/88',
    panelBorder: 'border-[#253043]',
    muted: 'text-[#8b9ab6]',
    accent: 'text-[#7c83ff]',
    accentSoft: 'bg-[#7c83ff]/12 border-[#7c83ff]/25',
    text: 'text-[#f5f7ff]',
    controls: 'bg-[#111827]/88',
    glow: 'shadow-[0_0_120px_rgba(124,131,255,0.16)]',
    cursor: 'bg-[#7c83ff]',
  },
  amber: {
    shell: 'bg-[#1a1307]',
    panel: 'bg-[#271c0b]/88',
    panelBorder: 'border-[#4b3920]',
    muted: 'text-[#bea472]',
    accent: 'text-[#ffb347]',
    accentSoft: 'bg-[#ffb347]/10 border-[#ffb347]/22',
    text: 'text-[#fff2d9]',
    controls: 'bg-[#271c0b]/88',
    glow: 'shadow-[0_0_140px_rgba(255,179,71,0.12)]',
    cursor: 'bg-[#ffb347]',
  },
};

function getBlockContents(block: RecordingBlock, contents: Content[]) {
  return block.contents
    .map(({ contentId }) => contents.find(content => content.id === contentId) ?? null)
    .filter((content): content is Content => content !== null);
}

function getReadyContents(contents: Content[]) {
  return contents.filter(content => content.status === READY_STATUS);
}

function getScriptLabel(script: string | null | undefined, fallback: string) {
  const normalized = htmlToReadableText(script);
  return normalized ? normalized : fallback;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

      if (words.length <= 11) {
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

function normalizeBurstSettings(value: unknown) {
  try {
    if (!value || typeof value !== 'object') return DEFAULT_SETTINGS;
    const parsed = value as Partial<BurstModeSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getResolvedTextColor(theme: BurstTheme, textColor: BurstTextColor) {
  if (textColor === 'theme') {
    if (theme === 'dark') return '#f5f7ff';
    if (theme === 'amber') return '#fff2d9';
    return '#141824';
  }

  if (textColor === 'paper') return '#f8fafc';
  if (textColor === 'amber') return '#ffcf87';
  return '#141824';
}

export function BurstModeExperience({
  block,
  completedIds,
  setCompletedIds,
  onExit,
}: BurstModeExperienceProps) {
  const { state, dispatch } = useAppContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmBurst, setConfirmBurst] = useState<ConfirmState>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const persistedSettings = useMemo(
    () => normalizeBurstSettings(state.preferences[BURST_SETTINGS_PREFERENCE_KEY]),
    [state.preferences]
  );
  const [settings, setSettings] = useState<BurstModeSettings>(persistedSettings);

  const readyContents = useMemo(
    () => getReadyContents(getBlockContents(block, state.contents)),
    [block, state.contents]
  );

  const currentContent = readyContents[currentIndex] ?? null;
  const scriptText = useMemo(
    () => getScriptLabel(currentContent?.script, 'Sem roteiro. Grave no freestyle.'),
    [currentContent?.script]
  );
  const scriptLines = useMemo(() => buildPrompterLines(scriptText), [scriptText]);
  const lineWordCounts = useMemo(() => scriptLines.map(line => Math.max(1, countWords(line))), [scriptLines]);
  const totalWords = useMemo(
    () => lineWordCounts.reduce((sum, value) => sum + value, 0),
    [lineWordCounts]
  );
  const effectiveWpm = Math.max(60, Math.round(settings.wpm * settings.speedSensitivity));
  const totalEstimatedSeconds = totalWords > 0 ? (totalWords / effectiveWpm) * 60 : 0;
  const currentLineIndex = clamp(Math.round(playhead), 0, Math.max(0, scriptLines.length - 1));
  const elapsedRatio = scriptLines.length <= 1 ? 0 : clamp(playhead / Math.max(scriptLines.length - 1, 1), 0, 1);
  const elapsedSeconds = totalEstimatedSeconds * elapsedRatio;
  const isCurrentCompleted = currentContent ? completedIds.has(currentContent.id) : false;
  const pendingCount = completedIds.size;
  const teleprompterEnabled = isRecordingBlockTeleprompterEnabled(block);

  const themeStyle = THEME_STYLES[settings.theme];
  const teleprompterViewportRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const lastPersistedSettings = useRef(JSON.stringify(persistedSettings));

  useEffect(() => {
    const serialized = JSON.stringify(persistedSettings);
    lastPersistedSettings.current = serialized;
    setSettings(current => (JSON.stringify(current) === serialized ? current : persistedSettings));
  }, [persistedSettings]);

  useEffect(() => {
    const serialized = JSON.stringify(settings);
    if (serialized === lastPersistedSettings.current) return;

    lastPersistedSettings.current = serialized;
    void dispatch({
      type: 'UPDATE_PREFERENCE',
      payload: {
        key: BURST_SETTINGS_PREFERENCE_KEY,
        value: settings,
      },
    });
  }, [dispatch, settings]);

  useEffect(() => {
    setPlayhead(0);
    setIsPlaying(false);
    setCountdownRemaining(null);
  }, [currentContent?.id]);

  useEffect(() => {
    if (currentIndex > readyContents.length) {
      setCurrentIndex(readyContents.length);
    }
  }, [currentIndex, readyContents.length]);

  useEffect(() => {
    if (!currentContent || !settings.shortcutsEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        handleFinishBlock();
        return;
      }

      if (event.key === ' ' && teleprompterEnabled) {
        event.preventDefault();
        togglePlayback();
        return;
      }

      if (event.key.toLowerCase() === 'g') {
        event.preventDefault();
        if (currentContent) {
          toggleComplete(currentContent.id);
        }
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNextVideo();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePreviousVideo();
        return;
      }

      if ((event.key === '+' || event.key === '=') && teleprompterEnabled) {
        event.preventDefault();
        updateSetting('fontSize', clamp(settings.fontSize + 2, 24, 96));
        return;
      }

      if (event.key === '-' && teleprompterEnabled) {
        event.preventDefault();
        updateSetting('fontSize', clamp(settings.fontSize - 2, 24, 96));
        return;
      }

      if (event.key === ']' && teleprompterEnabled) {
        event.preventDefault();
        updateSetting('wpm', clamp(settings.wpm + speedStep, 60, 280));
        return;
      }

      if (event.key === '[' && teleprompterEnabled) {
        event.preventDefault();
        updateSetting('wpm', clamp(settings.wpm - speedStep, 60, 280));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentContent, readyContents.length, settings, teleprompterEnabled]);

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
    if (!teleprompterEnabled || !isPlaying || !settings.autoScroll || scriptLines.length <= 1) return;

    if (settings.advanceType === 'line') {
      const currentWords = lineWordCounts[currentLineIndex] ?? 8;
      const lineDuration = clamp((currentWords / effectiveWpm) * 60000, 700, 5000);

      const timer = window.setTimeout(() => {
        setPlayhead(previous => {
          const next = Math.min(previous + 1, scriptLines.length - 1);
          if (next >= scriptLines.length - 1) {
            setIsPlaying(false);
          }
          return next;
        });
      }, lineDuration);

      return () => window.clearTimeout(timer);
    }

    let frameId = 0;
    let previousTime = performance.now();
    const averageWordsPerLine = totalWords > 0 ? totalWords / Math.max(scriptLines.length, 1) : 8;
    const linesPerMs = (effectiveWpm / Math.max(averageWordsPerLine, 1)) / 60000;

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
  }, [
    currentLineIndex,
    effectiveWpm,
    isPlaying,
    lineWordCounts,
    scriptLines.length,
    settings.advanceType,
    settings.autoScroll,
    teleprompterEnabled,
    totalWords,
  ]);

  useEffect(() => {
    const container = teleprompterViewportRef.current;
    if (!teleprompterEnabled || !container || scriptLines.length === 0) return;

    const currentEl = lineRefs.current[Math.floor(playhead)];
    if (!currentEl) return;

    const nextIndex = Math.min(Math.floor(playhead) + 1, scriptLines.length - 1);
    const nextEl = lineRefs.current[nextIndex];
    const fraction = playhead - Math.floor(playhead);
    const currentTop = currentEl.offsetTop;
    const nextTop = nextEl?.offsetTop ?? currentTop;
    const interpolatedTop = currentTop + (nextTop - currentTop) * fraction;
    const desiredTop = interpolatedTop - container.clientHeight * (settings.verticalMargin / 100);

    container.scrollTo({
      top: Math.max(0, desiredTop),
      behavior: settings.advanceType === 'line' ? 'smooth' : 'auto',
    });
  }, [playhead, scriptLines.length, settings.advanceType, settings.verticalMargin, settings.fontSize, settings.lineHeight, settings.textWidth, teleprompterEnabled]);

  const speedStep = Math.max(5, Math.round(settings.speedSensitivity * 10));

  const saveSessionProgress = () => {
    completedIds.forEach(id => {
      const content = state.contents.find(item => item.id === id);
      if (content) {
        dispatch({ type: 'UPDATE_CONTENT', payload: { ...content, status: RECORDED_STATUS } });
      }
    });
  };

  const handleFinishBlock = () => {
    setConfirmBurst({
      message: 'Salvar progresso do bloco de gravação? Pausar agora não perde o que foi marcado nesta sessão.',
      onConfirm: () => {
        saveSessionProgress();
        onExit();
      },
    });
  };

  const toggleComplete = (id: string) => {
    setCompletedIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNextVideo = () => {
    setIsPlaying(false);
    setCountdownRemaining(null);
    setPlayhead(0);
    setCurrentIndex(previous => Math.min(previous + 1, readyContents.length));
  };

  const handlePreviousVideo = () => {
    setIsPlaying(false);
    setCountdownRemaining(null);
    setPlayhead(0);
    setCurrentIndex(previous => Math.max(previous - 1, 0));
  };

  const togglePlayback = () => {
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

    if (!settings.autoScroll) {
      setIsPlaying(true);
      return;
    }

    if (settings.countdown > 0) {
      setCountdownRemaining(settings.countdown);
      return;
    }

    setIsPlaying(true);
  };

  const updateSetting = <K extends keyof BurstModeSettings>(key: K, value: BurstModeSettings[K]) => {
    setSettings(previous => ({ ...previous, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  if (!currentContent) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Sessão de gravação do bloco ${block.name}`}
        className="fixed inset-0 z-[100] flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] p-6 text-center"
      >
        <CheckCircle2 className="mx-auto mb-8 h-24 w-24 animate-bounce text-[var(--accent-green)]" />
        <h1 className="mb-4 text-4xl font-black uppercase italic tracking-tight text-[var(--text-primary)] md:text-5xl">
          Parabéns!
        </h1>
        <p className="mb-4 text-lg font-bold text-[var(--text-tertiary)]">
          Você finalizou ou pausou a sessão deste bloco.
        </p>
        <p className="mb-12 max-w-xl text-sm font-medium text-[var(--text-secondary)]">
          Os itens marcados como gravados nesta sessão ainda precisam ser salvos para atualizar o bloco.
        </p>
        <button
          type="button"
          aria-label="Salvar e fechar sala"
          onClick={handleFinishBlock}
          className="rounded-2xl bg-[var(--text-primary)] px-12 py-5 text-sm font-black uppercase tracking-widest text-[var(--bg-primary)] shadow-2xl transition-all hover:scale-105"
        >
          Salvar e Fechar Sala
        </button>
        <ConfirmModal
          open={!!confirmBurst}
          message={confirmBurst?.message || ''}
          onConfirm={() => {
            confirmBurst?.onConfirm();
            setConfirmBurst(null);
          }}
          onCancel={() => setConfirmBurst(null)}
        />
      </div>
    );
  }

  const shellStyle: CSSProperties = {
    backgroundImage:
      settings.theme === 'dark'
        ? 'radial-gradient(circle at center, rgba(124,131,255,0.12), transparent 42%)'
        : settings.theme === 'amber'
          ? 'radial-gradient(circle at center, rgba(255,179,71,0.12), transparent 40%)'
          : 'radial-gradient(circle at center, rgba(79,70,229,0.08), transparent 38%)',
  };

  const textStyle: CSSProperties = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    fontWeight: settings.fontWeight,
    color: getResolvedTextColor(settings.theme, settings.textColor),
    textAlign: settings.textAlign,
    maxWidth: `${settings.textWidth}%`,
    whiteSpace: settings.wrapText ? 'normal' : 'pre',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Sessão de gravação do bloco ${block.name}`}
      className={cn('fixed inset-0 z-[100] overflow-hidden', themeStyle.shell, themeStyle.text)}
      style={shellStyle}
    >
      <div className="absolute inset-0 backdrop-blur-[1px]" />

      <div className="relative flex h-full flex-col">
        <header className={cn('border-b px-4 py-4 md:px-7 md:py-5', themeStyle.panel, themeStyle.panelBorder)}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={cn('mt-1 h-3 w-3 rounded-full shadow-[0_0_20px_currentColor]', themeStyle.accent)} />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em]">Modo Explosão</p>
                <p className={cn('mt-1 text-sm', themeStyle.muted)}>
                  {teleprompterEnabled ? 'Foco total no roteiro' : 'Leitura estÃ¡tica do roteiro'}
                </p>
              </div>
            </div>

            <div className="grid min-w-[280px] grid-cols-1 gap-3 text-sm md:grid-cols-3 md:gap-6">
              <div className="border-l border-transparent pl-0 md:border-l md:border-[currentColor]/15 md:pl-6">
                <p className={cn('text-[11px] font-bold uppercase tracking-[0.18em]', themeStyle.muted)}>Roteiro atual</p>
                <p className="mt-1 truncate text-base font-black">{currentContent.title}</p>
              </div>
              <div className="border-l border-transparent pl-0 md:border-l md:border-[currentColor]/15 md:pl-6">
                <p className={cn('text-[11px] font-bold uppercase tracking-[0.18em]', themeStyle.muted)}>Tempo estimado</p>
                <p className="mt-1 text-base font-black">{formatSeconds(totalEstimatedSeconds)}</p>
              </div>
              <div className="border-l border-transparent pl-0 md:border-l md:border-[currentColor]/15 md:pl-6">
                <p className={cn('text-[11px] font-bold uppercase tracking-[0.18em]', themeStyle.muted)}>Palavras</p>
                <p className="mt-1 text-base font-black">{totalWords}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(previous => !previous)}
                className={cn('rounded-2xl border px-4 py-3 text-sm font-black transition-colors', themeStyle.panelBorder, themeStyle.panel)}
              >
                <span className="inline-flex items-center gap-2">
                  <Settings2 className="h-4 w-4" /> Configurações
                </span>
              </button>
              <button
                type="button"
                onClick={handleFinishBlock}
                className={cn('rounded-2xl border px-4 py-3 text-sm font-black transition-colors', themeStyle.panelBorder, themeStyle.panel)}
              >
                <span className="inline-flex items-center gap-2">
                  <X className="h-4 w-4" /> Sair do Modo Explosão
                  <span className={cn('rounded-lg border px-2 py-0.5 text-[10px] font-black', themeStyle.panelBorder)}>ESC</span>
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-4 z-10 hidden items-center md:flex">
            <button
              type="button"
              onClick={handlePreviousVideo}
              disabled={currentIndex === 0}
              className={cn('pointer-events-auto rounded-full border p-4 transition-opacity disabled:opacity-20', themeStyle.panel, themeStyle.panelBorder)}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          <div className="pointer-events-none absolute inset-y-0 right-4 z-10 hidden items-center md:flex">
            <button
              type="button"
              onClick={handleNextVideo}
              className={cn('pointer-events-auto rounded-full border p-4 transition-opacity', themeStyle.panel, themeStyle.panelBorder)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {teleprompterEnabled ? (
            <>
              <div
                className={cn(
                  'pointer-events-none absolute left-0 right-0 z-20',
                  themeStyle.glow
                )}
                style={{ top: `${settings.verticalMargin}%` }}
              >
                <div className="relative mx-auto max-w-6xl">
                  <div className="absolute left-4 top-1/2 hidden -translate-y-1/2 items-center gap-3 md:flex">
                    <div className={cn('h-4 w-4 rounded-full animate-pulse', themeStyle.cursor)} />
                    <div className={cn('h-px w-16', themeStyle.cursor)} />
                  </div>
                </div>
              </div>

              <div
                ref={teleprompterViewportRef}
                className="custom-scrollbar relative h-full overflow-y-auto px-5 pb-[14rem] pt-10 md:px-16 md:pb-[18rem] md:pt-20"
              >
                <div className="mx-auto max-w-7xl">
                  <div className="relative mx-auto flex min-h-full flex-col items-center">
                    <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent md:h-36', settings.theme === 'dark' ? 'from-[#090d16]' : settings.theme === 'amber' ? 'from-[#1a1307]' : 'from-[#fbfaf7]')} />
                    <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t to-transparent md:h-36', settings.theme === 'dark' ? 'from-[#090d16]' : settings.theme === 'amber' ? 'from-[#1a1307]' : 'from-[#fbfaf7]')} />

                    <div className="w-full pt-[28vh] md:pt-[30vh]">
                      <div className="mx-auto" style={{ maxWidth: `${settings.textWidth}%` }}>
                        {scriptLines.map((line, index) => {
                          const distance = Math.abs(index - currentLineIndex);
                          const opacity = settings.highlightCurrentLine
                            ? distance < 0.55
                              ? 1
                              : distance < 1.4
                                ? 0.42
                                : distance < 2.4
                                  ? 0.18
                                  : 0.08
                            : distance < 1
                              ? 1
                              : 0.5;
                          const scale = distance < 0.55 ? 1 : distance < 1.4 ? 0.985 : 0.96;
                          const blur = settings.highlightCurrentLine ? Math.min(distance * 0.7, 3.2) : 0;
                          const isCurrentLine = index === currentLineIndex;

                          return (
                            <p
                              key={`${index}-${line}`}
                              ref={element => {
                                lineRefs.current[index] = element;
                              }}
                              className={cn(
                                'relative mx-auto mb-4 break-words transition-all duration-300 md:mb-5',
                                line === '' && 'mb-8 md:mb-10'
                              )}
                              style={{
                                ...textStyle,
                                opacity: line === '' ? 0 : opacity,
                                transform: `scale(${scale})`,
                                filter: `blur(${blur}px)`,
                              }}
                            >
                              {line === '' ? '\u00a0' : line}
                              {isCurrentLine && (
                                <span className={cn('ml-2 inline-block h-[1em] w-[3px] animate-pulse align-middle', themeStyle.cursor)} />
                              )}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="custom-scrollbar relative h-full overflow-y-auto px-5 pb-[14rem] pt-10 md:px-16 md:pb-[18rem] md:pt-20">
              <div className="mx-auto max-w-4xl">
                <div className={cn('rounded-[2rem] border p-5 shadow-[0_20px_80px_rgba(0,0,0,0.08)] md:p-8', themeStyle.panel, themeStyle.panelBorder)}>
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <span className={cn('rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]', themeStyle.panelBorder, themeStyle.accentSoft)}>
                      Teleprompter desativado
                    </span>
                    <span className={cn('text-xs font-bold uppercase tracking-[0.16em]', themeStyle.muted)}>
                      Leitura livre no mobile e no desktop
                    </span>
                  </div>

                  <article
                    className="whitespace-pre-wrap break-words text-lg font-semibold leading-[1.8] md:text-[30px] md:leading-[1.75]"
                    style={{
                      color: getResolvedTextColor(settings.theme, settings.textColor),
                      textAlign: settings.textAlign,
                    }}
                  >
                    {scriptText}
                  </article>
                </div>
              </div>
            </div>
          )}

          {teleprompterEnabled && countdownRemaining !== null && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/22 backdrop-blur-sm">
              <div className={cn('rounded-[2rem] border px-10 py-8 text-center shadow-2xl', themeStyle.panel, themeStyle.panelBorder)}>
                <p className={cn('text-[11px] font-black uppercase tracking-[0.25em]', themeStyle.muted)}>Preparar</p>
                <p className="mt-3 text-6xl font-black">{countdownRemaining}</p>
                <p className={cn('mt-3 text-sm', themeStyle.muted)}>A leitura automática começa já.</p>
              </div>
            </div>
          )}
        </main>

        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 px-4 md:bottom-8">
          <div className={cn('pointer-events-auto mx-auto flex max-w-5xl flex-col gap-4 rounded-[2rem] border p-4 shadow-[0_25px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl md:flex-row md:items-center md:justify-between md:px-6', themeStyle.controls, themeStyle.panelBorder)}>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={togglePlayback}
                disabled={!teleprompterEnabled}
                className={cn('inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-colors', themeStyle.panelBorder)}
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                {isPlaying ? 'Pausar' : 'Play'}
                <span className={cn('rounded-lg border px-2 py-0.5 text-[10px] font-black', themeStyle.panelBorder)}>Espaço</span>
              </button>

              <button
                type="button"
                onClick={handlePreviousVideo}
                disabled={currentIndex === 0}
                className={cn('inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-colors disabled:opacity-30', themeStyle.panelBorder)}
              >
                <SkipBack className="h-4 w-4" /> Vídeo anterior
              </button>

              <button
                type="button"
                onClick={handleNextVideo}
                className={cn('inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white shadow-lg', settings.theme === 'amber' ? 'bg-[#ff9f1a]' : 'bg-[#4f46e5]')}
              >
                Próximo vídeo <SkipForward className="h-4 w-4 fill-current" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border px-4 py-3 text-center" style={{ borderColor: 'rgba(148, 163, 184, 0.25)' }}>
                <p className={cn('text-[10px] font-black uppercase tracking-[0.2em]', themeStyle.muted)}>Tempo</p>
                <p className="mt-1 text-sm font-black">
                  {formatSeconds(elapsedSeconds)} / {formatSeconds(totalEstimatedSeconds)}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border px-3 py-3" style={{ borderColor: 'rgba(148, 163, 184, 0.25)' }}>
                <button
                  type="button"
                  onClick={() => updateSetting('wpm', clamp(settings.wpm - speedStep, 60, 280))}
                  disabled={!teleprompterEnabled}
                  className="rounded-xl border p-2"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="min-w-[82px] text-center">
                  <p className={cn('text-[10px] font-black uppercase tracking-[0.2em]', themeStyle.muted)}>Velocidade</p>
                  <p className="mt-1 text-sm font-black">{effectiveWpm} wpm</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('wpm', clamp(settings.wpm + speedStep, 60, 280))}
                  disabled={!teleprompterEnabled}
                  className="rounded-xl border p-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border px-3 py-3" style={{ borderColor: 'rgba(148, 163, 184, 0.25)' }}>
                <button
                  type="button"
                  onClick={() => updateSetting('fontSize', clamp(settings.fontSize - 2, 24, 96))}
                  className="rounded-xl border p-2"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="min-w-[82px] text-center">
                  <p className={cn('text-[10px] font-black uppercase tracking-[0.2em]', themeStyle.muted)}>Fonte</p>
                  <p className="mt-1 text-sm font-black">{settings.fontSize}px</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('fontSize', clamp(settings.fontSize + 2, 24, 96))}
                  className="rounded-xl border p-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => currentContent && toggleComplete(currentContent.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-colors',
                  isCurrentCompleted
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : themeStyle.panelBorder
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isCurrentCompleted ? 'Marcado como gravado' : 'Marcar como gravado'}
                <span className={cn('rounded-lg border px-2 py-0.5 text-[10px] font-black', isCurrentCompleted ? 'border-white/40' : themeStyle.panelBorder)}>
                  G
                </span>
              </button>
            </div>
          </div>
        </div>

        <FixedPanelModal
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          desktopMaxW="md:max-w-[1240px]"
          desktopPanelClassName="md:h-[78vh]"
          zIndex="z-[140]"
        >
          <section className={cn('flex h-full flex-col overflow-hidden', themeStyle.controls, themeStyle.text)}>
            <div className={cn('flex items-center justify-between border-b px-5 py-4 md:px-8', themeStyle.panelBorder)}>
              <div>
                <p className={cn('text-[10px] font-black uppercase tracking-[0.22em]', themeStyle.muted)}>
                  Modo Explosão
                </p>
                <h2 className="mt-1 text-lg font-black uppercase tracking-tight md:text-2xl">
                  Configurações
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetSettings}
                  className={cn('rounded-2xl border px-4 py-2 text-xs font-black', themeStyle.panelBorder)}
                >
                  Restaurar padrões
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className={cn('rounded-2xl border px-4 py-2 text-xs font-black', themeStyle.panelBorder)}
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-6">
              {!teleprompterEnabled && (
                <div className="mb-5 rounded-[1.5rem] border border-amber-400/30 bg-amber-400/10 px-4 py-4">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-500">
                    Leitura estÃ¡tica ativa
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-current/80">
                    Os ajustes visuais continuam funcionando aqui. Controles de rolagem, velocidade e contagem regressiva
                    ficam salvos para quando o teleprompter do bloco for reativado.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2 xl:grid-cols-4">
                <SettingsGroup title="Aparência">
                  <RangeSetting label="Tamanho da fonte" value={`${settings.fontSize}px`}>
                    <button type="button" onClick={() => updateSetting('fontSize', clamp(settings.fontSize - 2, 24, 96))} className="rounded-xl border p-2"><Minus className="h-4 w-4" /></button>
                    <span className="min-w-[64px] text-center text-sm font-black">{settings.fontSize}</span>
                    <button type="button" onClick={() => updateSetting('fontSize', clamp(settings.fontSize + 2, 24, 96))} className="rounded-xl border p-2"><Plus className="h-4 w-4" /></button>
                  </RangeSetting>
                  <SliderSetting label="Espaçamento entre linhas" value={settings.lineHeight.toFixed(1)}>
                    <input type="range" min="1.1" max="2.2" step="0.1" value={settings.lineHeight} onChange={event => updateSetting('lineHeight', Number(event.target.value))} className="w-full" />
                  </SliderSetting>
                  <SliderSetting label="Peso da fonte" value={String(settings.fontWeight)}>
                    <input type="range" min="500" max="900" step="100" value={settings.fontWeight} onChange={event => updateSetting('fontWeight', Number(event.target.value))} className="w-full" />
                  </SliderSetting>
                  <ChoiceSetting label="Cor do texto">
                    <ChoiceButton active={settings.textColor === 'theme'} onClick={() => updateSetting('textColor', 'theme')}>Tema</ChoiceButton>
                    <ChoiceButton active={settings.textColor === 'ink'} onClick={() => updateSetting('textColor', 'ink')}>Tinta</ChoiceButton>
                    <ChoiceButton active={settings.textColor === 'paper'} onClick={() => updateSetting('textColor', 'paper')}>Clara</ChoiceButton>
                    <ChoiceButton active={settings.textColor === 'amber'} onClick={() => updateSetting('textColor', 'amber')}>Âmbar</ChoiceButton>
                  </ChoiceSetting>
                  <ChoiceSetting label="Tema">
                    <ChoiceButton active={settings.theme === 'light'} onClick={() => updateSetting('theme', 'light')}>Claro</ChoiceButton>
                    <ChoiceButton active={settings.theme === 'dark'} onClick={() => updateSetting('theme', 'dark')}>Escuro</ChoiceButton>
                    <ChoiceButton active={settings.theme === 'amber'} onClick={() => updateSetting('theme', 'amber')}>Âmbar</ChoiceButton>
                  </ChoiceSetting>
                </SettingsGroup>

                <SettingsGroup title="Controles">
                  <ToggleSetting
                    label="Atalhos"
                    description="Ativar/desativar atalhos"
                    checked={settings.shortcutsEnabled}
                    onChange={() => updateSetting('shortcutsEnabled', !settings.shortcutsEnabled)}
                  />
                  <SliderSetting label="Sensibilidade da velocidade" value={`${settings.speedSensitivity.toFixed(1)}x`}>
                    <input type="range" min="0.6" max="1.8" step="0.1" value={settings.speedSensitivity} onChange={event => updateSetting('speedSensitivity', Number(event.target.value))} className="w-full" />
                  </SliderSetting>
                  <ChoiceSetting label="Tipo de avanço">
                    <ChoiceButton active={settings.advanceType === 'line'} onClick={() => updateSetting('advanceType', 'line')}>Linha</ChoiceButton>
                    <ChoiceButton active={settings.advanceType === 'continuous'} onClick={() => updateSetting('advanceType', 'continuous')}>Contínuo</ChoiceButton>
                  </ChoiceSetting>
                  <SliderSetting label="Velocidade atual" value={`${settings.wpm} wpm`}>
                    <input type="range" min="60" max="280" step="5" value={settings.wpm} onChange={event => updateSetting('wpm', Number(event.target.value))} className="w-full" />
                  </SliderSetting>
                </SettingsGroup>

                <SettingsGroup title="Texto / Layout">
                  <ChoiceSetting label="Alinhamento">
                    <ChoiceButton active={settings.textAlign === 'center'} onClick={() => updateSetting('textAlign', 'center')}>Centro</ChoiceButton>
                    <ChoiceButton active={settings.textAlign === 'left'} onClick={() => updateSetting('textAlign', 'left')}>Esquerda</ChoiceButton>
                  </ChoiceSetting>
                  <SliderSetting label="Largura do texto" value={`${settings.textWidth}%`}>
                    <input type="range" min="42" max="88" step="2" value={settings.textWidth} onChange={event => updateSetting('textWidth', Number(event.target.value))} className="w-full" />
                  </SliderSetting>
                  <SliderSetting label="Margem vertical" value={`${settings.verticalMargin}%`}>
                    <input type="range" min="18" max="60" step="1" value={settings.verticalMargin} onChange={event => updateSetting('verticalMargin', Number(event.target.value))} className="w-full" />
                  </SliderSetting>
                  <ToggleSetting
                    label="Quebra automática"
                    description="Quebrar linha automaticamente"
                    checked={settings.wrapText}
                    onChange={() => updateSetting('wrapText', !settings.wrapText)}
                  />
                </SettingsGroup>

                <SettingsGroup title="Comportamento">
                  <ToggleSetting
                    label="Rolagem automática"
                    description="O texto rola automaticamente"
                    checked={settings.autoScroll}
                    onChange={() => updateSetting('autoScroll', !settings.autoScroll)}
                  />
                  <SliderSetting label="Contagem regressiva" value={`${settings.countdown}s`}>
                    <input type="range" min="0" max="6" step="1" value={settings.countdown} onChange={event => updateSetting('countdown', Number(event.target.value))} className="w-full" />
                  </SliderSetting>
                  <ToggleSetting
                    label="Destacar linha atual"
                    description="Fade das linhas acima e abaixo"
                    checked={settings.highlightCurrentLine}
                    onChange={() => updateSetting('highlightCurrentLine', !settings.highlightCurrentLine)}
                  />
                  <div className="rounded-[1.5rem] border border-[currentColor]/12 p-4">
                    <p className={cn('text-[10px] font-black uppercase tracking-[0.2em]', themeStyle.muted)}>Atalhos</p>
                    <div className="mt-3 space-y-2 text-sm">
                      <ShortcutLine label="Iniciar / Pausar" value="Espaço" />
                      <ShortcutLine label="Próximo vídeo" value="→" />
                      <ShortcutLine label="Vídeo anterior" value="←" />
                      <ShortcutLine label="Aumentar fonte" value="+" />
                      <ShortcutLine label="Diminuir fonte" value="-" />
                      <ShortcutLine label="Marcar como gravado" value="G" />
                      <ShortcutLine label="Sair" value="ESC" />
                    </div>
                  </div>
                </SettingsGroup>
              </div>
            </div>
          </section>
        </FixedPanelModal>

        <ConfirmModal
          open={!!confirmBurst}
          message={confirmBurst?.message || ''}
          onConfirm={() => {
            confirmBurst?.onConfirm();
            setConfirmBurst(null);
          }}
          onCancel={() => setConfirmBurst(null)}
        />
      </div>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.75rem] border border-[currentColor]/10 bg-white/30 p-4 backdrop-blur-sm dark:bg-black/10">
      <p className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] opacity-60">{title}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function RangeSetting({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-bold">{label}</span>
        <span className="text-xs font-black uppercase opacity-50">{value}</span>
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

function SliderSetting({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-bold">{label}</span>
        <span className="text-xs font-black uppercase opacity-50">{value}</span>
      </div>
      {children}
    </div>
  );
}

function ChoiceSetting({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-bold">{label}</div>
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
        'rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-widest transition-all',
        active ? 'border-[#4f46e5] bg-[#4f46e5]/10 text-[#4f46e5]' : 'border-[currentColor]/12 opacity-70'
      )}
    >
      {children}
    </button>
  );
}

function ToggleSetting({
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
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center justify-between gap-4 rounded-[1.25rem] border border-[currentColor]/12 px-4 py-3 text-left"
    >
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="mt-1 text-xs opacity-55">{description}</p>
      </div>
      <div
        className={cn(
          'relative h-7 w-12 rounded-full transition-colors',
          checked ? 'bg-[#4f46e5]' : 'bg-black/12'
        )}
      >
        <div
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full bg-white transition-all',
            checked ? 'left-6' : 'left-1'
          )}
        />
      </div>
    </button>
  );
}

function ShortcutLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-medium opacity-80">{label}</span>
      <span className="rounded-lg border border-[currentColor]/12 px-2 py-1 text-[10px] font-black uppercase tracking-widest opacity-70">
        {value}
      </span>
    </div>
  );
}

