import {readStoredJson, writeStoredJson} from '../../../lib/browserStorage';

const STORAGE_KEY = 'writing_draft_split_ratio';
/** Fração da largura total ocupada pelo rascunho (0–1). */
export const DEFAULT_DRAFT_SPLIT_RATIO = 0.38;
export const MIN_SCRIPT_PANE_PX = 280;
export const MIN_DRAFT_PANE_PX = 260;

type DraftSplitDevice = 'desktop' | 'mobile';

type StoredRatio = {
  /** Legado: uma razão única (migrada para desktop). */
  ratio?: number;
  desktop?: number;
  mobile?: number;
};

function clampStoredRatio(ratio: number): number {
  return Number.isFinite(ratio) ? Math.min(0.7, Math.max(0.2, ratio)) : DEFAULT_DRAFT_SPLIT_RATIO;
}

export function clampDraftSplitRatio(ratio: number, totalWidth: number): number {
  if (!Number.isFinite(ratio) || totalWidth <= 0) return DEFAULT_DRAFT_SPLIT_RATIO;
  const minDraft = Math.min(MIN_DRAFT_PANE_PX / totalWidth, 0.55);
  const maxDraft = Math.max(1 - MIN_SCRIPT_PANE_PX / totalWidth, minDraft);
  return Math.min(maxDraft, Math.max(minDraft, ratio));
}

function deviceKey(isMobile: boolean): DraftSplitDevice {
  return isMobile ? 'mobile' : 'desktop';
}

export function readDraftSplitRatio(isMobile = false): number {
  const stored = readStoredJson<StoredRatio>(STORAGE_KEY, {});
  const key = deviceKey(isMobile);
  const deviceRatio = stored[key];
  if (typeof deviceRatio === 'number') return clampStoredRatio(deviceRatio);
  // Migração: a razão antiga vale como ponto de partida no desktop.
  if (!isMobile && typeof stored.ratio === 'number') return clampStoredRatio(stored.ratio);
  return DEFAULT_DRAFT_SPLIT_RATIO;
}

export function writeDraftSplitRatio(ratio: number, isMobile = false) {
  if (!Number.isFinite(ratio)) return;
  const key = deviceKey(isMobile);
  const stored = readStoredJson<StoredRatio>(STORAGE_KEY, {});
  writeStoredJson(STORAGE_KEY, {
    ...stored,
    [key]: clampStoredRatio(ratio),
  });
}

/** Converte texto legado (sem tags) em HTML mínimo para o editor de rascunho. */
export function writingNotesToHtml(value: string | null | undefined): string {
  const raw = value ?? '';
  if (!raw.trim()) return '';
  if (/<\/?[a-z][\s\S]*>/i.test(raw)) return raw;
  return raw
    .split(/\n{2,}/)
    .map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
}
