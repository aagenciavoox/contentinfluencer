import { readStoredJson, writeStoredJson } from './browserStorage';

export type AppTheme = 'light' | 'dark';

/** Mesma chave lida pelo script do index.html, que aplica o tema antes do React montar. */
const THEME_STORAGE_KEY = 'criaki-theme';

export function isAppTheme(value: unknown): value is AppTheme {
  return value === 'light' || value === 'dark';
}

export function readStoredTheme(): AppTheme | null {
  const stored = readStoredJson<unknown>(THEME_STORAGE_KEY, null);
  return isAppTheme(stored) ? stored : null;
}

export function writeStoredTheme(theme: AppTheme): void {
  writeStoredJson(THEME_STORAGE_KEY, theme);
}
