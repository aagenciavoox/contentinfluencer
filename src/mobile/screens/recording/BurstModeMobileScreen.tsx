import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  FileText,
  Gauge,
  Layers,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Settings2,
  SkipForward,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { Dialog } from '../../../components/overlays/Dialog';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { useHydrateContentBodies } from '../../../hooks/useHydrateContentBodies';
import type { Content, RecordingBlock } from '../../../lib/database';
import { cn, htmlToReadableText } from '../../../lib/utils';
import { isContentBodyLoaded } from '../../../features/contents/lib/contentBody';
import {
  buildPrompterLines,
  EMPTY_SCRIPT_LINE,
  parsePrompterScript,
  type PrompterLineItem,
  type PrompterSection,
} from '../../../features/contents/lib/prompterLines';
import { stripOnScreenNotes } from '../../../features/contents/lib/youtubeScript';
import { TeleprompterSectionsDialog } from '../../../features/contents/components/burst-mode/TeleprompterSectionsDialog';
import {
  CardDivider,
  type ChoiceOption,
  ChoiceRow,
  choiceButtonClass,
  FontSizeStepper,
  SettingRow,
  SettingsCard,
  SettingsHeader,
  SliderRow,
  SwitchRow,
} from '../../../features/contents/components/burst-mode/TeleprompterSettingsControls';
import { isRecordingBlockTeleprompterEnabled } from '../../../features/recording/lib/recordingWorkflow';

type BurstTheme = 'paper' | 'night' | 'amber';
type DesktopBurstTheme = 'light' | 'dark' | 'amber';
type BurstTextAlign = 'left' | 'center';

