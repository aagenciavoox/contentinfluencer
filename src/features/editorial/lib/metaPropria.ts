import { acompanhaNoGeral } from './acompanhamento.ts';
import { situacaoDaFrequencia, type ExclusaoDaApuracao, type SerieDaApuracao } from './apuracaoSerie.ts';
import { ritmoProprioDaOnda } from './metaDaOnda.ts';
import { idsDaSubarvore } from './serieArvore.ts';

/** Wave vista pela apuração: só o que decide se ela anda no próprio ritmo. */
export type OndaDaExclusao = {
  id: string;
  serieId: string;
  acompanhar?: boolean;
  ritmoProprio?: boolean | null;
  frequenciaVezes?: number | null;
  /** Wave em rascunho não conta na série. */
  status?: 'rascunho' | 'ativa' | 'arquivada';
};

function ehQuadro(serie: SerieDaApuracao): boolean {
  if (serie.tipoAgrupamento) return serie.tipoAgrupamento === 'quadro';
  return Boolean(serie.parentId);
}

/** Quadro acompanhado no geral com meta definida: conta só na linha dele. */
export function quadroComMetaPropria(serie: SerieDaApuracao): boolean {
  return serie.ativa !== false
    && ehQuadro(serie)
    && acompanhaNoGeral(serie)
    && situacaoDaFrequencia(serie).tipo === 'definida';
}

/** Estado inicial da caixa "Ritmo próprio" no modal da wave: ligado, a não ser que tenha sido desmarcado. */
export function ritmoProprioMarcado(onda: { ritmoProprio?: boolean | null }): boolean {
  return onda.ritmoProprio !== false;
}

/** Wave acompanhada, com meta e ritmo próprio: os episódios dela contam só na linha dela. */
export function ondaComRitmoProprio(onda: OndaDaExclusao): boolean {
  return onda.acompanhar === true && ritmoProprioDaOnda(onda);
}

/**
 * O que sai da conta da série: quadros abaixo dela com meta própria (com os filhos),
 * waves com ritmo próprio e waves em rascunho. Assim o mesmo episódio não é cobrado duas vezes.
 */
export function exclusaoDeMetaPropria(
  serie: SerieDaApuracao,
  series: readonly SerieDaApuracao[],
  temporadas: readonly OndaDaExclusao[] = [],
): ExclusaoDaApuracao {
  const serieIds = new Set<string>();
  for (const id of idsDaSubarvore(serie.id, series)) {
    if (id === serie.id) continue;
    const quadro = series.find(item => item.id === id);
    if (quadro && quadroComMetaPropria(quadro)) serieIds.add(id);
  }
  const temporadaIds = new Set(temporadas
    .filter(onda => ondaComRitmoProprio(onda) || onda.status === 'rascunho')
    .map(onda => onda.id));
  return { serieIds, temporadaIds };
}
