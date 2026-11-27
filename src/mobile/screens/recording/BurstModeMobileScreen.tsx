import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
const SETTINGS_PERSIST_MS = 600;
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

const THEME_CLASSNAMES: Record<BurstTheme, { shell: string; card: string; border: string; muted: string; text: string; fade: string }> = {
  paper: {
    shell: 'bg-[#f7f4ef]',
    card: 'bg-[#fcfaf7]',
    border: 'border-[#e5ddd2]',
    muted: 'text-[#736b5f]',
    text: 'text-[#312c27]',
    fade: 'from-[#f7f4ef]',
  },
  night: {
    shell: 'bg-[#07111f]',
    card: 'bg-[#0f1b2d]',
    border: 'border-[#1d314c]',
    muted: 'text-[#8ea3c1]',
    text: 'text-[#f4f7fb]',
    fade: 'from-[#07111f]',
  },
  amber: {
    shell: 'bg-[#1a1207]',
    card: 'bg-[#2a1d0c]',
    border: 'border-[#5f4524]',
    muted: 'text-[#d2b179]',
    text: 'text-[#fff4df]',
    fade: 'from-[#1a1207]',
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

function isHiddenPrompterItem(item: PrompterLineItem | undefined, showOnScreenNotes: boolean) {
  return item?.kind === 'on-screen-note' && !showOnScreenNotes;
}

function isVisiblePrompterLine(
  element: HTMLElement | null,
  item: PrompterLineItem | undefined,
  showOnScreenNotes: boolean,
) {
  if (!element || isHiddenPrompterItem(item, showOnScreenNotes)) return false;
  return element.offsetParent !== null;
}

/** offsetTop de uma linha visivel; notas escondidas (display:none, offsetTop 0) sao ignoradas. */
function offsetOfVisibleLine(
  items: PrompterLineItem[],
  lineRefs: Array<HTMLElement | null>,
  index: number,
  showOnScreenNotes: boolean,
) {
  const scan = (start: number, step: number) => {
    for (let i = start; i >= 0 && i < items.length; i += step) {
      const element = lineRefs[i];
      if (isVisiblePrompterLine(element, items[i], showOnScreenNotes) && element) return element.offsetTop;
    }
    return null;
  };
  return scan(index, 1) ?? scan(index - 1, -1) ?? 0;
}

function desiredScrollTop(
  container: HTMLDivElement,
  items: PrompterLineItem[],
  lineRefs: Array<HTMLElement | null>,
  playhead: number,
  showOnScreenNotes: boolean,
) {
  if (items.length === 0) return 0;
  const max = Math.max(0, items.length - 1);
  const currentIndex = Math.min(Math.max(0, Math.floor(playhead)), max);
  const nextIndex = Math.min(currentIndex + 1, max);
  const currentTop = offsetOfVisibleLine(items, lineRefs, currentIndex, showOnScreenNotes);
  const nextTop = offsetOfVisibleLine(items, lineRefs, nextIndex, showOnScreenNotes);
  const interpolatedTop = currentTop + (nextTop - currentTop) * (playhead - currentIndex);
  return Math.max(0, interpolatedTop - container.clientHeight * READING_POSITION);
}

async function requestScreenWakeLock() {
  try {
    if (!("wakeLock" in navigator)) return null;
    return await navigator.wakeLock.request("screen");
  } catch {
    return null;
  }
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
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLElement | null>>([]);
  const [playhead, setPlayhead] = useState(0);
  const lastPersistedSettings = useRef(JSON.stringify(persistedSettings));
  const persistTimerRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  const preferencesRef = useRef(state.preferences);
  const [sessionEnd, setSessionEnd] = useState<'paused' | 'recorded' | null>(null);
  settingsRef.current = settings;
  preferencesRef.current = state.preferences;

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

  const flushSettingsPreference = useCallback((nextSettings: MobileBurstSettings = settingsRef.current) => {
    const serialized = JSON.stringify(nextSettings);
    if (serialized === lastPersistedSettings.current) return;
    lastPersistedSettings.current = serialized;
    const existingPreference = preferencesRef.current[BURST_SETTINGS_PREFERENCE_KEY];
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
          mobileFontSize: nextSettings.fontSize,
          lineHeight: nextSettings.lineHeight,
          textAlign: nextSettings.textAlign,
          theme: toDesktopTheme(nextSettings.theme),
          wpm: nextSettings.wpm,
          countdown: nextSettings.countdown,
          highlightCurrentLine: nextSettings.highlightCurrentLine,
          showOnScreenNotes: nextSettings.showOnScreenNotes,
          pauseAtSectionEnd: nextSettings.pauseAtSectionEnd,
        },
      },
    }, {silent: true});
  }, [dispatch]);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    flushSettingsPreference();
  }, [flushSettingsPreference]);

  const openSettings = useCallback(() => {
    setIsPlaying(false);
    setCountdownRemaining(null);
    setIsSettingsOpen(true);
  }, []);

  useEffect(() => {
    const serialized = JSON.stringify(persistedSettings);
    const localSerialized = JSON.stringify(settingsRef.current);
    const isDirty = localSerialized !== lastPersistedSettings.current;
    if (isDirty && serialized !== localSerialized) return;
    lastPersistedSettings.current = serialized;
    setSettings((current) => (JSON.stringify(current) === serialized ? current : persistedSettings));
  }, [persistedSettings]);

  useEffect(() => {
    const serialized = JSON.stringify(settings);
    if (serialized === lastPersistedSettings.current) return;

    if (persistTimerRef.current !== null) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      flushSettingsPreference(settings);
    }, SETTINGS_PERSIST_MS);

    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [flushSettingsPreference, settings]);

  useEffect(() => {
    return () => flushSettingsPreference();
  }, [flushSettingsPreference]);

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
  const currentLineIndex = clamp(Math.floor(playhead), 0, Math.max(prompterItems.length - 1, 0));
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

  const playbackContextRef = useRef({
    prompterItems,
    activeSection,
    sectionsLength: sections.length,
    pauseAtSectionEnd: settings.pauseAtSectionEnd,
    showOnScreenNotes: settings.showOnScreenNotes,
  });
  playbackContextRef.current = {
    prompterItems,
    activeSection,
    sectionsLength: sections.length,
    pauseAtSectionEnd: settings.pauseAtSectionEnd,
    showOnScreenNotes: settings.showOnScreenNotes,
  };

  useEffect(() => {
    if (!teleprompterEnabled || !isPlaying || isSettingsOpen || prompterItems.length <= 1) return;

    let frameId = 0;
    let previousTime = performance.now();
    const averageWordsPerLine = totalWords > 0 ? totalWords / Math.max(prompterItems.length, 1) : 8;
    const linesPerMs = (settings.wpm / Math.max(averageWordsPerLine, 1)) / 60000;

    const animate = (time: number) => {
      const delta = time - previousTime;
      previousTime = time;
      const ctx = playbackContextRef.current;

      setPlayhead(previous => {
        const maxPlayhead = ctx.prompterItems.length - 1;
        let next = Math.min(previous + delta * linesPerMs, maxPlayhead);
        if (isHiddenPrompterItem(ctx.prompterItems[Math.floor(next)], ctx.showOnScreenNotes)) {
          let skipTo = Math.floor(next) + 1;
          while (skipTo < ctx.prompterItems.length && isHiddenPrompterItem(ctx.prompterItems[skipTo], ctx.showOnScreenNotes)) {
            skipTo += 1;
          }
          next = Math.min(skipTo, maxPlayhead);
        }
        if (next >= maxPlayhead) {
          setIsPlaying(false);
        }
        const section = ctx.activeSection;
        if (
          ctx.pauseAtSectionEnd &&
          section &&
          section.index < ctx.sectionsLength - 1 &&
          previous < section.lastSpokenIndex &&
          next >= section.lastSpokenIndex
        ) {
          setIsPlaying(false);
          setPausedAtSectionEnd(section.index);
          return section.lastSpokenIndex;
        }
        return next;
      });

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying, isSettingsOpen, prompterItems.length, settings.wpm, teleprompterEnabled, totalWords]);

  const playheadRef = useRef(playhead);
  playheadRef.current = playhead;
  const layoutAnchorRef = useRef(playhead);

  useEffect(() => {
    layoutAnchorRef.current = playhead;
  }, [playhead]);

  const syncPrompterScroll = useCallback(() => {
    const container = containerRef.current;
    if (!teleprompterEnabled || !container || prompterItems.length === 0) return;
    container.scrollTo({
      top: desiredScrollTop(container, prompterItems, lineRefs.current, playhead, settings.showOnScreenNotes),
      behavior: 'auto',
    });
  }, [playhead, prompterItems, settings.showOnScreenNotes, teleprompterEnabled]);
  const syncPrompterScrollRef = useRef(syncPrompterScroll);
  syncPrompterScrollRef.current = syncPrompterScroll;

  const anchorReadingLine = useCallback((behavior: ScrollBehavior = 'auto') => {
    const container = containerRef.current;
    if (!teleprompterEnabled || !container || prompterItems.length === 0) return;
    container.scrollTo({
      top: desiredScrollTop(
        container,
        prompterItems,
        lineRefs.current,
        layoutAnchorRef.current,
        settings.showOnScreenNotes,
      ),
      behavior,
    });
  }, [prompterItems, settings.showOnScreenNotes, teleprompterEnabled]);

  // Acompanha o playhead durante a leitura. Com o painel aberto a rolagem fica pausada.
  useEffect(() => {
    if (isSettingsOpen) return;
    syncPrompterScroll();
  }, [isSettingsOpen, syncPrompterScroll]);

  // Fonte, espaçamento ou área visível (gaveta): reancora na hora, sem animação.
  useLayoutEffect(() => {
    if (!teleprompterEnabled) return;
    anchorReadingLine('auto');
  }, [
    anchorReadingLine,
    isSettingsOpen,
    settings.fontSize,
    settings.lineHeight,
    settings.textAlign,
    settings.showOnScreenNotes,
    teleprompterEnabled,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !teleprompterEnabled) return;
    const observer = new ResizeObserver(() => {
      anchorReadingLine('auto');
    });
    observer.observe(container);
    const recenter = () => anchorReadingLine('auto');
    window.addEventListener('resize', recenter);
    window.addEventListener('orientationchange', recenter);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recenter);
      window.removeEventListener('orientationchange', recenter);
    };
  }, [anchorReadingLine, currentContent?.id, teleprompterEnabled]);

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
      const wakeLock = wakeLockRef.current;
      wakeLockRef.current = null;
      if (wakeLock && !wakeLock.released) void wakeLock.release();
    },
    []
  );

  const keepAwake = isPlaying || countdownRemaining !== null;
  useEffect(() => {
    if (!keepAwake) {
      const current = wakeLockRef.current;
      wakeLockRef.current = null;
      if (current && !current.released) void current.release();
      return;
    }

    let cancelled = false;
    const acquire = async () => {
      const next = await requestScreenWakeLock();
      if (cancelled) {
        if (next && !next.released) void next.release();
        return;
      }
      wakeLockRef.current = next;
    };
    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      const current = wakeLockRef.current;
      wakeLockRef.current = null;
      if (current && !current.released) void current.release();
    };
  }, [keepAwake]);

  /** Linha na altura de leitura, para retomar de onde a pessoa arrastou o texto parado. */
  const getLineAtReadingPosition = () => {
    const container = containerRef.current;
    if (!container) return null;
    const readingY = container.scrollTop + container.clientHeight * READING_POSITION + 1;
    let index = 0;
    for (let lineIndex = 0; lineIndex < prompterItems.length; lineIndex++) {
      const element = lineRefs.current[lineIndex];
      if (!isVisiblePrompterLine(element, prompterItems[lineIndex], settings.showOnScreenNotes) || !element) continue;
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

    // Só retoma da linha sob a guia se a pessoa rolou o texto.
    // No início o scroll fica em 0 e a guia cai numa linha de baixo — isso não é rolagem.
    const maxPlayhead = Math.max(0, prompterItems.length - 1);
    const container = containerRef.current;
    const expectedTop = container
      ? desiredScrollTop(container, prompterItems, lineRefs.current, playhead, settings.showOnScreenNotes)
      : 0;
    const userMoved = container !== null && Math.abs(container.scrollTop - expectedTop) > 40;
    const scrolledLine = userMoved ? getLineAtReadingPosition() : null;
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
    if (settings.countdown > 0) {
      setIsPlaying(false);
      setCountdownRemaining(settings.countdown);
    } else {
      setCountdownRemaining(null);
      setIsPlaying(true);
    }
  };

  const handleMarkRecorded = () => {
    if (!currentContent || currentEntry?.gravado) return;

    onMarkRecorded(currentContent.id);

    if (currentIndex < liveEntries.length - 1) {
      setCurrentIndex(previous => previous + 1);
      return;
    }

    setIsPlaying(false);
    setCountdownRemaining(null);
    setSessionEnd('recorded');
  };

  const handlePrompterPointerDown = () => {
    if (isPlaying) setIsPlaying(false);
  };

  const handleNext = () => {
    if (currentIndex >= liveEntries.length - 1) {
      setIsPlaying(false);
      setCountdownRemaining(null);
      setSessionEnd('paused');
      return;
    }

    setCurrentIndex(previous => previous + 1);
  };

  const handleCloseSessionEnd = () => {
    if (sessionEnd === 'paused') {
      setSessionEnd(null);
      onClose();
      return;
    }
    onFinish();
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

  if (sessionEnd) {
    const allRecorded = liveEntries.length > 0 && liveEntries.every(entry => entry.gravado);
    const endTitle =
      sessionEnd === 'recorded' && allRecorded
        ? 'Bloco gravado'
        : sessionEnd === 'paused'
          ? 'Sessão pausada'
          : 'Sessão encerrada';
    const endMessage =
      sessionEnd === 'recorded' && allRecorded
        ? 'Todos os roteiros foram marcados como gravados.'
        : sessionEnd === 'paused'
          ? 'O bloco continua de onde você parou. Marque como gravado quando terminar a leitura.'
          : 'Os roteiros marcados como gravados ficam salvos.';

    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Sessão de gravação do bloco ${block.name}`}
        className="fixed inset-0 z-[200] flex min-h-dvh flex-col items-center justify-center bg-[var(--bg-primary)] px-6 text-center"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
      >
        <CheckCircle2 className="mx-auto mb-8 h-20 w-20 text-[var(--accent-green)]" />
        <Text variant="display" className="mb-4 uppercase tracking-tight text-[var(--text-primary)]">
          {endTitle}
        </Text>
        <Text variant="sectionTitle" as="p" className="mb-10 max-w-xl text-[var(--text-tertiary)]">
          {endMessage}
        </Text>
        <button
          type="button"
          aria-label="Fechar modo gravação"
          onClick={handleCloseSessionEnd}
          className="min-h-12 rounded-[var(--radius-card-mobile)] bg-[var(--text-primary)] px-10 py-4 t-body-strong text-[var(--bg-primary)]"
        >
          Fechar modo gravação
        </button>
      </div>,
      document.body
    );
  }

  if (!currentContent) {
    return null;
  }

  const fullTextStyle = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    textAlign: settings.textAlign,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    maxWidth: '100%',
  } as const;

  const handlePrompterScroll = () => {
    if (isPlaying) return;
    const line = getLineAtReadingPosition();
    if (line !== null) layoutAnchorRef.current = line;
  };

  const overlay = (
    <div
      data-burst-portal
      className={cn('fixed inset-0 z-[200] flex flex-col overflow-hidden', theme.shell, theme.text)}
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
              onClick={openSettings}
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

          <div
            className="relative min-h-0 min-w-0 flex-1 overflow-hidden px-2"
            style={
              isSettingsOpen
                ? undefined
                : { paddingBottom: 'calc(max(env(safe-area-inset-bottom), 12px) + 6.5rem)' }
            }
          >
            <div
              ref={containerRef}
              className="relative h-full min-w-0 overflow-y-auto overscroll-contain px-4"
              onPointerDown={handlePrompterPointerDown}
              onScroll={handlePrompterScroll}
            >
              {/* Espaço para a primeira fala sentar na guia. Sem isso o scroll 0
                  deixa a guia numa linha de baixo e o Iniciar pula o começo. */}
              <div aria-hidden="true" style={{ height: `${READING_POSITION * 100}%` }} />
              <div className="w-full min-w-0 max-w-full" style={fullTextStyle}>
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
                      className="break-words transition-opacity duration-200"
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
              <div aria-hidden="true" style={{ height: `${(1 - READING_POSITION) * 100}%` }} />
            </div>
            <div
              aria-hidden="true"
              className={cn('pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-45% to-transparent', theme.fade)}
              style={{ height: 'calc(max(env(safe-area-inset-bottom), 12px) + 7.5rem)' }}
            />
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
            <article className="mx-auto max-w-3xl min-w-0 break-words whitespace-pre-wrap" style={fullTextStyle}>
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
          isSettingsOpen ? 'pointer-events-none opacity-0' : controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
                'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3',
                theme.border
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <Text variant="button" as="span" className="text-inherit">Refazer</Text>
            </button>
          </div>
        )}

        <div
          className={cn(
            'pointer-events-auto mx-auto flex items-center gap-1.5 rounded-[var(--radius-overlay)] border p-2 shadow-[var(--shadow-dropdown)]',
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
          <button
            type="button"
            onClick={handleMarkRecorded}
            disabled={currentEntry.gravado}
            className={cn(
              'inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 t-label t-label-uppercase transition-colors',
              currentEntry.gravado
                ? 'cursor-default bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]'
                : 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
            )}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{currentEntry.gravado ? 'Gravado' : 'Marcar gravado'}</span>
          </button>
          <ActionIconButton
            textClassName={theme.text}
            icon={currentIndex > 0 ? <ChevronRight className="h-5 w-5" /> : <SkipForward className="h-5 w-5" />}
            label="Próximo"
            onClick={handleNext}
          />
        </div>
      </div>

      {/* Gaveta baixa: o texto do teleprompter permanece visível acima e atualiza ao vivo. */}
      {isSettingsOpen && !isPreparing ? (
        <div
          role="dialog"
          aria-label="Configurações do Modo gravação"
          className="relative z-40 flex max-h-[48dvh] shrink-0 flex-col rounded-t-[var(--radius-card-mobile)] border-t border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-dropdown)]"
        >
        <section className="flex min-h-0 flex-1 flex-col">
          <SettingsHeader onReset={resetSettings} onClose={closeSettings} />

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
        </div>
      ) : null}

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
      aria-label={label}
      title={label}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] border transition-colors disabled:opacity-40',
        active
          ? 'border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]'
          : cn('border-[var(--border-color)]', textClassName ?? 'text-[var(--text-primary)]')
      )}
    >
      {icon}
    </button>
  );
}
