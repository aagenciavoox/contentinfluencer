import type {RedeSocial} from '../../../lib/database.ts';
import type {RedeDoFiltro} from '../../contas/lib/contas.ts';

/** Ordem fixa das redes no post-it: inclui YouTube Shorts e vídeo longo como escolhas distintas. */
export const REDES_DO_POSTIT: readonly RedeDoFiltro[] = [
  'instagram', 'instagram-video', 'instagram-carrossel',
  'tiktok', 'tiktok-video', 'tiktok-carrossel',
  'youtube', 'youtube-shorts', 'blog', 'outra',
];

/** Lê `redes` do banco ou do MCP: só valores conhecidos, sem repetir, na ordem fixa. */
export function normalizarRedesPostIt(value: unknown): RedeDoFiltro[] {
  if (!Array.isArray(value)) return [];
  const escolhidas = new Set(
    value
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim().toLowerCase()),
  );
  return REDES_DO_POSTIT.filter(rede => escolhidas.has(rede));
}

/** Mesmas redes, sem olhar a ordem. */
export function mesmasRedes(a: readonly RedeDoFiltro[] | null | undefined, b: readonly RedeDoFiltro[] | null | undefined): boolean {
  const x = normalizarRedesPostIt(a ?? []);
  const y = normalizarRedesPostIt(b ?? []);
  return x.length === y.length && x.every((rede, index) => rede === y[index]);
}

/** O post-it rápido só pede a nota. */
export function postItRapidoPodeSalvar(input: {texto: string}): boolean {
  return input.texto.trim().length > 0;
}
