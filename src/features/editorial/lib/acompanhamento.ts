import { differenceInCalendarDays, parseISO } from 'date-fns';
import { inteiroNaoNegativo } from '../../../lib/inteiro.ts';
import type { AcompanhamentoSerie, MetaDaSerieNoEscopo } from './continuidadeEscopo.ts';
import { diasDePausa, type PausaEditorial } from './pausas.ts';

/**
 * Acompanhamento da série (entrega 2C). Vale a tabela serie_acompanhamento; a coluna antiga
 * `acompanhar_continuidade` só é lida quando a tabela não veio (migração 20261103120000 ausente).
 */
export type SerieComAcompanhamento = {
  id: string;
  acompanharContinuidade?: boolean;
  acompanhamentos?: readonly AcompanhamentoSerie[];
};

export function acompanhamentoGeral(serie: SerieComAcompanhamento): AcompanhamentoSerie | null {
  return serie.acompanhamentos?.find(item => item.escopo === 'geral') ?? null;
}

/** Entra na Continuidade geral da Saúde. */
export function acompanhaNoGeral(serie: SerieComAcompanhamento): boolean {
  if (!serie.acompanhamentos) return serie.acompanharContinuidade === true;
  return acompanhamentoGeral(serie)?.ativo === true;
}

/** Acompanhamentos por conta ou formato (sem o geral). */
export function acompanhamentosPorEscopo(serie: SerieComAcompanhamento): AcompanhamentoSerie[] {
  return (serie.acompanhamentos ?? []).filter(item => item.escopo !== 'geral');
}

/** Acompanhada em algum escopo: geral, conta ou formato. */
export function serieAcompanhada(serie: SerieComAcompanhamento): boolean {
  if (!serie.acompanhamentos) return serie.acompanharContinuidade === true;
  return serie.acompanhamentos.some(item => item.ativo);
}

/** Liga ou desliga o acompanhamento geral, mantendo a coluna antiga espelhada. */
export function comAcompanhamentoGeral<S extends SerieComAcompanhamento>(serie: S, ativo: boolean, novoId: () => string): S {
  if (!serie.acompanhamentos) return { ...serie, acompanharContinuidade: ativo };
  const geral = acompanhamentoGeral(serie);
  const acompanhamentos: AcompanhamentoSerie[] = geral
    ? serie.acompanhamentos.map(item => (item.id === geral.id ? { ...item, ativo } : item))
    : ativo
      ? [...serie.acompanhamentos, novoAcompanhamento(serie.id, 'geral', null, null, novoId())]
      : [...serie.acompanhamentos];
  return { ...serie, acompanhamentos, acompanharContinuidade: ativo };
}

export function novoAcompanhamento(
  serieId: string,
  escopo: AcompanhamentoSerie['escopo'],
  platformId: string | null,
  formato: string | null,
  id: string,
): AcompanhamentoSerie {
  return {
    id,
    serieId,
    escopo,
    platformId: escopo === 'formato' ? platformId : escopo === 'conta' ? platformId : null,
    formato: escopo === 'formato' ? formato : null,
    ativo: true,
    inicio: null,
    termino: null,
    distanciaMaxDias: null,
    evitarDiasSeguidos: false,
  };
}

/** Mesma chave do índice único: série, escopo, conta e formato. */
export function chaveDoEscopo(item: Pick<AcompanhamentoSerie, 'escopo' | 'platformId' | 'formato'>): string {
  return `${item.escopo}|${item.platformId ?? ''}|${item.formato ?? ''}`;
}

/** Meta da série no mesmo escopo do acompanhamento (conta e/ou formato). */
export function metaDoEscopo(
  metas: readonly MetaDaSerieNoEscopo[] | undefined,
  item: Pick<AcompanhamentoSerie, 'platformId' | 'formato'>,
): MetaDaSerieNoEscopo | null {
  return (metas ?? []).find(meta => (meta.platformId ?? null) === (item.platformId ?? null)
    && (meta.formato ?? null) === (item.formato ?? null)) ?? null;
}

/** Linha do editor por conta ou formato: o acompanhamento e a meta própria (vazia = meta geral). */
export type LinhaDeEscopo = AcompanhamentoSerie & {
  metaVezes: string;
  metaUnidade: MetaDaSerieNoEscopo['unidade'];
  metaAPartirDe: string;
};

