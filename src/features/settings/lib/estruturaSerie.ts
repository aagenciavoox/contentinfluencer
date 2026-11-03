import type { Content, Serie, Temporada } from '../../../lib/database.ts';
import { filhosDaSerie } from '../../editorial/lib/serieArvore.ts';
import { temporadasDoEscopo } from '../../editorial/lib/temporadas.ts';
import { destinosDeQuadro, ordemFinalNoFim, planoDefinirQuadro, planoDefinirTemporada } from './selecaoEpisodios.ts';
import { episodiosDaPagina } from './seriesLista.ts';

/**
 * Quadros e temporadas da série: o que conta, o que bloqueia e para onde vão os episódios
 * antes de excluir. Só calcula; quem grava é a tela (mover_episodios e depois excluir).
 */

export const ROTULO_SEM_TEMPORADA = 'Sem temporada';

type Vivo = Pick<Content, 'deletedAt'>;
const vivo = (content: Vivo) => !content.deletedAt;

/** Episódios ligados direto ao quadro (os da lixeira não contam). */
export function episodiosDoQuadro<T extends Pick<Content, 'seriesId'> & Vivo>(quadroId: string, contents: readonly T[]): T[] {
  return contents.filter(content => vivo(content) && content.seriesId === quadroId);
}

export function episodiosDaTemporada<T extends Pick<Content, 'temporadaId'> & Vivo>(temporadaId: string, contents: readonly T[]): T[] {
  return contents.filter(content => vivo(content) && content.temporadaId === temporadaId);
}

/** Quadro com sub-quadros não pode ser excluído daqui. */
export function bloqueioAoExcluirQuadro(quadroId: string, series: readonly Pick<Serie, 'id' | 'parentId' | 'name'>[]): string | null {
  const filhos = filhosDaSerie(quadroId, series);
  if (filhos.length === 0) return null;
  return `Este quadro tem ${filhos.length === 1 ? '1 quadro dentro dele' : `${filhos.length} quadros dentro dele`}. Mova ou exclua ${filhos.length === 1 ? 'esse quadro' : 'esses quadros'} antes.`;
}

/** Para onde mandar os episódios do quadro excluído: os outros quadros ativos ou direto na série. */
export function destinosAoExcluirQuadro(
  quadroId: string,
  serieId: string,
  series: readonly Pick<Serie, 'id' | 'parentId' | 'name' | 'ativa'>[],
): Array<{ id: string; label: string }> {
  return destinosDeQuadro(serieId, series).filter(destino => destino.id !== quadroId);
}

/** Outras temporadas do mesmo escopo e "Sem temporada" (id null). */
export function destinosAoExcluirTemporada(
  temporada: Pick<Temporada, 'id' | 'serieId'>,
  temporadas: readonly Temporada[],
): Array<{ id: string | null; label: string }> {
  return [
    ...temporadasDoEscopo(temporada.serieId, temporadas)
      .filter(item => item.id !== temporada.id)
      .map(item => ({ id: item.id as string | null, label: item.nome })),
    { id: null, label: ROTULO_SEM_TEMPORADA },
  ];
}

export type PlanoDeMudanca = {
  /** Episódios já com o vínculo novo (pilar e objetivo herdados recalculados; manuais ficam). */
  conteudos: Content[];
  /** Ordem completa da série, com os movidos no fim; null quando não há ordem a gravar. */
  ordem: string[] | null;
  /** Perdem a temporada porque ela não vale no destino. */
  perdemTemporada: number;
};

/** Mesma regra do "Definir quadro": muda o quadro, mantém a temporada se ainda valer, vai para o fim. */
export function planoAoExcluirQuadro(input: {
  quadroId: string;
  destinoId: string;
  serieId: string;
  series: readonly Serie[];
  temporadas: readonly Temporada[];
  contents: readonly Content[];
  agora: string;
  comOrdem: boolean;
}): PlanoDeMudanca {
  const doQuadro = episodiosDoQuadro(input.quadroId, input.contents);
  const plano = planoDefinirQuadro(doQuadro, input.destinoId, input.series, input.temporadas, input.agora);
  const movidos = new Set(plano.mudam.map(content => content.id));
  const ordem = input.comOrdem && movidos.size > 0
    ? ordemFinalNoFim(episodiosDaPagina(input.serieId, input.series, input.contents), movidos)
    : null;
  return { conteudos: plano.mudam, ordem, perdemTemporada: plano.perdemTemporada.length };
}

/** Só a temporada muda. */
export function planoAoExcluirTemporada(input: {
  temporadaId: string;
  destinoId: string | null;
  contents: readonly Content[];
  agora: string;
}): PlanoDeMudanca {
  const plano = planoDefinirTemporada(episodiosDaTemporada(input.temporadaId, input.contents), input.destinoId, input.agora);
  return { conteudos: plano.mudam, ordem: null, perdemTemporada: 0 };
}

/** Nome repetido entre os quadros da série (ignora o próprio). */
export function nomeDeQuadroRepetido(
  nome: string,
  serieId: string,
  series: readonly Pick<Serie, 'id' | 'parentId' | 'name'>[],
  ignorarId?: string,
): boolean {
  const limpo = nome.trim().toLocaleLowerCase('pt-BR');
  if (!limpo) return false;
  return filhosDaSerie(serieId, series).some(filho => filho.id !== ignorarId && (filho.name ?? '').trim().toLocaleLowerCase('pt-BR') === limpo);
}
