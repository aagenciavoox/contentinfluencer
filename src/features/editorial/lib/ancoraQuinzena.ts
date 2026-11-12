import type { Serie, Temporada } from '../../../lib/database.ts';
import type { MetaDaSerieNoEscopo } from './continuidadeEscopo.ts';
import { semanaDe } from './periodoEditorial.ts';

/**
 * Âncora da meta a cada 14 dias sem data de início (decisão da Anne, 11/11):
 * a segunda-feira da semana em que a meta foi ativada pela primeira vez.
 * Fica fixa: trocar o período na tela, desligar e religar o acompanhamento ou mudar a quantidade
 * não mexem nela. Com data de início, os ciclos seguem a data e a âncora só fica guardada.
 */

const DIA = /^\d{4}-\d{2}-\d{2}$/;

function dia(valor: string | null | undefined): string | null {
  const limpo = valor?.slice(0, 10) ?? '';
  return DIA.test(limpo) ? limpo : null;
}

export function ancoraDaQuinzena(
  meta: { vezes: number | null | undefined; unidade: string | null | undefined; aPartirDe: string | null | undefined },
  ancoraAtual: string | null | undefined,
  hoje: string,
): string | null {
  const atual = dia(ancoraAtual);
  if (atual) return atual;
  const ativa = typeof meta.vezes === 'number' && meta.vezes > 0 && meta.unidade === 'quinzena';
  if (!ativa || dia(meta.aPartirDe)) return null;
  return semanaDe(hoje).inicio;
}

function chaveDaMeta(meta: Pick<MetaDaSerieNoEscopo, 'platformId' | 'formato'>): string {
  return `${meta.platformId ?? ''}\u0000${meta.formato ?? ''}`;
}

/** Série a gravar com a âncora da meta geral e das metas por conta ou formato. */
export function comAncoraNaSerie<S extends Pick<Serie, 'frequenciaVezes' | 'frequenciaUnidade' | 'frequenciaAPartirDe' | 'frequenciaAncora' | 'metasPorEscopo'>>(
  serie: S,
  anterior: Pick<Serie, 'frequenciaAncora' | 'metasPorEscopo'> | null | undefined,
  hoje: string,
): S {
  const ancora = ancoraDaQuinzena(
    { vezes: serie.frequenciaVezes, unidade: serie.frequenciaUnidade, aPartirDe: serie.frequenciaAPartirDe },
    serie.frequenciaAncora ?? anterior?.frequenciaAncora,
    hoje,
  );
  const anteriores = new Map((anterior?.metasPorEscopo ?? []).map(meta => [chaveDaMeta(meta), meta.ancora ?? null]));
  const metasPorEscopo = serie.metasPorEscopo?.map(meta => {
    const daMeta = ancoraDaQuinzena(meta, meta.ancora ?? anteriores.get(chaveDaMeta(meta)), hoje);
    return daMeta ? { ...meta, ancora: daMeta } : meta;
  });
  return {
    ...serie,
    ...(ancora ? { frequenciaAncora: ancora } : {}),
    ...(metasPorEscopo ? { metasPorEscopo } : {}),
  };
}

/** Temporada (wave) a gravar com a âncora da meta dela. */
export function comAncoraNaTemporada<T extends Pick<Temporada, 'frequenciaVezes' | 'frequenciaUnidade' | 'frequenciaAPartirDe' | 'frequenciaAncora'>>(
  temporada: T,
  anterior: Pick<Temporada, 'frequenciaAncora'> | null | undefined,
  hoje: string,
): T {
  const ancora = ancoraDaQuinzena(
    { vezes: temporada.frequenciaVezes, unidade: temporada.frequenciaUnidade, aPartirDe: temporada.frequenciaAPartirDe },
    temporada.frequenciaAncora ?? anterior?.frequenciaAncora,
    hoje,
  );
  return ancora ? { ...temporada, frequenciaAncora: ancora } : temporada;
}
