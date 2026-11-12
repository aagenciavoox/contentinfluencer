import type { ExclusaoDaApuracao, SerieDaApuracao } from './apuracaoSerie.ts';
import { ritmoProprioDaOnda } from './metaDaOnda.ts';
import { quadrosDaSubarvore } from './regraDeOuro.ts';

/** Wave vista pela apuração: só o que decide se ela anda no próprio ritmo. */
export type OndaDaExclusao = {
  id: string;
  serieId: string;
  acompanhar?: boolean;
  ritmoProprio?: boolean | null;
  frequenciaVezes?: number | null;
  /** Wave em rascunho não conta na série. */
  status?: 'rascunho' | 'ativa' | 'arquivada';
  /** Dia do arquivo: do dia em diante, os episódios voltam para a série. */
  arquivadaEm?: string | null;
};

/** Estado inicial da caixa "Ritmo próprio" no modal da wave: ligado, a não ser que tenha sido desmarcado. */
export function ritmoProprioMarcado(onda: { ritmoProprio?: boolean | null }): boolean {
  return onda.ritmoProprio !== false;
}

/** Wave acompanhada, com meta e ritmo próprio: os episódios dela contam só na linha dela. */
export function ondaComRitmoProprio(onda: OndaDaExclusao): boolean {
  return onda.acompanhar === true && ritmoProprioDaOnda(onda);
}

/**
 * O que sai da conta da série: os quadros abaixo dela (sob demanda, com os filhos),
 * waves com ritmo próprio e waves em rascunho. Assim o mesmo episódio não é cobrado duas vezes.
 */
export function exclusaoDeMetaPropria(
  serie: SerieDaApuracao,
  series: readonly SerieDaApuracao[],
  temporadas: readonly OndaDaExclusao[] = [],
): ExclusaoDaApuracao {
  const serieIds = quadrosDaSubarvore(serie.id, series);
  const temporadaIds = new Set(temporadas
    .filter(onda => ondaComRitmoProprio(onda) || onda.status === 'rascunho')
    .map(onda => onda.id));
  // Arquivada com data: o ritmo próprio vale até a véspera do arquivo. Sem data (antiga), fica como era.
  const temporadaAte = new Map<string, string>();
  for (const onda of temporadas) {
    if (onda.status === 'arquivada' && onda.arquivadaEm && temporadaIds.has(onda.id)) temporadaAte.set(onda.id, onda.arquivadaEm);
  }
  return { serieIds, temporadaIds, temporadaAte };
}

/**
 * Família com ritmo: conta os episódios únicos das séries dela. Wave com ritmo próprio também
 * conta aqui (a família é a soma); o rascunho fica fora, e os quadros (sob demanda) também.
 */
export function exclusaoDaFamilia(
  temporadas: readonly OndaDaExclusao[] = [],
  familia?: Pick<SerieDaApuracao, 'id'> | null,
  series: readonly SerieDaApuracao[] = [],
): ExclusaoDaApuracao {
  return {
    serieIds: familia ? quadrosDaSubarvore(familia.id, series) : new Set<string>(),
    temporadaIds: new Set(temporadas.filter(onda => onda.status === 'rascunho').map(onda => onda.id)),
  };
}
