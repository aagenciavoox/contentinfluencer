import type {Serie} from '../../../lib/database';
import {PILAR_PRESET_CORES, normalizeEntityColor} from './pilarConstants.ts';

type SerieColorSource = Pick<Serie, 'id' | 'cor' | 'createdAt'>;

export function serieColorKey(color: string | null | undefined): string | null {
  const normalized = normalizeEntityColor(color || '');
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : null;
}

export function takenSerieColorKeys(
  series: readonly Pick<Serie, 'id' | 'cor'>[],
  exceptId?: string | null,
): Set<string> {
  const taken = new Set<string>();
  for (const serie of series) {
    if (exceptId && serie.id === exceptId) continue;
    const key = serieColorKey(serie.cor);
    if (key) taken.add(key);
  }
  return taken;
}

function colorFromHue(hue: number): string {
  const saturation = 0.62;
  const lightness = 0.46;
  const chroma = saturation * Math.min(lightness, 1 - lightness);
  const channel = (offset: number) => {
    const position = (offset + hue / 30) % 12;
    const value = lightness - chroma * Math.max(Math.min(position - 3, 9 - position, 1), -1);
    return Math.round(255 * value).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
}

export function nextFreeSerieColor(
  series: readonly Pick<Serie, 'id' | 'cor'>[],
  exceptId?: string | null,
): string {
  const taken = takenSerieColorKeys(series, exceptId);
  for (const preset of PILAR_PRESET_CORES) {
    const key = serieColorKey(preset);
    if (key && !taken.has(key)) return key;
  }
  for (let step = 0; step < 360; step += 1) {
    const color = colorFromHue((step * 47) % 360);
    if (!taken.has(color)) return color;
  }
  return '#111111';
}

export function isSerieColorTaken(
  series: readonly Pick<Serie, 'id' | 'cor'>[],
  color: string | null | undefined,
  exceptId?: string | null,
): boolean {
  const key = serieColorKey(color);
  if (!key) return true;
  return takenSerieColorKeys(series, exceptId).has(key);
}

/** Mantém a cor da série mais antiga e troca as repetidas ou sem cor. */
export function seriesNeedingUniqueColors<T extends SerieColorSource>(series: readonly T[]): T[] {
  const ordered = [...series].sort((left, right) => {
    const byDate = left.createdAt.localeCompare(right.createdAt);
    return byDate || left.id.localeCompare(right.id);
  });
  const used = new Set<string>();
  const changes: T[] = [];
  for (const serie of ordered) {
    const key = serieColorKey(serie.cor);
    if (key && !used.has(key)) {
      used.add(key);
      continue;
    }
    const assigned = nextFreeFrom(used);
    used.add(assigned);
    if (serie.cor !== assigned) changes.push({...serie, cor: assigned});
  }
  return changes;
}

function nextFreeFrom(taken: Set<string>): string {
  for (const preset of PILAR_PRESET_CORES) {
    const key = serieColorKey(preset);
    if (key && !taken.has(key)) return key;
  }
  for (let step = 0; step < 360; step += 1) {
    const color = colorFromHue((step * 47) % 360);
    if (!taken.has(color)) return color;
  }
  return '#111111';
}
