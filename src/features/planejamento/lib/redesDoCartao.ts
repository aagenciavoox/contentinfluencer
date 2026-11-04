import type {Content, ContentPlataforma, RedeSocial} from '../../../lib/database.ts';
import {redeDaRef, type ContaRef, type RedeDoFiltro} from '../../contas/lib/contas.ts';
import {redeDoFiltro} from '../../creation/lib/creationRedeFilter.ts';
import {formatoDaPublicacao} from '../../editorial/lib/publicacoes.ts';
import {normalizarRedesPostIt} from './redesPostIt.ts';

type ConteudoParaRedes = {
  plataformas?: readonly (Pick<ContentPlataforma, 'platformId'> & Partial<Pick<ContentPlataforma, 'formatoPublicacao'>>)[] | null;
} & Partial<Pick<Content, 'formatoVisual' | 'writingMode'>>;

/** Redes das publicações do conteúdo, pela conta de cada uma. Conta sem rede conhecida fica de fora. */
export function redesDoConteudo(
  content: ConteudoParaRedes | null | undefined,
  contas: readonly ContaRef[],
): RedeDoFiltro[] {
  if (!content?.plataformas?.length) return [];
  const vistas = new Set<RedeDoFiltro>();
  for (const item of content.plataformas) {
    const rede = redeDaRef(item.platformId, contas);
    if (!rede) continue;
    const formato = (rede === 'youtube' || rede === 'instagram' || rede === 'tiktok')
      ? formatoDaPublicacao(
        {formatoVisual: content.formatoVisual ?? null, writingMode: content.writingMode},
        rede,
        item,
      )
      : null;
    vistas.add(redeDoFiltro(rede, formato));
  }
  return normalizarRedesPostIt([...vistas]);
}

/** O que o cartão mostra: as redes do conteúdo; sem nenhuma, as anotadas no post-it. */
export function redesDoCartao(input: {
  content?: ConteudoParaRedes | null;
  postIt?: {redes?: readonly RedeDoFiltro[] | null} | null;
  contas: readonly ContaRef[];
}): RedeDoFiltro[] {
  const doConteudo = redesDoConteudo(input.content, input.contas);
  if (doConteudo.length > 0) return doConteudo;
  return normalizarRedesPostIt(input.postIt?.redes ?? []);
}
