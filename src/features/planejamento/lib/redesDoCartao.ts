import type {RedeSocial} from '../../../lib/database.ts';
import {redeDaRef, type ContaRef} from '../../contas/lib/contas.ts';
import {normalizarRedesPostIt} from './redesPostIt.ts';

/** Redes das publicações do conteúdo, pela conta de cada uma. Conta sem rede conhecida fica de fora. */
export function redesDoConteudo(
  content: {plataformas?: readonly {platformId: string}[] | null} | null | undefined,
  contas: readonly ContaRef[],
): RedeSocial[] {
  if (!content?.plataformas?.length) return [];
  return normalizarRedesPostIt(content.plataformas.map(item => redeDaRef(item.platformId, contas)));
}

/** O que o cartão mostra: as redes do conteúdo; sem nenhuma, as anotadas no post-it. */
export function redesDoCartao(input: {
  content: {plataformas?: readonly {platformId: string}[] | null} | null | undefined;
  postIt?: {redes?: readonly RedeSocial[] | null} | null;
  contas: readonly ContaRef[];
}): RedeSocial[] {
  const doConteudo = redesDoConteudo(input.content, input.contas);
  if (doConteudo.length > 0) return doConteudo;
  return normalizarRedesPostIt(input.postIt?.redes ?? []);
}
