import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Clapperboard,
} from 'lucide-react';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import { useHydrateContentBodies } from '../../../../hooks/useHydrateContentBodies';
import { Content, RecordingBlock } from '../../../../lib/database';
import { cn, hexContrastRatio, htmlToReadableText } from '../../../../lib/utils';
import { isContentBodyLoaded } from '../../lib/contentBody';
import { isCarouselContent } from '../../lib/carouselSlides';
import {
  EMPTY_SCRIPT_LINE,
  parsePrompterScript,
  type PrompterLineItem,
  type PrompterSection,
} from '../../lib/prompterLines';
import { stripOnScreenNotes } from '../../lib/youtubeScript';
import { isRecordingBlockTeleprompterEnabled } from '../../../recording/lib/recordingWorkflow';
import { TeleprompterSettingsDialog } from './TeleprompterSettingsDialog';
import { TeleprompterSectionsDialog } from './TeleprompterSectionsDialog';
import {
  ReadingMarker,
  TELEPROMPTER_COLUMN_CLASS,
  TeleprompterControls,
  TeleprompterHeader,
  getSpeedStep,
  getTeleprompterThemeVars,
} from './TeleprompterLayout';

const BURST_SETTINGS_PREFERENCE_KEY = 'burstModeSettings'; // Shared with BurstModeMobileScreen via app preferences.
const PROMPTER_LINE_MAX_WORDS = 11;

export type BurstTheme = 'light' | 'dark' | 'amber';
export type BurstTextColor = 'theme' | 'ink' | 'paper' | 'amber';
export type BurstTextAlign = 'left' | 'center';
export type AdvanceType = 'line' | 'continuous';

export type BurstModeSettings = {
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
  showOnScreenNotes: boolean;
  pauseAtSectionEnd: boolean;
};

type BurstModeExperienceProps = {
  block: RecordingBlock;
  recordedIds: Set<string>;
  onMarkRecorded: (contentId: string) => void;
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
  showOnScreenNotes: false,
  pauseAtSectionEnd: true,
};

