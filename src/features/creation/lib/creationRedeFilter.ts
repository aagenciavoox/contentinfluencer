import type {Content, ContentPlataforma, RedeSocial} from '../../../lib/database.ts';
import {contasAtivas, redeDaConta, redeDaRef, type ContaRef, type RedeDoFiltro} from '../../contas/lib/contas.ts';
import {formatoDaPublicacao, formatoNoYoutube, type FormatoPublicacao} from '../../editorial/lib/publicacoes.ts';
import {normalizarRedesPostIt, ORDEM_EXIBICAO_REDE} from '../../planejamento/lib/redesPostIt.ts';

export type {RedeDoFiltro};

/** Mesma ordem dos seletores: Reels, TikTok, Shorts, YouTube longo, carrossel. */
const ORDEM_DO_FILTRO: readonly RedeDoFiltro[] = ORDEM_EXIBICAO_REDE;

/** Só itens conhecidos, sem repetir, na ordem do filtro. */
export function normalizarRedesDoFiltro(value: unknown): RedeDoFiltro[] {
  if (!Array.isArray(value)) return [];
  const escolhidas = new Set(
    value.filter((item): item is string => typeof item === 'string').map(item => item.trim().toLowerCase()),
  );
  return ORDEM_DO_FILTRO.filter(rede => escolhidas.has(rede));
}

/** Formato decide o chip: Shorts; Instagram em vídeo/carrossel; TikTok fica um só. */
export function redeDoFiltro(rede: RedeSocial, formato: FormatoPublicacao | null | undefined): RedeDoFiltro {
  if (rede === 'youtube' && formato === 'short') return 'youtube-shorts';
  if (rede === 'instagram' && formato === 'reels') return 'instagram-video';
  if (rede === 'instagram' && formato === 'carrossel') return 'instagram-carrossel';
  // Sem formato no Instagram, trata como vídeo no filtro (não há chip da rede inteira).
  if (rede === 'instagram') return 'instagram-video';
  return rede;
}

/** Query param do filtro de rede na tela Criação: uma ou mais redes, separadas por vírgula. */
export const REDE_FILTER_PARAM = 'rede';

/** Lê `?rede=instagram,tiktok`: só redes conhecidas, sem repetir, na ordem do app. */
export function parseRedesFilter(value: string | null | undefined): RedeDoFiltro[] {
  return normalizarRedesDoFiltro((value ?? '').split(','));
}

export function serializeRedesFilter(redes: readonly RedeDoFiltro[]): string {
  return normalizarRedesDoFiltro(redes).join(',');
}

/** Marca ou desmarca uma rede no filtro rápido. */
export function alternarRedeNoFiltro(atual: readonly RedeDoFiltro[], rede: RedeDoFiltro): RedeDoFiltro[] {
  return atual.includes(rede)
    ? atual.filter(item => item !== rede)
    : normalizarRedesDoFiltro([...atual, rede]);
}

type ConteudoComRedes = {
  id: string;
  plataformas?: readonly (Pick<ContentPlataforma, 'platformId'> & Partial<Pick<ContentPlataforma, 'formatoPublicacao'>>)[] | null;
} & Partial<Pick<Content, 'formatoVisual' | 'writingMode'>>;

type PostItComRedes = {
  contentId: string | null;
  redes?: readonly RedeDoFiltro[] | null;
};

/**
 * Redes de um roteiro ou ideia: a de cada publicação, pela conta (nome comparado sem
 * maiúsculas, acentos e espaços). No YouTube, Shorts ou vídeo longo pelo formato da publicação
 * (escolhido ou deduzido). Sem publicação, valem as redes anotadas nos post-its ligados ao
 * conteúdo, com o YouTube pela mesma dedução. Conta sem plataforma conhecida conta como "outra".
 */
export function redesDoItemDeCriacao(
  content: ConteudoComRedes,
  contas: readonly ContaRef[],
  postIts: readonly PostItComRedes[] = [],
): RedeDoFiltro[] {
  const conteudo = {formatoVisual: content.formatoVisual ?? null, writingMode: content.writingMode};
  const plataformas = content.plataformas ?? [];
  if (plataformas.length > 0) {
    return normalizarRedesDoFiltro(plataformas.map(item => {
      const rede = redeDaRef(item.platformId, contas) ?? 'outra';
      const formato = (rede === 'youtube' || rede === 'instagram' || rede === 'tiktok')
        ? formatoDaPublicacao(conteudo, rede, item)
        : null;
      return redeDoFiltro(rede, formato);
    }));
  }
  const anotadas = postIts
    .filter(postIt => postIt.contentId === content.id)
    .flatMap(postIt => normalizarRedesPostIt(postIt.redes ?? []))
    .map(rede => {
      if (rede === 'tiktok-video' || rede === 'tiktok-carrossel') return 'tiktok';
      if (rede === 'instagram') return 'instagram-video';
      if (rede === 'youtube-shorts' || rede === 'instagram-video' || rede === 'instagram-carrossel') {
        return rede;
      }
      if (rede === 'youtube') return redeDoFiltro(rede, formatoNoYoutube(conteudo).formato);
      return rede;
    });
  return normalizarRedesDoFiltro(anotadas);
}

/** Redes de cada conteúdo, calculadas uma vez para filtrar grade, lista e kanban. */
export function mapaDeRedesDaCriacao(
  contents: readonly ConteudoComRedes[],
  contas: readonly ContaRef[],
  postIts: readonly PostItComRedes[] = [],
): Map<string, RedeDoFiltro[]> {
  const comConteudo = postIts.filter(postIt => postIt.contentId);
  return new Map(contents.map(content => [content.id, redesDoItemDeCriacao(content, contas, comConteudo)]));
}

/**
 * Passa quem sai só nas redes marcadas: com Instagram e TikTok, entram os só de Instagram,
 * os só de TikTok e os dos dois, mas não os que também vão para o YouTube. Item sem rede
 * não passa. Sem rede marcada, passa tudo.
 */
export function passaNoFiltroRede(
  redes: readonly RedeDoFiltro[] | undefined,
  filtro: readonly RedeDoFiltro[] | null | undefined,
): boolean {
  if (!filtro || filtro.length === 0) return true;
  const lista = redes ?? [];
  return lista.length > 0 && lista.every(rede => filtro.includes(rede));
}

/**
 * Ícones do filtro rápido: as redes em que a pessoa tem conta ativa, na ordem do app; com conta
 * no YouTube, vídeo longo e Shorts aparecem separados. Uma rede marcada que saiu das contas
 * continua ali, para poder ser desmarcada.
 */
export function redesDoFiltroRapido(
  contas: readonly ContaRef[],
  marcadas: readonly RedeDoFiltro[] = [],
): RedeDoFiltro[] {
  const cadastradas = contasAtivas(contas).flatMap((conta): RedeDoFiltro[] => {
    const rede = redeDaConta(conta) ?? 'outra';
    if (rede === 'youtube') return ['youtube', 'youtube-shorts'];
    if (rede === 'instagram') return ['instagram-video', 'instagram-carrossel'];
    if (rede === 'tiktok') return ['tiktok'];
    return [rede];
  });
  return normalizarRedesDoFiltro([...cadastradas, ...marcadas]);
}
