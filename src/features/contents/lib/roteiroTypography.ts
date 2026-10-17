import {useCallback, useEffect, useState, type CSSProperties} from 'react';

/** Fonte e tamanho do texto do roteiro, guardados por usuario neste aparelho (localStorage). */
export type RoteiroFontId = 'default' | 'courier-prime' | 'roboto-mono' | 'share-tech-mono';

export interface RoteiroFontOption {
  id: RoteiroFontId;
  label: string;
  family: string;
  /** Familia no Google Fonts; a fonte padrao ja vem carregada pelo app. */
  googleFamily?: string;
}

export const ROTEIRO_FONTS: readonly RoteiroFontOption[] = [
  {id: 'default', label: 'Padr\u00e3o', family: 'var(--font-sans)'},
  {id: 'courier-prime', label: 'Courier Prime', family: '"Courier Prime", ui-monospace, monospace', googleFamily: 'Courier+Prime:ital,wght@0,400;0,700;1,400;1,700'},
  {id: 'roboto-mono', label: 'Roboto Mono', family: '"Roboto Mono", ui-monospace, monospace', googleFamily: 'Roboto+Mono:ital,wght@0,400;0,700;1,400;1,700'},
  {id: 'share-tech-mono', label: 'Share Tech Mono', family: '"Share Tech Mono", ui-monospace, monospace', googleFamily: 'Share+Tech+Mono'},
];

export const ROTEIRO_FONT_SIZE_MIN = 8;
export const ROTEIRO_FONT_SIZE_MAX = 16;
/** O roteiro usa 17px (--font-size-body-reading); dentro da faixa 8-16 isso vira 16. */
export const ROTEIRO_FONT_SIZE_DEFAULT = 16;

export interface RoteiroTypography {
  font: RoteiroFontId;
  size: number;
}

export const DEFAULT_ROTEIRO_TYPOGRAPHY: RoteiroTypography = {
  font: 'default',
  size: ROTEIRO_FONT_SIZE_DEFAULT,
};

export function clampRoteiroFontSize(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return ROTEIRO_FONT_SIZE_DEFAULT;
  return Math.min(ROTEIRO_FONT_SIZE_MAX, Math.max(ROTEIRO_FONT_SIZE_MIN, Math.round(n)));
}

export function normalizeRoteiroTypography(raw: unknown): RoteiroTypography {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<RoteiroTypography>;
  const font = ROTEIRO_FONTS.some(option => option.id === value.font)
    ? (value.font as RoteiroFontId)
    : DEFAULT_ROTEIRO_TYPOGRAPHY.font;
  return {font, size: value.size === undefined ? ROTEIRO_FONT_SIZE_DEFAULT : clampRoteiroFontSize(value.size)};
}

export function roteiroTypographyStorageKey(userId: string | null | undefined) {
  return `criaki-roteiro-typography:${userId || 'anon'}`;
}

function readTypography(key: string): RoteiroTypography {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? normalizeRoteiroTypography(JSON.parse(raw)) : DEFAULT_ROTEIRO_TYPOGRAPHY;
  } catch {
    return DEFAULT_ROTEIRO_TYPOGRAPHY;
  }
}

const loadedFonts = new Set<string>();

/** Carrega a fonte do Google Fonts so quando escolhida (display=swap; o PWA ja faz cache desses dominios). */
function ensureFontLoaded(font: RoteiroFontId) {
  const option = ROTEIRO_FONTS.find(item => item.id === font);
  if (!option?.googleFamily || loadedFonts.has(option.id) || typeof document === 'undefined') return;
  loadedFonts.add(option.id);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${option.googleFamily}&display=swap`;
  link.dataset.roteiroFont = option.id;
  document.head.appendChild(link);
}

/** Carrega todas as fontes do roteiro: usado ao abrir a lista, para cada opção aparecer na própria fonte. */
export function preloadRoteiroFonts() {
  ROTEIRO_FONTS.forEach(font => ensureFontLoaded(font.id));
}

const CHANGE_EVENT = 'criaki-roteiro-typography-change';

export function useRoteiroTypography(userId: string | null | undefined) {
  const key = roteiroTypographyStorageKey(userId);
  const [state, setState] = useState<{key: string; value: RoteiroTypography}>(() => ({key, value: readTypography(key)}));
  const value = state.key === key ? state.value : readTypography(key);

  useEffect(() => {
    if (state.key !== key) setState({key, value: readTypography(key)});
  }, [key, state.key]);

  useEffect(() => {
    ensureFontLoaded(value.font);
  }, [value.font]);

  useEffect(() => {
    // Desktop e mobile (ou duas abas) ficam em sincronia.
    const sync = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== key) return;
      if (event instanceof CustomEvent && event.detail !== key) return;
      setState({key, value: readTypography(key)});
    };
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, [key]);

  const update = useCallback((updates: Partial<RoteiroTypography>) => {
    const next = normalizeRoteiroTypography({...readTypography(key), ...updates});
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Sem localStorage: vale so nesta sessao.
    }
    setState({key, value: next});
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, {detail: key}));
  }, [key]);

  return {typography: value, setTypography: update};
}

export function roteiroTypographyStyle(typography: RoteiroTypography): CSSProperties {
  const option = ROTEIRO_FONTS.find(item => item.id === typography.font) ?? ROTEIRO_FONTS[0];
  return {
    '--roteiro-font-family': option.family,
    '--roteiro-font-size': `${clampRoteiroFontSize(typography.size)}px`,
  } as CSSProperties;
}