type MobileBurstSettings = {
  fontSize: number;
  lineHeight: number;
  textAlign: BurstTextAlign;
  theme: BurstTheme;
  wpm: number;
  countdown: number;
  highlightCurrentLine: boolean;
  showOnScreenNotes: boolean;
  pauseAtSectionEnd: boolean;
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

// Shared with BurstModeExperience via app preferences key `burstModeSettings` (not a separate localStorage key).
// O tamanho da fonte do celular fica em `mobileFontSize`; `fontSize` é o do desktop.
const BURST_SETTINGS_PREFERENCE_KEY = 'burstModeSettings';
const PROMPTER_LINE_MAX_WORDS = 10;
/** Altura da linha de leitura, em fração da área do texto. */
const READING_POSITION = 0.28;
const CONTROLS_HIDE_DELAY_MS = 3500;

const DEFAULT_SETTINGS: MobileBurstSettings = {
  fontSize: 30,
  lineHeight: 1.45,
  textAlign: 'left',
  theme: 'paper',
  wpm: 120,
  countdown: 2,
  highlightCurrentLine: true,
  showOnScreenNotes: false,
  pauseAtSectionEnd: true,
};

const BURST_PRESETS: Record<string, Partial<MobileBurstSettings>> = {
  perto: { fontSize: 28, lineHeight: 1.5, wpm: 110, theme: 'paper', textAlign: 'left' },
  tripe: { fontSize: 34, lineHeight: 1.45, wpm: 120, theme: 'paper', textAlign: 'center' },
  mao: { fontSize: 26, lineHeight: 1.55, wpm: 100, theme: 'night', textAlign: 'left' },
  noite: { fontSize: 32, lineHeight: 1.5, wpm: 115, theme: 'night', textAlign: 'center' },
};

const PRESET_OPTIONS: ChoiceOption<keyof typeof BURST_PRESETS>[] = [
  { value: 'perto', label: 'Perto' },
  { value: 'tripe', label: 'Tripé' },
  { value: 'mao', label: 'Mão' },
  { value: 'noite', label: 'Noite' },
];

const THEME_OPTIONS: ChoiceOption<BurstTheme>[] = [
  { value: 'paper', label: 'Claro' },
  { value: 'night', label: 'Escuro' },
  { value: 'amber', label: 'Âmbar' },
];

const TEXT_ALIGN_OPTIONS: ChoiceOption<BurstTextAlign>[] = [
  { value: 'center', label: 'Centro' },
  { value: 'left', label: 'Esquerda' },
];

const MOBILE_FONT_SIZE_MIN = 24;
const MOBILE_FONT_SIZE_MAX = 56;

/** 1,45 · 1,5 · 2,0: o passo do celular é 0,05, então mostra até duas casas. */
function formatLineHeight(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function toMobileTheme(theme: unknown): BurstTheme {
  if (theme === 'night' || theme === 'dark') return 'night';
  if (theme === 'amber') return 'amber';
  return 'paper';
}

function toDesktopTheme(theme: BurstTheme): DesktopBurstTheme {
  if (theme === 'night') return 'dark';
  if (theme === 'amber') return 'amber';
  return 'light';
}

function normalizeMobileBurstSettings(value: unknown): MobileBurstSettings {
  if (!value || typeof value !== 'object') return DEFAULT_SETTINGS;
  const parsed = value as Partial<MobileBurstSettings> & { theme?: string; mobileFontSize?: unknown };
  return {
    fontSize: typeof parsed.mobileFontSize === 'number' ? parsed.mobileFontSize : DEFAULT_SETTINGS.fontSize,
    lineHeight: typeof parsed.lineHeight === 'number' ? parsed.lineHeight : DEFAULT_SETTINGS.lineHeight,
    textAlign: parsed.textAlign === 'center' ? 'center' : 'left',
    theme: toMobileTheme(parsed.theme),
    wpm: typeof parsed.wpm === 'number' ? parsed.wpm : DEFAULT_SETTINGS.wpm,
    countdown: typeof parsed.countdown === 'number' ? parsed.countdown : DEFAULT_SETTINGS.countdown,
    highlightCurrentLine:
      typeof parsed.highlightCurrentLine === 'boolean'
        ? parsed.highlightCurrentLine
        : DEFAULT_SETTINGS.highlightCurrentLine,
    showOnScreenNotes:
      typeof parsed.showOnScreenNotes === 'boolean'
        ? parsed.showOnScreenNotes
        : DEFAULT_SETTINGS.showOnScreenNotes,
    pauseAtSectionEnd:
      typeof parsed.pauseAtSectionEnd === 'boolean'
        ? parsed.pauseAtSectionEnd
        : DEFAULT_SETTINGS.pauseAtSectionEnd,
  };
}

const THEME_CLASSNAMES: Record<BurstTheme, { shell: string; card: string; border: string; muted: string; text: string }> = {
  paper: {
    shell: 'bg-[#f7f4ef]',
    card: 'bg-[#fcfaf7]',
    border: 'border-[#e5ddd2]',
    muted: 'text-[#736b5f]',
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
  const { state, dispatch } = useAppContext();
  const teleprompterEnabled = isRecordingBlockTeleprompterEnabled(block);
  const [currentIndex, setCurrentIndex] = useState(() => getInitialIndex(entries));
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSectionsOpen, setIsSectionsOpen] = useState(false);
  const [pausedAtSectionEnd, setPausedAtSectionEnd] = useState<number | null>(null);
  const persistedSettings = useMemo(
    () => normalizeMobileBurstSettings(state.preferences[BURST_SETTINGS_PREFERENCE_KEY]),
    [state.preferences]
  );
  const [settings, setSettings] = useState<MobileBurstSettings>(persistedSettings);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLElement | null>>([]);
  const [playhead, setPlayhead] = useState(0);
  const lastPersistedSettings = useRef(JSON.stringify(persistedSettings));

  const entryContentIds = useMemo(() => entries.map(entry => entry.content.id), [entries]);
  const {hasHydrationError} = useHydrateContentBodies(entryContentIds);

  // Prefer live app state so hydration updates the teleprompter without remounting.
  const liveEntries = useMemo(
    () =>
      entries.map(entry => {
        const live = state.contents.find(content => content.id === entry.content.id);
        return live ? {...entry, content: live} : entry;
      }),
    [entries, state.contents]
  );

  useEffect(() => {
    const serialized = JSON.stringify(persistedSettings);
    lastPersistedSettings.current = serialized;
    setSettings((current) => (JSON.stringify(current) === serialized ? current : persistedSettings));
  }, [persistedSettings]);

  useEffect(() => {
    const serialized = JSON.stringify(settings);
    if (serialized === lastPersistedSettings.current) return;

    lastPersistedSettings.current = serialized;
    const existingPreference = state.preferences[BURST_SETTINGS_PREFERENCE_KEY];
    const existing =
      existingPreference && typeof existingPreference === 'object'
        ? (existingPreference as Record<string, unknown>)
        : {};

    void dispatch({
      type: 'UPDATE_PREFERENCE',
      payload: {
        key: BURST_SETTINGS_PREFERENCE_KEY,
        value: {
          ...existing,
          mobileFontSize: settings.fontSize,
          lineHeight: settings.lineHeight,
          textAlign: settings.textAlign,
          theme: toDesktopTheme(settings.theme),
          wpm: settings.wpm,
          countdown: settings.countdown,
          highlightCurrentLine: settings.highlightCurrentLine,
          showOnScreenNotes: settings.showOnScreenNotes,
          pauseAtSectionEnd: settings.pauseAtSectionEnd,
        },
      },
    });
    // Intentionally omit state.preferences: merge uses latest at write time; sync effect handles inbound changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- match BurstModeExperience persistence pattern
  }, [dispatch, settings]);

  useEffect(() => {
    setCurrentIndex(previous => clamp(previous, 0, Math.max(liveEntries.length - 1, 0)));
  }, [liveEntries.length]);

  const currentEntry = liveEntries[currentIndex] ?? null;
  const currentContent = currentEntry?.content ?? null;
  const isYouTube = currentContent?.writingMode === 'youtube';

  const rawScript = useMemo(() => {
    if (!currentContent) return EMPTY_SCRIPT_LINE;
    if (!isContentBodyLoaded(currentContent)) {
      if (hasHydrationError(currentContent.id)) {
        return 'Não foi possível carregar o roteiro.';
      }
      return 'Carregando roteiro…';
    }
    return currentContent.script ?? '';
  }, [currentContent, hasHydrationError]);

  const parsedScript = useMemo(() => {
    return parsePrompterScript(rawScript, {
      isYouTube,
      maxWords: PROMPTER_LINE_MAX_WORDS,
      wpm: settings.wpm,
      fallbackTitle: currentContent?.title ?? 'Roteiro',
    });
  }, [rawScript, isYouTube, settings.wpm, currentContent?.title]);

  const prompterItems = parsedScript.items;
  const sections = parsedScript.sections;
  const totalWords = parsedScript.totalWords;
  const totalEstimatedSeconds = parsedScript.totalEstimatedSeconds;
  const currentLineIndex = clamp(Math.round(playhead), 0, Math.max(prompterItems.length - 1, 0));
  const elapsedRatio = prompterItems.length <= 1 ? 0 : clamp(playhead / Math.max(prompterItems.length - 1, 1), 0, 1);
  const elapsedSeconds = totalEstimatedSeconds * elapsedRatio;
  const recordedCount = liveEntries.filter(entry => entry.gravado).length;
  const progressPercentage = liveEntries.length === 0 ? 0 : Math.round((recordedCount / liveEntries.length) * 100);
  const theme = THEME_CLASSNAMES[settings.theme];

  const activeSection = useMemo(() => {
    const currentItem = prompterItems[currentLineIndex];
    const secIndex = currentItem?.sectionIndex ?? 0;
    return sections.find(s => s.index === secIndex) ?? sections[0] ?? null;
  }, [prompterItems, currentLineIndex, sections]);

  const currentScript = useMemo(() => {
    return htmlToReadableText(stripOnScreenNotes(rawScript)) || EMPTY_SCRIPT_LINE;
  }, [rawScript]);

  useBodyScrollLock(true);

  useEffect(() => {
    document.body.classList.add('mobile-burst-open');
    return () => document.body.classList.remove('mobile-burst-open');
  }, []);

  useEffect(() => {
    setPlayhead(0);
    setIsPlaying(false);
    setCountdownRemaining(null);
    setPausedAtSectionEnd(null);
    lineRefs.current = [];
    containerRef.current?.scrollTo({top: 0, behavior: 'auto'});
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
    if (!teleprompterEnabled || !isPlaying || prompterItems.length <= 1) return;

    let frameId = 0;
    let previousTime = performance.now();
    const averageWordsPerLine = totalWords > 0 ? totalWords / Math.max(prompterItems.length, 1) : 8;
    const linesPerMs = (settings.wpm / Math.max(averageWordsPerLine, 1)) / 60000;

    const animate = (time: number) => {
      const delta = time - previousTime;
      previousTime = time;

      setPlayhead(previous => {
        const next = Math.min(previous + delta * linesPerMs, prompterItems.length - 1);
        if (next >= prompterItems.length - 1) {
          setIsPlaying(false);
        }
        if (
          settings.pauseAtSectionEnd &&
          activeSection &&
          activeSection.index < sections.length - 1 &&
          previous < activeSection.lastSpokenIndex &&
          next >= activeSection.lastSpokenIndex
        ) {
          setIsPlaying(false);
          setPausedAtSectionEnd(activeSection.index);
          return activeSection.lastSpokenIndex;
        }
        return next;
      });

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying, prompterItems.length, settings.wpm, teleprompterEnabled, totalWords, activeSection, sections.length, settings.pauseAtSectionEnd]);

  useEffect(() => {
    if (!teleprompterEnabled || !containerRef.current || prompterItems.length === 0) return;

    const currentLine = lineRefs.current[Math.floor(playhead)];
    if (!currentLine) return;

    const container = containerRef.current;
    const offset = currentLine.offsetTop - container.clientHeight * READING_POSITION;
    container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
  }, [playhead, prompterItems.length, teleprompterEnabled]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current !== null) window.clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_DELAY_MS);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      revealControls();
      return;
    }
    if (hideControlsTimerRef.current !== null) window.clearTimeout(hideControlsTimerRef.current);
    setControlsVisible(true);
  }, [isPlaying, revealControls]);

  useEffect(
    () => () => {
      if (hideControlsTimerRef.current !== null) window.clearTimeout(hideControlsTimerRef.current);
    },
    []
  );

  /** Linha na altura de leitura, para retomar de onde a pessoa arrastou o texto parado. */
  const getLineAtReadingPosition = () => {
    const container = containerRef.current;
    if (!container) return null;
    const readingY = container.scrollTop + container.clientHeight * READING_POSITION + 1;
    let index = 0;
    for (let lineIndex = 0; lineIndex < prompterItems.length; lineIndex++) {
      const element = lineRefs.current[lineIndex];
      if (!element) continue;
      if (element.offsetTop > readingY) break;
      index = lineIndex;
    }
    while (index < prompterItems.length - 1 && prompterItems[index].kind !== 'spoken') index++;
    return index;
  };

  const handleTogglePlayback = () => {
    if (!teleprompterEnabled) return;

    if (countdownRemaining !== null) {
      setCountdownRemaining(null);
      setIsPlaying(false);
      return;
    }

    if (pausedAtSectionEnd !== null) {
      const nextSection = sections[pausedAtSectionEnd + 1];
      setPausedAtSectionEnd(null);
      if (nextSection) {
        setPlayhead(nextSection.firstSpokenIndex);
      }
      if (settings.countdown > 0) {
        setCountdownRemaining(settings.countdown);
      } else {
        setIsPlaying(true);
      }
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    // Retoma de onde a pessoa arrastou o texto; no fim do roteiro, recomeça do início.
    const maxPlayhead = Math.max(0, prompterItems.length - 1);
    const scrolledLine = getLineAtReadingPosition();
    const resumeFrom = scrolledLine !== null && Math.abs(scrolledLine - playhead) >= 1.5 ? scrolledLine : playhead;
    if (resumeFrom >= maxPlayhead) {
      setPlayhead(0);
    } else if (resumeFrom !== playhead) {
      setPlayhead(resumeFrom);
    }

    if (settings.countdown > 0) {
      setCountdownRemaining(settings.countdown);
      return;
    }

    setIsPlaying(true);
  };

  const handleRedoSection = () => {
    if (!activeSection) return;
    setPausedAtSectionEnd(null);
    setPlayhead(activeSection.firstSpokenIndex);
    setIsPlaying(false);
    setCountdownRemaining(settings.countdown > 0 ? settings.countdown : 2);
  };

  const handleMarkRecorded = () => {
    if (!currentContent || currentEntry?.gravado) return;

    onMarkRecorded(currentContent.id);

    if (currentIndex < liveEntries.length - 1) {
      setCurrentIndex(previous => previous + 1);
      return;
    }

    window.setTimeout(() => {
      onFinish();
    }, 150);
  };

  const handleNext = () => {
    if (currentIndex >= liveEntries.length - 1) {
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
    setSettings((previous) => ({ ...previous, [key]: value }));
  };

  const applyPreset = (presetId: keyof typeof BURST_PRESETS) => {
    setSettings((previous) => ({ ...previous, ...BURST_PRESETS[presetId] }));
  };

  const resetSettings = () => setSettings(DEFAULT_SETTINGS);

  // O ajuste rápido fica aceso enquanto os valores dele continuam iguais aos atuais.
  const activePreset = PRESET_OPTIONS.find(option =>
    Object.entries(BURST_PRESETS[option.value]).every(
      ([key, value]) => settings[key as keyof MobileBurstSettings] === value
    )
  )?.value;

  const isPreparing = countdownRemaining !== null;
  const playbackState = isPreparing ? 'preparing' : isPlaying ? 'reading' : 'paused';

  if (!currentContent) {
    return null;
  }

  const fullTextStyle = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    textAlign: settings.textAlign,
  } as const;

  const overlay = (
    <div
      data-burst-portal
      className={cn('fixed inset-0 z-[200] flex min-h-[100dvh] flex-col overflow-hidden', theme.shell, theme.text)}
      onClick={revealControls}
    >
      {teleprompterEnabled ? (
        <>
          <header
            className={cn(
              'flex shrink-0 items-center gap-2 border-b px-3 py-2 transition-opacity',
              theme.border,
              controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-35'
            )}
            style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className={cn('flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border', theme.border)}
              aria-label="Fechar modo gravação"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <Text variant="label" as="p" className={cn('t-label-uppercase', theme.muted)}>Modo gravação</Text>
              <Text variant="label" as="p" className="truncate text-inherit">{currentContent.title || 'Roteiro sem título'}</Text>
              {activeSection && sections.length > 1 && (
                <Text variant="secondary" as="p" className={cn('truncate', theme.muted)}>
                  Seção {activeSection.number} de {sections.length} · {activeSection.title}
                </Text>
              )}
              <Text variant="label" as="p" className={cn('t-label-uppercase', theme.muted)}>
                {playbackState === 'preparing'
                  ? 'Preparar'
                  : playbackState === 'reading'
                    ? 'Acompanhando'
                    : 'Pausado'}
                {' · '}
                {formatSeconds(elapsedSeconds)} / {formatSeconds(totalEstimatedSeconds)}
              </Text>
            </div>

            {sections.length > 1 && (
              <button
                type="button"
                onClick={() => setIsSectionsOpen(true)}
                disabled={isPreparing}
                className={cn(
                  'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border disabled:opacity-40',
                  theme.border
                )}
                aria-label="Lista de seções"
                title="Lista de seções"
              >
                <Layers className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              disabled={isPreparing}
              className={cn(
                'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border disabled:opacity-40',
                theme.border
              )}
              aria-label="Abrir configurações"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-hidden px-2 pb-2">
            <div
              ref={containerRef}
              className="h-full overflow-y-auto px-4 py-4"
            >
              <div style={fullTextStyle}>
                {prompterItems.map((item, index) => {
                  if (item.kind === 'section-divider') {
                    return (
                      <div
                        key={item.id}
                        ref={element => {
                          lineRefs.current[index] = element;
                        }}
                        className={cn('my-6 flex items-center gap-2', theme.muted)}
                      >
                        <span className={cn('h-px flex-1 border-b', theme.border)} />
                        <Text variant="eyebrow" as="span" className="shrink-0 opacity-80 text-inherit">
                          Seção {item.sectionNumber} · {item.text}
                        </Text>
                        <span className={cn('h-px flex-1 border-b', theme.border)} />
                      </div>
                    );
                  }

                  if (item.kind === 'on-screen-note') {
                    return (
                      <div
                        key={item.id}
                        ref={element => {
                          lineRefs.current[index] = element;
                        }}
                        className={cn('my-3 flex justify-center', !settings.showOnScreenNotes && 'hidden')}
                      >
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5', theme.border, theme.card)}>
                          <Clapperboard className="h-3 w-3 shrink-0" />
                          <Text variant="meta" as="span" className={theme.muted}>{item.text}</Text>
                        </span>
                      </div>
                    );
                  }

                  if (item.kind === 'blank') {
                    return (
                      <p
                        key={item.id}
                        ref={element => {
                          lineRefs.current[index] = element;
                        }}
                        className="h-4 select-none"
                      >
                        &nbsp;
                      </p>
                    );
                  }

                  const isActive = index === currentLineIndex;
                  const distance = Math.abs(index - currentLineIndex);
                  const opacity = settings.highlightCurrentLine
                    ? isActive
                      ? 1
                      : Math.max(0.18, 1 - distance * 0.24)
                    : 1;

                  return (
                    <p
                      key={item.id}
                      ref={element => {
                        lineRefs.current[index] = element;
                      }}
                      className="transition-all duration-200"
                      style={{
                        opacity,
                        transform: isActive ? 'scale(1.01)' : 'scale(1)',
                        fontWeight: isActive ? 900 : 700,
                        marginBottom: '0.55em',
                      }}
                    >
                      {item.text}
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
              <Text variant="label" as="p" className={cn('', theme.muted)}>
                Modo gravação
              </Text>
              <Text variant="sectionTitle" truncate className={cn('mt-1', theme.text)}>{currentContent.title || 'Roteiro sem título'}</Text>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full border', theme.border, theme.card)}
              aria-label="Fechar Modo gravação"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-[calc(env(safe-area-inset-bottom)+6.5rem)]">
            <article className="mx-auto max-w-3xl whitespace-pre-wrap" style={fullTextStyle}>
              {currentScript}
            </article>
          </div>
        </>
      )}

      {teleprompterEnabled && countdownRemaining !== null && (
        <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center bg-[var(--overlay-scrim)] px-6">
          <div className={cn('rounded-[var(--radius-card-mobile)] border px-10 py-8 text-center shadow-none', theme.card, theme.border)}>
            <Text variant="label" as="p" className={cn('', theme.muted)}>Preparar</Text>
            <Text variant="display" as="p" className="mt-2 text-inherit">{countdownRemaining}</Text>
          </div>
          <button
            type="button"
            onClick={() => {
              setCountdownRemaining(null);
              setIsPlaying(false);
            }}
            className="mt-6 min-h-11 rounded-full border border-white/30 px-6 t-label t-label-uppercase text-white"
          >
            Cancelar
          </button>
        </div>
      )}

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-10 px-3 transition-opacity duration-300',
          controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        {pausedAtSectionEnd !== null && (
          <div
            className={cn(
              'pointer-events-auto mx-auto mb-2 flex items-center justify-between gap-2 rounded-[var(--radius-card-mobile)] border px-3 py-2 shadow-lg',
              theme.card,
              theme.border
            )}
          >
            <Text variant="secondary" as="span" className="text-inherit">
              Fim da seção. Toque em Iniciar ou Refazer.
            </Text>
            <button
              type="button"
              onClick={handleRedoSection}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1',
                theme.border
              )}
            >
              <RotateCcw className="h-3 w-3" />
              <Text variant="button" as="span" className="text-inherit">Refazer</Text>
            </button>
          </div>
        )}

        <div
          className={cn(
            'pointer-events-auto mx-auto grid gap-2 rounded-[var(--radius-overlay)] border p-2 shadow-[var(--shadow-dropdown)]',
            sections.length > 1 ? 'grid-cols-5' : 'grid-cols-4',
            theme.card,
            theme.border
          )}
          onClick={event => {
            event.stopPropagation();
            revealControls();
          }}
        >
          <ActionIconButton
            textClassName={theme.text}
            icon={<ChevronLeft className="h-5 w-5" />}
            label="Anterior"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          />
          <ActionIconButton
            textClassName={theme.text}
            icon={isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            label={isPlaying ? 'Pausar' : 'Iniciar'}
            onClick={handleTogglePlayback}
            disabled={!teleprompterEnabled}
          />
          {sections.length > 1 && (
            <ActionIconButton
              textClassName={theme.text}
              icon={<RotateCcw className="h-5 w-5" />}
              label="Refazer"
              onClick={handleRedoSection}
              disabled={!teleprompterEnabled}
            />
          )}
          <ActionIconButton
            textClassName={theme.text}
            icon={<CheckCircle2 className="h-5 w-5" />}
            label={currentEntry.gravado ? 'Gravado' : sections.length > 1 ? 'Marcar' : 'Marcar como gravado'}
            onClick={handleMarkRecorded}
            disabled={currentEntry.gravado}
            active={currentEntry.gravado}
          />
          <ActionIconButton
            textClassName={theme.text}
            icon={currentIndex > 0 ? <ChevronRight className="h-5 w-5" /> : <SkipForward className="h-5 w-5" />}
            label="Próximo"
            onClick={handleNext}
          />
        </div>
      </div>

      {/* Mesmo visual do TeleprompterSettingsDialog do desktop, sem o card de atalhos de teclado.
          Espaçamento, velocidade e contagem usam as faixas do desktop porque o valor é compartilhado. */}
      <Dialog
        open={isSettingsOpen && !isPreparing}
        onClose={() => setIsSettingsOpen(false)}
        ariaLabel="Configurações do Modo gravação"
        zIndex="z-[220]"
      >
        <section className="flex min-h-0 flex-1 flex-col bg-[var(--bg-elevated)] text-[var(--text-primary)]">
          <SettingsHeader onReset={resetSettings} onClose={() => setIsSettingsOpen(false)} />

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-4">
            <SettingsCard icon={Zap} title="Ajustes rápidos">
              <div className="grid grid-cols-4 gap-2">
                {PRESET_OPTIONS.map(option => {
                  const active = option.value === activePreset;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => applyPreset(option.value)}
                      className={choiceButtonClass(active)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </SettingsCard>

            <SettingsCard icon={Palette} title="Aparência">
              <SettingRow label="Tamanho da fonte">
                <FontSizeStepper
                  value={settings.fontSize}
                  onChange={value => updateSetting('fontSize', clamp(value, MOBILE_FONT_SIZE_MIN, MOBILE_FONT_SIZE_MAX))}
                  min={MOBILE_FONT_SIZE_MIN}
                  max={MOBILE_FONT_SIZE_MAX}
                />
              </SettingRow>
              <SliderRow
                label="Espaçamento entre linhas"
                min={1.1}
                max={2.2}
                step={0.05}
                value={settings.lineHeight}
                display={formatLineHeight(settings.lineHeight)}
                onChange={value => updateSetting('lineHeight', value)}
              />
              <ChoiceRow
                label="Tema"
                options={THEME_OPTIONS}
                value={settings.theme}
                onChange={value => updateSetting('theme', value)}
              />
            </SettingsCard>

            <SettingsCard icon={FileText} title="Texto e layout">
              <ChoiceRow
                label="Alinhamento"
                options={TEXT_ALIGN_OPTIONS}
                value={settings.textAlign}
                onChange={value => updateSetting('textAlign', value)}
              />
            </SettingsCard>

            <SettingsCard icon={Gauge} title="Avanço e velocidade">
              <SliderRow
                label="Velocidade de leitura"
                min={60}
                max={280}
                step={5}
                value={settings.wpm}
                display={`${settings.wpm} ppm`}
                onChange={value => updateSetting('wpm', value)}
              />
            </SettingsCard>

            <SettingsCard icon={Settings} title="Comportamento">
              <SliderRow
                label="Contagem regressiva"
                min={0}
                max={6}
                step={1}
                value={settings.countdown}
                display={`${settings.countdown} s`}
                onChange={value => updateSetting('countdown', value)}
              />
              <CardDivider />
              <SwitchRow
                label="Destacar linha atual"
                description="Reduz o destaque das linhas acima e abaixo."
                checked={settings.highlightCurrentLine}
                onChange={() => updateSetting('highlightCurrentLine', !settings.highlightCurrentLine)}
              />
              <CardDivider />
              <SwitchRow
                label="Lembretes &quot;Na tela&quot;"
                description="Exibe etiquetas de tela entre as falas (sem contar tempo)."
                checked={settings.showOnScreenNotes}
                onChange={() => updateSetting('showOnScreenNotes', !settings.showOnScreenNotes)}
              />
              <CardDivider />
              <SwitchRow
                label="Pausa no fim da seção"
                description="Pausa a leitura ao terminar cada seção para respirar ou refazer."
                checked={settings.pauseAtSectionEnd}
                onChange={() => updateSetting('pauseAtSectionEnd', !settings.pauseAtSectionEnd)}
              />
            </SettingsCard>
          </div>
        </section>
      </Dialog>

      <TeleprompterSectionsDialog
        open={isSectionsOpen && !isPreparing}
        onClose={() => setIsSectionsOpen(false)}
        sections={sections}
        activeSectionIndex={activeSection?.index ?? 0}
        zIndex="z-[220]"
        onSelectSection={firstSpokenIndex => {
          setPausedAtSectionEnd(null);
          setPlayhead(firstSpokenIndex);
        }}
      />
    </div>
  );

  return createPortal(overlay, document.body);
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-input)] bg-[var(--bg-hover)] px-3 py-3">
      <Text variant="label" as="p" className="text-[var(--text-tertiary)]">
        {label}
      </Text>
      <Text variant="bodyStrong" as="p" className="mt-1 text-[var(--text-primary)]">{value}</Text>
    </div>
  );
}

function InfoPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Text variant="label" as="span" className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[var(--text-secondary)]">
      {icon}
      {label}
    </Text>
  );
}

function ActionIconButton({
  icon,
  label,
  onClick,
  disabled = false,
  active = false,
  textClassName,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  /** Cor do texto do tema do teleprompter: --text-primary sumia no tema escuro/âmbar. */
  textClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border px-3 py-3 text-center transition-colors disabled:opacity-40',
        active
          ? 'border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]'
          : cn('border-[var(--border-color)]', textClassName ?? 'text-[var(--text-primary)]')
      )}
    >
      {icon}
      <Text variant="label" as="span" className="text-inherit">{label}</Text>
    </button>
  );
}
