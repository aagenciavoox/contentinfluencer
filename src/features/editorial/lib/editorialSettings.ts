import type { FuncaoEditorial } from '../../../lib/database.ts';
import { FUNCOES } from './funcoes.ts';

export const EDITORIAL_SETTINGS_PREFERENCE_KEY = 'editorial_settings';

export interface EditorialSettings {
  /** Na tela Séries, permite criar uma série só com nome e cor. */
  quickSeriesCreate: boolean;
  /** Mostra quando uma série ainda tem informações em aberto. */
  openInfoNotices: boolean;
  /** UUID da plataforma cuja data entra na grade. */
  redeReferenciaId: string | null;
  /** UUIDs. "Onde você pretende publicar?" já vem marcado. */
  destinosPadrao: string[];
  /** Percentuais por função. A soma fecha em 100. Null enquanto não houver distribuição. */
  distribuicaoFuncoes: Record<FuncaoEditorial, number> | null;
  /** Reserva desejada. Vazio não inventa um alvo. */
  estoqueDesejado: number | null;
}

export const DEFAULT_EDITORIAL_SETTINGS: EditorialSettings = {
  quickSeriesCreate: true,
  openInfoNotices: true,
  redeReferenciaId: null,
  destinosPadrao: [],
  distribuicaoFuncoes: null,
  estoqueDesejado: null,
};

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function readIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.map(readId).filter((id): id is string => Boolean(id));
  return [...new Set(ids)];
}


function readDistribuicao(value: unknown): Record<FuncaoEditorial, number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const result = {} as Record<FuncaoEditorial, number>;
  for (const funcao of FUNCOES) {
    const item = raw[funcao];
    if (typeof item !== 'number' || !Number.isInteger(item) || item < 0 || item > 100) return null;
    result[funcao] = item;
  }
  return result;
}

function readEstoqueDesejado(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null;
  return value;
}

export function getEditorialSettings(
  preferences: Record<string, unknown> | null | undefined,
): EditorialSettings {
  const raw = preferences?.[EDITORIAL_SETTINGS_PREFERENCE_KEY];
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_EDITORIAL_SETTINGS;
  }

  const saved = raw as Partial<Record<keyof EditorialSettings, unknown>>;

  return {
    quickSeriesCreate: readBoolean(saved.quickSeriesCreate, DEFAULT_EDITORIAL_SETTINGS.quickSeriesCreate),
    openInfoNotices: readBoolean(saved.openInfoNotices, DEFAULT_EDITORIAL_SETTINGS.openInfoNotices),
    redeReferenciaId: readId(saved.redeReferenciaId),
    destinosPadrao: readIdList(saved.destinosPadrao),
    distribuicaoFuncoes: readDistribuicao(saved.distribuicaoFuncoes),
    estoqueDesejado: readEstoqueDesejado(saved.estoqueDesejado),
  };
}