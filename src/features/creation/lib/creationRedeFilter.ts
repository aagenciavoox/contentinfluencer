import type {RedeSocial} from '../../../lib/database.ts';
import {contasAtivas, redeDaConta, redeDaRef, type ContaRef} from '../../contas/lib/contas.ts';
import {normalizarRedesPostIt} from '../../planejamento/lib/redesPostIt.ts';

/** Query param do filtro de rede na tela Criação: uma ou mais redes, separadas por vírgula. */
export const REDE_FILTER_PARAM = 'rede';

/** Lê `?rede=instagram,tiktok`: só redes conhecidas, sem repetir, na ordem do app. */
export function parseRedesFilter(value: string | null | undefined): RedeSocial[] {
  return normalizarRedesPostIt((value ?? '').split(','));
}

export function serializeRedesFilter(redes: readonly RedeSocial[]): string {
  return normalizarRedesPostIt(redes).join(',');
}

/** Marca ou desmarca uma rede no filtro rápido. */
export function alternarRedeNoFiltro(atual: readonly RedeSocial[], rede: RedeSocial): RedeSocial[] {
  return atual.includes(rede)
    ? atual.filter(item => item !== rede)
    : normalizarRedesPostIt([...atual, rede]);
}

type ConteudoComRedes = {
  id: string;
  plataformas?: readonly {platformId: string}[] | null;
};

type PostItComRedes = {
  contentId: string | null;
  redes?: readonly RedeSocial[] | null;
};

/**
 * Redes de um roteiro ou ideia: a de cada publicação, pela conta (nome comparado sem
 * maiúsculas, acentos e espaços). Sem publicação, valem as redes anotadas nos post-its
 * ligados ao conteúdo. Conta sem plataforma conhecida conta como "outra".
 */
export function redesDoItemDeCriacao(
  content: ConteudoComRedes,
  contas: readonly ContaRef[],
  postIts: readonly PostItComRedes[] = [],
): RedeSocial[] {
  const plataformas = content.plataformas ?? [];
  if (plataformas.length > 0) {
    return normalizarRedesPostIt(plataformas.map(item => redeDaRef(item.platformId, contas) ?? 'outra'));
  }
  const anotadas = postIts
    .filter(postIt => postIt.contentId === content.id)
    .flatMap(postIt => postIt.redes ?? []);
  return normalizarRedesPostIt(anotadas);
}

/** Redes de cada conteúdo, calculadas uma vez para filtrar grade, lista e kanban. */
export function mapaDeRedesDaCriacao(
  contents: readonly ConteudoComRedes[],
  contas: readonly ContaRef[],
  postIts: readonly PostItComRedes[] = [],
): Map<string, RedeSocial[]> {
  const comConteudo = postIts.filter(postIt => postIt.contentId);
  return new Map(contents.map(content => [content.id, redesDoItemDeCriacao(content, contas, comConteudo)]));
}

/**
 * Passa quem sai só nas redes marcadas: com Instagram e TikTok, entram os só de Instagram,
 * os só de TikTok e os dos dois, mas não os que também vão para o YouTube. Item sem rede
 * não passa. Sem rede marcada, passa tudo.
 */
export function passaNoFiltroRede(
  redes: readonly RedeSocial[] | undefined,
  filtro: readonly RedeSocial[] | null | undefined,
): boolean {
  if (!filtro || filtro.length === 0) return true;
  const lista = redes ?? [];
  return lista.length > 0 && lista.every(rede => filtro.includes(rede));
}

/**
 * Ícones do filtro rápido: as redes em que a pessoa tem conta ativa, na ordem do app.
 * Uma rede marcada que saiu das contas continua ali, para poder ser desmarcada.
 */
export function redesDoFiltroRapido(
  contas: readonly ContaRef[],
  marcadas: readonly RedeSocial[] = [],
): RedeSocial[] {
  const cadastradas = contasAtivas(contas).map(conta => redeDaConta(conta) ?? 'outra');
  return normalizarRedesPostIt([...cadastradas, ...marcadas]);
}
