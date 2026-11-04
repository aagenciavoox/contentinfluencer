import { readStoredJson, writeStoredJson } from './browserStorage';

/** Escolha da pessoa: claro, escuro ou acompanhar o sistema operacional. */
export type AppTheme = 'light' | 'dark' | 'system';

/** O que de fato vai para `data-theme`. */
export type ResolvedTheme = 'light' | 'dark';

/** Mesma chave lida pelo script do index.html, que aplica o tema antes do React montar. */
const THEME_STORAGE_KEY = 'criaki-theme';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export function isAppTheme(value: unknown): value is AppTheme {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readStoredTheme(): AppTheme | null {
  const stored = readStoredJson<unknown>(THEME_STORAGE_KEY, null);
  return isAppTheme(stored) ? stored : null;
}

export function writeStoredTheme(theme: AppTheme): void {
  writeStoredJson(THEME_STORAGE_KEY, theme);
}

export function systemThemeQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(DARK_SCHEME_QUERY);
}

/** Traduz a escolha no tema aplicado; `system` segue o sistema operacional neste momento. */
export function resolveAppTheme(theme: AppTheme): ResolvedTheme {
  if (theme !== 'system') return theme;
  return systemThemeQuery()?.matches ? 'dark' : 'light';
}
