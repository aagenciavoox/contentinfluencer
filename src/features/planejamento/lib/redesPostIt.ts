import type {RedeSocial} from '../../../lib/database.ts';

/** Ordem fixa das redes no post-it. Só a plataforma: conta, formato e horário ficam para depois. */
export const REDES_DO_POSTIT: readonly RedeSocial[] = ['instagram', 'tiktok', 'youtube', 'blog', 'outra'];

/** Lê `redes` do banco ou do MCP: só valores conhecidos, sem repetir, na ordem fixa. */
export function normalizarRedesPostIt(value: unknown): RedeSocial[] {
  if (!Array.isArray(value)) return [];
  const escolhidas = new Set(
    value
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim().toLowerCase()),
  );
  return REDES_DO_POSTIT.filter(rede => escolhidas.has(rede));
}

/** Mesmas redes, sem olhar a ordem. */
export function mesmasRedes(a: readonly RedeSocial[] | null | undefined, b: readonly RedeSocial[] | null | undefined): boolean {
  const x = normalizarRedesPostIt(a ?? []);
  const y = normalizarRedesPostIt(b ?? []);
  return x.length === y.length && x.every((rede, index) => rede === y[index]);
}

/** O post-it rápido só pede a nota. */
export function postItRapidoPodeSalvar(input: {texto: string}): boolean {
  return input.texto.trim().length > 0;
}
