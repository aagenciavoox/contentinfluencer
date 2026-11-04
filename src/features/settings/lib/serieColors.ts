import type {Serie} from '../../../lib/database';
import {PILAR_PRESET_CORES, normalizeEntityColor} from './pilarConstants.ts';

type SerieColorSource = Pick<Serie, 'id' | 'cor' | 'createdAt'> & Partial<Pick<Serie, 'usaCorDaSerie'>>;
type SerieComCor = Pick<Serie, 'id' | 'cor'> & Partial<Pick<Serie, 'usaCorDaSerie' | 'parentId'>>;

/**
 * Cor que aparece na tela: quadro com "Usar da série" usa a cor da série na hora
 * (subindo se a série também usa a de cima). Sem série, a cor gravada.
 */
export function corDaSerie(serie: SerieComCor | null | undefined, series: readonly SerieComCor[]): string {
  let atual = serie ?? null;
  for (let passo = 0; atual && atual.usaCorDaSerie && atual.parentId && passo < 6; passo += 1) {
    const pai = series.find(item => item.id === atual!.parentId);
    if (!pai) break;
    atual = pai;
  }
  return atual?.cor ?? serie?.cor ?? '';
}

export function serieColorKey(color: string | null | undefined): string | null {
  const normalized = normalizeEntityColor(color || '');
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : null;
}

export function takenSerieColorKeys(
  series: readonly SerieComCor[],
  exceptId?: string | null,
): Set<string> {
  const taken = new Set<string>();
  for (const serie of series) {
    if (exceptId && serie.id === exceptId) continue;
    // Quadro com "Usar da série" não ocupa cor: a cor é da série.
    if (serie.usaCorDaSerie) continue;
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

/** Quadros com "Usar da série" recebem a cor atual da série (a gravada fica igual, sem ocupar cor). */
export function comCoresDaSerie<S extends SerieComCor>(series: readonly S[]): S[] {
  if (!series.some(serie => serie.usaCorDaSerie)) return [...series];
  return series.map(serie => {
    if (!serie.usaCorDaSerie) return serie;
    const cor = corDaSerie(serie, series);
    return cor && cor !== serie.cor ? { ...serie, cor } : serie;
  });
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
    if (serie.usaCorDaSerie) continue;
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
