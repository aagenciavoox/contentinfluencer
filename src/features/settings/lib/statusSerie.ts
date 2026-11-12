import type { Serie, StatusSerie } from '../../../lib/database';
import { vezesNaRegraDeOuro } from '../../editorial/lib/regraDeOuro.ts';

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

/**
 * Série e quadro podem ficar em rascunho: cadastrados e editáveis, sugeridos em "Ver o que encaixa",
 * mas sem cobrança de frequência até ficarem ativos. Família só agrupa.
 */
export function podeSerRascunho(serie: Pick<Serie, 'tipoAgrupamento' | 'parentId'>): boolean {
  return serie.tipoAgrupamento !== 'familia';
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
  if (unidade === 'bimestre') return arredondar(vezes / (SEMANAS_NO_MES * 2));
  if (unidade === 'trimestre') return arredondar(vezes / (SEMANAS_NO_MES * 3));
  if (unidade === 'semestre') return arredondar(vezes / (SEMANAS_NO_MES * 6));
  return null;
}

/**
 * Aviso ao ativar: quanto a série passa a pedir neste mês, já com a Regra de Ouro
 * (até 1 por semana; família, uma por série ativa). Quadro é sob demanda e não pede nada.
 */
export function textoDaAtivacao(
  serie: Pick<Serie, 'name' | 'frequenciaVezes' | 'frequenciaUnidade'>,
  opcoes: { quadro?: boolean; unidades?: number } = {},
): string {
  const nome = serie.name.trim() || (opcoes.quadro ? 'O quadro' : 'A série');
  if (opcoes.quadro) return `${nome} fica sob demanda: não tem meta semanal e não soma no limite da semana.`;
  const porSemana = roteirosPorSemana({
    frequenciaVezes: vezesNaRegraDeOuro(serie.frequenciaVezes, serie.frequenciaUnidade || 'semana', opcoes.unidades ?? 1) ?? null,
    frequenciaUnidade: serie.frequenciaUnidade,
  });
  if (porSemana == null) return `${nome} entra na Saúde, mas ainda sem ritmo: não vai pedir roteiros por semana.`;
  const numero = String(porSemana).replace('.', ',');
  return `${nome} vai pedir ${numero} ${porSemana === 1 ? 'roteiro' : 'roteiros'} por semana neste mês.`;
}
