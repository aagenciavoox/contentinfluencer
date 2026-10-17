import type {RedeSocial} from '../../../lib/database.ts';
import {REDE_ROTULO, redeDaConta, redeDaRef, type ContaRef} from '../../contas/lib/contas.ts';
import {normalizarRedesPostIt, REDES_DO_POSTIT} from '../../planejamento/lib/redesPostIt.ts';

/** Query param do filtro de rede na tela Criação. */
export const REDE_FILTER_PARAM = 'rede';
/** Valor do filtro para roteiros e ideias sem nenhuma plataforma. */
export const SEM_REDE = 'sem-rede';

export type CreationRedeFilter = RedeSocial | typeof SEM_REDE;

/** As redes que sempre aparecem no filtro, na ordem do app. */
const REDES_FIXAS: readonly RedeSocial[] = ['instagram', 'tiktok', 'youtube', 'blog'];

export function parseRedeFilter(value: string | null | undefined): CreationRedeFilter | '' {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === SEM_REDE) return SEM_REDE;
  return (REDES_DO_POSTIT as readonly string[]).includes(normalized) ? normalized as RedeSocial : '';
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

export function passaNoFiltroRede(
  redes: readonly RedeSocial[] | undefined,
  filtro: string | null | undefined,
): boolean {
  if (!filtro) return true;
  const lista = redes ?? [];
  if (filtro === SEM_REDE) return lista.length === 0;
  return lista.includes(filtro as RedeSocial);
}

/**
 * Opções do filtro: Instagram, TikTok, YouTube e Blog/site sempre; "Outra plataforma"
 * só quando a pessoa tem conta fora dessas redes (ou com plataforma a definir).
 */
export function opcoesDoFiltroRede(
  contas: readonly ContaRef[],
  atual: string = '',
): {label: string; value: string}[] {
  const temOutra = contas.some(conta => {
    const rede = redeDaConta(conta);
    return rede === 'outra' || rede === null;
  });
  const redes: RedeSocial[] = [...REDES_FIXAS];
  if (temOutra || atual === 'outra') redes.push('outra');
  return [
    {label: 'Todas as redes', value: ''},
    ...redes.map(rede => ({label: REDE_ROTULO[rede], value: rede})),
    {label: 'Sem rede', value: SEM_REDE},
  ];
}