const THEME_STYLES: Record<BurstTheme, { shell: string; panel: string; panelBorder: string; muted: string; accent: string; accentSoft: string; text: string; controls: string; glow: string; cursor: string }> = {
  light: {
    shell: 'bg-[#fbfaf7]',
    panel: 'bg-[var(--bg-elevated)]/88',
    panelBorder: 'border-[#e7e0d5]',
    muted: 'text-[#6b705f]',
    accent: 'text-[#4f46e5]',
    accentSoft: 'bg-[#4f46e5]/10 border-[#4f46e5]/20',
    text: 'text-[#141824]',
    controls: 'bg-[var(--bg-elevated)]/88',
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
    // Carrossel não vai para o teleprompter, mesmo que tenha entrado no bloco antes da troca de modo.
    .filter((content): content is Content => content !== null && !isCarouselContent(content));
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

function normalizeBurstSettings(value: unknown) {
  try {
    if (!value || typeof value !== 'object') return DEFAULT_SETTINGS;
    const parsed = value as Partial<BurstModeSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const BURST_SHELL_BG: Record<BurstTheme, string> = { light: '#fbfaf7', dark: '#090d16', amber: '#1a1307' };

/** Cor escolhida que ficaria ilegivel no fundo do tema (ex.: texto papel no tema claro) volta para a cor do tema. */
function getResolvedTextColor(theme: BurstTheme, textColor: BurstTextColor) {
  const chosen = getChosenTextColor(theme, textColor);
  if (textColor === 'theme') return chosen;
  const ratio = hexContrastRatio(chosen, BURST_SHELL_BG[theme]);
  return ratio !== null && ratio < 4.5 ? getChosenTextColor(theme, 'theme') : chosen;
}

function getChosenTextColor(theme: BurstTheme, textColor: BurstTextColor) {
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
  recordedIds,
  onMarkRecorded,
  onExit,
}: BurstModeExperienceProps) {
  const {state, dispatch} = useAppContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [readingLineIndex, setReadingLineIndex] = useState(0);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSectionsOpen, setIsSectionsOpen] = useState(false);
  const [pausedAtSectionEnd, setPausedAtSectionEnd] = useState<number | null>(null);
  const persistedSettings = useMemo(
    () => normalizeBurstSettings(state.preferences[BURST_SETTINGS_PREFERENCE_KEY]),
    [state.preferences]
  );
  const [settings, setSettings] = useState<BurstModeSettings>(persistedSettings);

  const blockContents = useMemo(
    () => getBlockContents(block, state.contents),
    [block, state.contents]
  );
  const readyContents = useMemo(
    () => blockContents.filter(content => !recordedIds.has(content.id)),
    [blockContents, recordedIds]
  );
  const readyContentIds = useMemo(
    () => readyContents.map(content => content.id),
    [readyContents]
  );
  const {hasHydrationError} = useHydrateContentBodies(readyContentIds);

  const currentContent = readyContents[currentIndex] ?? null;
  const isYouTube = currentContent?.writingMode === 'youtube';
  // A sensibilidade só muda o passo do + e − (getSpeedStep): a velocidade é a mesma do painel e do celular.
  const effectiveWpm = Math.max(60, settings.wpm);

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
      wpm: effectiveWpm,
      fallbackTitle: currentContent?.title ?? 'Roteiro',
    });
  }, [rawScript, isYouTube, effectiveWpm, currentContent?.title]);

  const prompterItems = parsedScript.items;
  const sections = parsedScript.sections;
  const lineWordCounts = useMemo(() => prompterItems.map(item => item.wordCount), [prompterItems]);
  const totalWords = parsedScript.totalWords;
  const totalEstimatedSeconds = parsedScript.totalEstimatedSeconds;
  const maxPlayhead = Math.max(0, prompterItems.length - 1);
  const playheadLine = clamp(Math.floor(playhead), 0, maxPlayhead);
  const isManualScroll = !settings.autoScroll;
  // Sem rolagem assistida, o tempo e a barra seguem a linha sob a guia: quem rola o texto é a pessoa.
  const progressPosition = isManualScroll ? readingLineIndex : playhead;
  const elapsedRatio = maxPlayhead === 0 ? 0 : clamp(progressPosition / maxPlayhead, 0, 1);
  const elapsedSeconds = totalEstimatedSeconds * elapsedRatio;

  const activeSection = useMemo(() => {
    const currentItem = prompterItems[readingLineIndex] ?? prompterItems[playheadLine];
    const secIndex = currentItem?.sectionIndex ?? 0;
    return sections.find(s => s.index === secIndex) ?? sections[0] ?? null;
  }, [prompterItems, readingLineIndex, playheadLine, sections]);

  const sectionMarkers = useMemo(() => {
    return sections.map(sec => ({
      index: sec.index,
      number: sec.number,
      title: sec.title,
      targetIndex: sec.firstSpokenIndex,
      ratio: maxPlayhead > 0 ? sec.firstSpokenIndex / maxPlayhead : 0,
    }));
  }, [sections, maxPlayhead]);

  const isCurrentCompleted = currentContent ? recordedIds.has(currentContent.id) : false;
  const teleprompterEnabled = isRecordingBlockTeleprompterEnabled(block);
  // Posição no bloco inteiro (gravados incluídos), para "Roteiro 2 de 5" não mudar ao marcar como gravado.
  const blockPosition = currentContent
    ? blockContents.findIndex(content => content.id === currentContent.id) + 1
    : 0;

  const themeStyle = THEME_STYLES[settings.theme];
  const teleprompterViewportRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLElement | null>>([]);
  const handleKeyDownRef = useRef<(event: KeyboardEvent) => void>(() => {});
  const readingLineRef = useRef(0);
  const lastScrolledPlayheadRef = useRef<number | null>(null);
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
    setPausedAtSectionEnd(null);
  }, [currentContent?.id]);

  useEffect(() => {
    if (currentIndex > readyContents.length) {
      setCurrentIndex(readyContents.length);
    }
  }, [currentIndex, readyContents.length]);

  useEffect(() => {
    // Com as configurações ou seções abertas, Esc fecha só o painel e Espaço/setas ficam com os controles dele.
    if (!currentContent || !settings.shortcutsEnabled || isSettingsOpen || isSectionsOpen) return;

    // Chama sempre o handler mais novo (ref atualizado a cada render): assim o Espaço vê o estado atual
    // (tocando, posição, linha rolada) e não o do momento em que o ouvinte foi registrado.
    const listener = (event: KeyboardEvent) => handleKeyDownRef.current(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [currentContent, isSectionsOpen, isSettingsOpen, settings.shortcutsEnabled]);

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
    if (!teleprompterEnabled || !isPlaying || !settings.autoScroll || prompterItems.length <= 1) return;

    if (settings.advanceType === 'line') {
      const currentWords = lineWordCounts[playheadLine] ?? 8;
      const lineDuration = clamp((currentWords / effectiveWpm) * 60000, 700, 5000);

      const timer = window.setTimeout(() => {
        setPlayhead(previous => {
          const next = Math.min(previous + 1, prompterItems.length - 1);
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
      }, lineDuration);

      return () => window.clearTimeout(timer);
    }

    let frameId = 0;
    let previousTime = performance.now();
    const averageWordsPerLine = totalWords > 0 ? totalWords / Math.max(prompterItems.length, 1) : 8;
    const linesPerMs = (effectiveWpm / Math.max(averageWordsPerLine, 1)) / 60000;

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
  }, [
    playheadLine,
    effectiveWpm,
    isPlaying,
    lineWordCounts,
    prompterItems.length,
    activeSection,
    sections.length,
    settings.advanceType,
    settings.autoScroll,
    settings.pauseAtSectionEnd,
    teleprompterEnabled,
    totalWords,
  ]);

  // Linha acesa = a que está sob a guia, medida na rolagem real (contínua, por linha ou com o mouse).
  const syncReadingLine = useCallback(() => {
    const container = teleprompterViewportRef.current;
    if (!container || prompterItems.length === 0) return;

    const guideY =
      container.scrollTop +
      container.clientHeight * (settings.verticalMargin / 100) +
      (settings.fontSize * settings.lineHeight) / 2;
    let index = 0;
    for (let lineIndex = 0; lineIndex < prompterItems.length; lineIndex++) {
      const element = lineRefs.current[lineIndex];
      if (!element) continue;
      if (element.offsetTop > guideY) break;
      index = lineIndex;
    }
    // Na divisória, nota em tela ou linha em branco, acende a fala seguinte
    while (index < prompterItems.length - 1 && prompterItems[index].kind !== 'spoken') index++;

    readingLineRef.current = index;
    setReadingLineIndex(index);
  }, [prompterItems, settings.fontSize, settings.lineHeight, settings.verticalMargin]);

  useEffect(() => {
    const container = teleprompterViewportRef.current;
    if (!teleprompterEnabled || !container || prompterItems.length === 0) return;

    // Na rolagem manual, mudar fonte/largura mantém a linha sob a guia em vez de voltar ao playhead.
    const playheadChanged = lastScrolledPlayheadRef.current !== playhead;
    lastScrolledPlayheadRef.current = playhead;
    const target = isManualScroll && !playheadChanged ? readingLineRef.current : playhead;

    const currentEl = lineRefs.current[Math.floor(target)];
    if (!currentEl) return;

    const nextIndex = Math.min(Math.floor(target) + 1, prompterItems.length - 1);
    const nextEl = lineRefs.current[nextIndex];
    const fraction = target - Math.floor(target);
    const currentTop = currentEl.offsetTop;
    const nextTop = nextEl?.offsetTop ?? currentTop;
    const interpolatedTop = currentTop + (nextTop - currentTop) * fraction;
    const desiredTop = interpolatedTop - container.clientHeight * (settings.verticalMargin / 100);

    container.scrollTo({
      top: Math.max(0, desiredTop),
      behavior: settings.advanceType === 'line' ? 'smooth' : 'auto',
    });
    syncReadingLine();
  }, [isManualScroll, playhead, prompterItems.length, settings.advanceType, settings.verticalMargin, settings.fontSize, settings.lineHeight, settings.textWidth, syncReadingLine, teleprompterEnabled]);

  const speedStep = getSpeedStep(settings.speedSensitivity);

  const handleFinishBlock = () => {
    onExit();
  };

  const toggleComplete = (id: string) => {
    if (recordedIds.has(id)) return;
    onMarkRecorded(id);
  };

  const handleNextVideo = () => {
    setIsPlaying(false);
    setCountdownRemaining(null);
    setPausedAtSectionEnd(null);
    setPlayhead(0);
    setCurrentIndex(previous => Math.min(previous + 1, readyContents.length));
  };

  const handlePreviousVideo = () => {
    setIsPlaying(false);
    setCountdownRemaining(null);
    setPausedAtSectionEnd(null);
    setPlayhead(0);
    setCurrentIndex(previous => Math.max(previous - 1, 0));
  };

  const handleRedoSection = () => {
    if (!activeSection) return;
    setPausedAtSectionEnd(null);
    setPlayhead(activeSection.firstSpokenIndex);
    setIsPlaying(false);
    setCountdownRemaining(settings.countdown > 0 ? settings.countdown : 3);
  };

  const handleNextSection = () => {
    if (!activeSection) return;
    const nextSection = sections[activeSection.index + 1];
    if (nextSection) {
      setPausedAtSectionEnd(null);
      setPlayhead(nextSection.firstSpokenIndex);
    }
  };

  const handlePreviousSection = () => {
    if (!activeSection) return;
    setPausedAtSectionEnd(null);
    if (playhead > activeSection.firstSpokenIndex + 1) {
      setPlayhead(activeSection.firstSpokenIndex);
    } else if (activeSection.index > 0) {
      const prevSection = sections[activeSection.index - 1];
      if (prevSection) setPlayhead(prevSection.firstSpokenIndex);
    } else {
      setPlayhead(activeSection.firstSpokenIndex);
    }
  };

  const togglePlayback = () => {
    // Sem rolagem assistida não há o que iniciar: a pessoa rola o texto e a guia acompanha.
    if (!teleprompterEnabled || isManualScroll) return;

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

    // Retoma da linha sob a guia se a pessoa rolou o texto parado; no fim do roteiro, recomeça do início.
    const resumeFrom = Math.abs(readingLineIndex - playhead) >= 1.5 ? readingLineIndex : playhead;
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

  const updateSetting = <K extends keyof BurstModeSettings>(key: K, value: BurstModeSettings[K]) => {
    setSettings(previous => ({ ...previous, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

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

    if (event.key.toLowerCase() === 'r' && teleprompterEnabled) {
      event.preventDefault();
      handleRedoSection();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      handleNextSection();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      handlePreviousSection();
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

  useEffect(() => {
    handleKeyDownRef.current = handleKeyDown;
  });

  if (!currentContent) {
    // Fim da sessão: todos gravados, ou a pessoa avançou além do último roteiro ainda não gravado.
    const allRecorded = blockContents.length > 0 && readyContents.length === 0;
    const pausedEarly = readyContents.length > 0;
    const endTitle = allRecorded ? 'Bloco gravado' : pausedEarly ? 'Sessão pausada' : 'Sessão encerrada';
    const endMessage = allRecorded
      ? 'Todos os roteiros foram marcados como gravados.'
      : pausedEarly
        ? 'O bloco continua de onde você parou.'
        : 'Os roteiros marcados como gravados ficam salvos.';

    // Portal no body e z acima da barra lateral (z-[105]), que antes cobria o modo gravação.
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Sessão de gravação do bloco ${block.name}`}
        className="fixed inset-0 z-[120] flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] p-6 text-center"
      >
        <CheckCircle2 className="mx-auto mb-8 h-24 w-24 animate-bounce text-[var(--accent-green)]" />
        <Text
          variant="display"
          className="mb-4 uppercase tracking-tight text-[var(--text-primary)] "
        >
          {endTitle}
        </Text>
        <Text variant="sectionTitle" as="p" className="mb-12 max-w-xl text-[var(--text-tertiary)]">
          {endMessage}
        </Text>
        <button
          type="button"
          aria-label="Fechar modo gravação"
          onClick={handleFinishBlock}
          className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--text-primary)] px-12 py-6 t-body-strong text-[var(--bg-primary)] shadow-none transition-all hover:scale-105"
        >
          Fechar modo gravação
        </button>
      </div>,
      document.body
    );
  }

  const textStyle: CSSProperties = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    fontWeight: settings.fontWeight,
    color: getResolvedTextColor(settings.theme, settings.textColor),
    textAlign: settings.textAlign,
    whiteSpace: settings.wrapText ? 'normal' : 'pre',
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Sessão de gravação do bloco ${block.name}`}
      className="fixed inset-0 z-[120] overflow-hidden bg-[var(--tp-bg)] text-[var(--tp-text)]"
      style={getTeleprompterThemeVars(settings.theme)}
    >
      <div className="relative flex h-full flex-col">
        <TeleprompterHeader
          title={currentContent.title}
          position={blockPosition}
          total={blockContents.length}
          estimatedLabel={formatSeconds(totalEstimatedSeconds)}
          totalWords={totalWords}
          onOpenSettings={() => setIsSettingsOpen(previous => !previous)}
          onExit={handleFinishBlock}
          activeSection={
            activeSection
              ? {
                  number: activeSection.number,
                  total: sections.length,
                  title: activeSection.title,
                  estimatedSeconds: activeSection.estimatedSeconds,
                }
              : null
          }
          onOpenSections={() => setIsSectionsOpen(true)}
        />

        <main className="relative min-h-0 flex-1 overflow-hidden">
          {teleprompterEnabled ? (
            <>
              {/* Nada posicionado entre o viewport e as linhas: o offsetTop delas é medido a partir dele. */}
              <div
                ref={teleprompterViewportRef}
                onScroll={syncReadingLine}
                className="absolute inset-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div aria-hidden="true" style={{ height: `${settings.verticalMargin}%` }} />
                <div className={TELEPROMPTER_COLUMN_CLASS}>
                  <div className="mx-auto" style={{ maxWidth: `${settings.textWidth}%` }}>
                    {prompterItems.map((item, index) => {
                      if (item.kind === 'section-divider') {
                        return (
                          <div
                            key={item.id}
                            ref={element => {
                              lineRefs.current[index] = element;
                            }}
                            className="my-10 flex items-center gap-4 text-[var(--tp-muted)]"
                          >
                            <span className="h-px flex-1 bg-[var(--tp-border)]" />
                            <Text variant="eyebrow" as="span" className="shrink-0 opacity-80 text-inherit">
                              Seção {item.sectionNumber} · {item.text}
                            </Text>
                            <span className="h-px flex-1 bg-[var(--tp-border)]" />
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
                            className={cn('my-4 flex justify-center', !settings.showOnScreenNotes && 'hidden')}
                          >
                            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--tp-border)] bg-[var(--tp-subtle)] px-3.5 py-1 shadow-sm">
                              <Clapperboard className="h-3.5 w-3.5 shrink-0 text-[var(--tp-marker)]" />
                              <Text variant="meta" as="span" className="text-[var(--tp-muted)]">{item.text}</Text>
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
                            className="mb-6 select-none opacity-0"
                            style={textStyle}
                          >
                            &nbsp;
                          </p>
                        );
                      }

                      const distance = Math.abs(index - readingLineIndex);
                      const opacity = settings.highlightCurrentLine
                        ? distance === 0
                          ? 1
                          : distance === 1
                            ? 0.4
                            : distance === 2
                              ? 0.22
                              : 0.1
                        : distance === 0
                          ? 1
                          : 0.5;

                      return (
                        <p
                          key={item.id}
                          ref={element => {
                            lineRefs.current[index] = element;
                          }}
                          className="mb-3 break-words transition-opacity duration-300"
                          style={{ ...textStyle, opacity }}
                        >
                          {item.text}
                        </p>
                      );
                    })}
                  </div>
                </div>
                <div aria-hidden="true" style={{ height: `${100 - settings.verticalMargin}%` }} />
              </div>

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[var(--tp-bg)] to-transparent"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[var(--tp-bg)] from-45% to-transparent"
              />

              <ReadingMarker
                topPercent={settings.verticalMargin}
                offsetPx={(settings.fontSize * settings.lineHeight) / 2}
                textWidth={settings.textWidth}
              />
            </>
          ) : (
            <div className="absolute inset-0 overflow-y-auto px-6 pb-64 pt-10 md:px-16 md:pt-16">
              <div className="mx-auto max-w-4xl">
                <div className="rounded-[var(--radius-card)] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-6 md:p-8">
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <Text variant="label" as="span" className="rounded-full border border-[var(--tp-border)] bg-[var(--tp-subtle)] px-3 py-1 t-label-uppercase text-inherit">
                      Rolagem automática desligada
                    </Text>
                    <Text variant="label" as="span" className="t-label-uppercase text-[var(--tp-muted)]">
                      Leitura livre no mobile e no desktop
                    </Text>
                  </div>

                  <Text
                    variant="sectionTitle"
                    as="article"
                    className="whitespace-pre-wrap break-words leading-[1.8] md:text-[30px] md:leading-[1.75]"
                    style={{
                      color: getResolvedTextColor(settings.theme, settings.textColor),
                      textAlign: settings.textAlign,
                    }}
                  >
                    {htmlToReadableText(stripOnScreenNotes(currentContent.script)) || EMPTY_SCRIPT_LINE}
                  </Text>
                </div>
              </div>
            </div>
          )}

          {teleprompterEnabled && countdownRemaining !== null && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--tp-bg)]/70 backdrop-blur-sm">
              <div className="rounded-[var(--radius-card)] border border-[var(--tp-border)] bg-[var(--tp-surface)] px-10 py-8 text-center shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
                <Text variant="label" uppercase className="text-[var(--tp-muted)]">Preparar</Text>
                <Text variant="display" as="p" className="mt-3 tabular-nums text-inherit">{countdownRemaining}</Text>
                <Text variant="body" as="p" className="mt-3 text-[var(--tp-muted)]">A leitura pode ser pausada a qualquer momento.</Text>
              </div>
            </div>
          )}
        </main>

        <TeleprompterControls
          teleprompterEnabled={teleprompterEnabled}
          isPlaying={isPlaying}
          manualScroll={isManualScroll}
          onTogglePlayback={togglePlayback}
          elapsedLabel={formatSeconds(elapsedSeconds)}
          totalLabel={formatSeconds(totalEstimatedSeconds)}
          playhead={progressPosition}
          maxPlayhead={maxPlayhead}
          onSeek={value => {
            setPausedAtSectionEnd(null);
            setPlayhead(clamp(value, 0, maxPlayhead));
          }}
          wpm={effectiveWpm}
          onSlower={() => updateSetting('wpm', clamp(settings.wpm - speedStep, 60, 280))}
          onFaster={() => updateSetting('wpm', clamp(settings.wpm + speedStep, 60, 280))}
          fontSize={settings.fontSize}
          onSmaller={() => updateSetting('fontSize', clamp(settings.fontSize - 2, 24, 96))}
          onBigger={() => updateSetting('fontSize', clamp(settings.fontSize + 2, 24, 96))}
          isCompleted={isCurrentCompleted}
          onMarkRecorded={() => toggleComplete(currentContent.id)}
          position={blockPosition}
          total={blockContents.length}
          canGoPrevious={currentIndex > 0}
          onPrevious={handlePreviousVideo}
          onNext={handleNextVideo}
          sections={sectionMarkers}
          onRedoSection={handleRedoSection}
          pausedAtSectionEnd={pausedAtSectionEnd}
        />

        <TeleprompterSettingsDialog
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onChange={updateSetting}
          onReset={resetSettings}
          teleprompterEnabled={teleprompterEnabled}
        />

        <TeleprompterSectionsDialog
          open={isSectionsOpen}
          onClose={() => setIsSectionsOpen(false)}
          sections={sections}
          activeSectionIndex={activeSection?.index ?? 0}
          onSelectSection={firstSpokenIndex => {
            setPausedAtSectionEnd(null);
            setPlayhead(firstSpokenIndex);
          }}
        />
      </div>
    </div>,
    document.body
  );
}
