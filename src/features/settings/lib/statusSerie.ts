import type { Serie, StatusSerie } from '../../../lib/database';

export type { StatusSerie };

export const STATUS_SERIE: readonly StatusSerie[] = ['rascunho', 'ativa', 'arquivada'];

export const ROTULO_STATUS: Record<StatusSerie, string> = {
  rascunho: 'Rascunho',
  ativa: 'Ativa',
  arquivada: 'Arquivada',
};

export function lerStatusSerie(value: unknown): StatusSerie | null {
  return value === 'rascunho' || value === 'ativa' || value === 'arquivada' ? value : null;
}

/** Status de uma série. Banco antigo sem a coluna: deduz pelo `ativa`. */
export function statusDaSerie(serie: { status?: StatusSerie | null; ativa?: boolean | null }): StatusSerie {
  return serie.status ?? (serie.ativa === false ? 'arquivada' : 'ativa');
}

/** Status de uma wave. Sem a coluna, a wave está ativa. */
export function statusDaOnda(onda: { status?: StatusSerie | null }): StatusSerie {
  return onda.status ?? 'ativa';
}

export function emRascunho(item: { status?: StatusSerie | null }): boolean {
  return item.status === 'rascunho';
}

/** Quadro não fica em rascunho: quem fica é a série de cima. */
export function podeSerRascunho(serie: Pick<Serie, 'tipoAgrupamento' | 'parentId'>): boolean {
  if (serie.tipoAgrupamento) return serie.tipoAgrupamento !== 'quadro';
  return !serie.parentId;
}

/** Troca o status e mantém `ativa` coerente (ativa = status 'ativa'). */
export function comStatus<T extends { status?: StatusSerie | null; ativa: boolean }>(serie: T, status: StatusSerie): T {
  return { ...serie, status, ativa: status === 'ativa' };
}

const SEMANAS_NO_MES = 30 / 7;

function arredondar(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/** Roteiros por semana que a meta da série pede. Null = sem meta. */
export function roteirosPorSemana(serie: Pick<Serie, 'frequenciaVezes' | 'frequenciaUnidade'>): number | null {
  const vezes = serie.frequenciaVezes;
  if (!vezes || vezes <= 0) return null;
  const unidade = serie.frequenciaUnidade || 'semana';
  if (unidade === 'semana') return vezes;
  if (unidade === 'quinzena') return arredondar(vezes / 2);
  if (unidade === 'mes') return arredondar(vezes / SEMANAS_NO_MES);
  return null;
}

/** Aviso ao ativar: quanto a série passa a pedir neste mês. */
export function textoDaAtivacao(serie: Pick<Serie, 'name' | 'frequenciaVezes' | 'frequenciaUnidade'>): string {
  const nome = serie.name.trim() || 'A série';
  const porSemana = roteirosPorSemana(serie);
  if (porSemana == null) return `${nome} entra na Saúde, mas ainda sem ritmo: não vai pedir roteiros por semana.`;
  const numero = String(porSemana).replace('.', ',');
  return `${nome} vai pedir ${numero} ${porSemana === 1 ? 'roteiro' : 'roteiros'} por semana neste mês.`;
}