/** Conta e formato da série, com a meta do mesmo escopo já no campo (vazio quando usa a geral). */
export function linhasDeEscopo(
  serie: SerieComAcompanhamento & { metasPorEscopo?: readonly MetaDaSerieNoEscopo[] },
): LinhaDeEscopo[] {
  return acompanhamentosPorEscopo(serie).map(item => {
    const meta = metaDoEscopo(serie.metasPorEscopo, item);
    return {
      ...item,
      metaVezes: meta ? String(meta.vezes) : '',
      metaUnidade: meta?.unidade ?? 'semana',
      metaAPartirDe: meta?.aPartirDe ?? '',
    };
  });
}

function camposDaLinha(linha: LinhaDeEscopo) {
  return {
    id: linha.id,
    escopo: linha.escopo,
    platformId: linha.platformId ?? null,
    formato: linha.formato ?? null,
    ativo: linha.ativo,
    inicio: linha.inicio ?? null,
    termino: linha.termino ?? null,
    distanciaMaxDias: linha.distanciaMaxDias ?? null,
    evitarDiasSeguidos: linha.evitarDiasSeguidos,
    metaVezes: linha.metaVezes,
    metaUnidade: linha.metaUnidade,
    metaAPartirDe: linha.metaAPartirDe,
  };
}

/** A ordem entra na comparação: o editor não reordena. */
export function linhasDeEscopoIguais(a: readonly LinhaDeEscopo[], b: readonly LinhaDeEscopo[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((linha, index) => JSON.stringify(camposDaLinha(linha)) === JSON.stringify(camposDaLinha(b[index])));
}

/**
 * Acompanhamentos gravados: os gerais que o chamador já ajustou, mais conta e formato.
 * Meta vazia não vai para a lista de metas — o escopo usa a meta geral.
 */
export function acompanhamentosDosEscopos(
  gerais: readonly AcompanhamentoSerie[],
  linhas: readonly LinhaDeEscopo[],
): AcompanhamentoSerie[] {
  return [
    ...gerais,
    ...linhas.map(linha => ({
      id: linha.id,
      serieId: linha.serieId,
      escopo: linha.escopo,
      platformId: linha.escopo === 'conta' || linha.escopo === 'formato' ? (linha.platformId || null) : null,
      formato: linha.formato,
      ativo: linha.ativo,
      inicio: linha.inicio || null,
      termino: linha.termino || null,
      distanciaMaxDias: linha.distanciaMaxDias,
      evitarDiasSeguidos: linha.evitarDiasSeguidos,
    })),
  ];
}

export function metasDosEscopos(serieId: string, linhas: readonly LinhaDeEscopo[]): MetaDaSerieNoEscopo[] {
  return linhas.flatMap(linha => {
    const quantidade = inteiroNaoNegativo(linha.metaVezes);
    if (quantidade == null || quantidade <= 0) return [];
    return [{
      serieId,
      platformId: linha.platformId || null,
      formato: linha.formato || null,
      vezes: quantidade,
      unidade: linha.metaUnidade,
      aPartirDe: linha.metaAPartirDe || null,
    }];
  });
}

export type CoberturaDaJanelaNoGeral = 'fora' | 'integral' | 'parcial' | 'pausada';

/**
 * Como uma janela entra no acompanhamento geral, com a regra dos escopos: fora do início e do término
 * não conta; cortada por eles ou com alguns dias de pausa é parcial e não vira falta inteira;
 * toda em pausa aparece como pausa.
 */
export function coberturaNoGeral(
  janela: { inicio: string; fim: string },
  geral: Pick<AcompanhamentoSerie, 'inicio' | 'termino'> | null,
  pausas: readonly PausaEditorial[],
  serieIds: ReadonlySet<string>,
): CoberturaDaJanelaNoGeral {
  if (geral?.inicio && janela.fim < geral.inicio) return 'fora';
  if (geral?.termino && janela.inicio > geral.termino) return 'fora';
  const total = differenceInCalendarDays(parseISO(janela.fim), parseISO(janela.inicio)) + 1;
  const pausados = pausas.length > 0 ? diasDePausa(pausas, { tipo: 'serie', serieIds }, janela).length : 0;
  if (pausados >= total) return 'pausada';
  const cortada = Boolean((geral?.inicio && geral.inicio > janela.inicio) || (geral?.termino && geral.termino < janela.fim));
  return pausados > 0 || cortada ? 'parcial' : 'integral';
}

/** A série e as de cima: pausa da série vale para os quadros dela. */
export function idsComAncestrais(serieId: string, series: readonly { id: string; parentId?: string | null }[]): Set<string> {
  const ids = new Set([serieId]);
  let atual = series.find(item => item.id === serieId);
  for (let passo = 0; atual?.parentId && passo < 6; passo += 1) {
    ids.add(atual.parentId);
    atual = series.find(item => item.id === atual!.parentId);
  }
  return ids;
}
