import { useMediaQuery } from './useMediaQuery';
import type { AppTheme, ResolvedTheme } from '../lib/themeStorage';

/** Tema aplicado na tela: a escolha da pessoa, ou o do sistema quando ela escolheu "Sistema". */
export function useResolvedTheme(theme: AppTheme): ResolvedTheme {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}
