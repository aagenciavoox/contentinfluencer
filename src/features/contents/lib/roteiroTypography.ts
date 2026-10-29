import {useCallback, useEffect, useRef, useState, type CSSProperties} from 'react';

/** Fonte e tamanho do texto do roteiro — preferência da conta (vale em todos os roteiros). */
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

/** Chave em user_preferences — tipografia compartilhada por todos os roteiros. */
export const ROTEIRO_TYPOGRAPHY_PREFERENCE_KEY = 'roteiro_typography';

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

export function readLocalRoteiroTypography(key: string): RoteiroTypography {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? normalizeRoteiroTypography(JSON.parse(raw)) : DEFAULT_ROTEIRO_TYPOGRAPHY;
  } catch {
    return DEFAULT_ROTEIRO_TYPOGRAPHY;
  }
}

export function writeLocalRoteiroTypography(key: string, value: RoteiroTypography) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sem localStorage: a preferência da conta ainda vale nesta sessão.
  }
}

export function isDefaultRoteiroTypography(value: RoteiroTypography) {
  return value.font === DEFAULT_ROTEIRO_TYPOGRAPHY.font
    && value.size === DEFAULT_ROTEIRO_TYPOGRAPHY.size;
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

export type RoteiroTypographyStore = {
  preferences: Record<string, unknown>;
  setPreference: (value: RoteiroTypography) => void;
};

/**
 * Tipografia do roteiro: preferência da conta (todos os roteiros) com espelho em
 * localStorage. Use `useRoteiroTypography` (hook com AppContext) nos componentes.
 */
export function useRoteiroTypographyState(
  userId: string | null | undefined,
  store: RoteiroTypographyStore,
) {
  const storageKey = roteiroTypographyStorageKey(userId);
  const preferences = store.preferences;
  const hasPreference = Object.prototype.hasOwnProperty.call(
    preferences,
    ROTEIRO_TYPOGRAPHY_PREFERENCE_KEY,
  );
  const preferenceValue = hasPreference
    ? normalizeRoteiroTypography(preferences[ROTEIRO_TYPOGRAPHY_PREFERENCE_KEY])
    : null;

  const [localValue, setLocalValue] = useState(() => readLocalRoteiroTypography(storageKey));
  const migratedRef = useRef(false);
  const setPreference = store.setPreference;

  useEffect(() => {
    setLocalValue(readLocalRoteiroTypography(storageKey));
    migratedRef.current = false;
  }, [storageKey]);

  // Migra escolha antiga do aparelho para a preferência da conta (uma vez).
  useEffect(() => {
    if (migratedRef.current || hasPreference) return;
    migratedRef.current = true;
    const local = readLocalRoteiroTypography(storageKey);
    if (isDefaultRoteiroTypography(local)) return;
    setPreference(local);
  }, [hasPreference, setPreference, storageKey]);

  const value = preferenceValue ?? localValue;

  useEffect(() => {
    ensureFontLoaded(value.font);
  }, [value.font]);

  const update = useCallback((updates: Partial<RoteiroTypography>) => {
    const base = preferenceValue ?? readLocalRoteiroTypography(storageKey);
    const next = normalizeRoteiroTypography({...base, ...updates});
    writeLocalRoteiroTypography(storageKey, next);
    setLocalValue(next);
    setPreference(next);
  }, [preferenceValue, setPreference, storageKey]);

  return {typography: value, setTypography: update};
}

export function roteiroTypographyStyle(typography: RoteiroTypography): CSSProperties {
  const option = ROTEIRO_FONTS.find(item => item.id === typography.font) ?? ROTEIRO_FONTS[0];
  return {
    '--roteiro-font-family': option.family,
    '--roteiro-font-size': `${clampRoteiroFontSize(typography.size)}px`,
  } as CSSProperties;
}
