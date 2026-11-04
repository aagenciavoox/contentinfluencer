import type { Platform, RedeSocial } from '../../../lib/database.ts';
import { rotuloConta, type RedeDoFiltro } from '../../contas/lib/contas.ts';
import { normalizarRedesDoFiltro, passaNoFiltroRede, redeDoFiltro } from '../../creation/lib/creationRedeFilter.ts';
import { formatoNoYoutube } from '../../editorial/lib/publicacoes.ts';
import { normalizarRedesPostIt } from './redesPostIt.ts';
import {
  FORMATOS_DA_REDE,
  rotuloDoFormato,
  type FormatoPublicacao,
  type PublicacaoNaAgenda,
  type SituacaoNaAgenda,
} from '../../editorial/lib/publicacoes.ts';
import type { PlanejamentoPostIt } from './postIt.ts';

/**
 * Filtros do calendário do Planejamento. Redes: o mesmo filtro da Criação, com os mesmos ícones e a
 * mesma regra (decisão de 03/11): passa o conteúdo que sai só nas redes marcadas; o que sai também em
 * outra rede fica de fora. A Saúde conta o mesmo recorte. Vazio = todas. Formato null = todos.
 */
export type FiltroCalendario = { redes: RedeDoFiltro[]; formato: string | null };

/**
 * A conta entra na Saúde filtrada quando a rede dela está marcada. Conta do YouTube entra com
 * "YouTube" (vídeo longo) ou "Shorts": os conteúdos já vêm recortados pela regra da Criação.
 */
export function contaNoFiltro(rede: RedeSocial | null, redes: readonly RedeDoFiltro[]): boolean {
  if (redes.length === 0) return true;
  const daConta = rede ?? 'outra';
  if (redes.includes(daConta)) return true;
  if (daConta === 'youtube' && redes.includes('youtube-shorts')) return true;
  if (daConta === 'instagram' && (redes.includes('instagram-video') || redes.includes('instagram-carrossel'))) return true;
  if (daConta === 'tiktok' && (redes.includes('tiktok-video') || redes.includes('tiktok-carrossel'))) return true;
  return false;
}

export function filtroAtivo(filtro: FiltroCalendario): boolean {
  return filtro.redes.length > 0 || Boolean(filtro.formato);
}

/** Publicações da agenda (uma por conta) por conteúdo e dia, e por conteúdo. */
export type IndiceDaAgenda = {
  porDia: Map<string, PublicacaoNaAgenda[]>;
  porConteudo: Map<string, PublicacaoNaAgenda[]>;
};

export function chaveDoDia(contentId: string, dia: string): string {
  return `${contentId}|${dia}`;
}

export function indiceDaAgenda(agenda: readonly PublicacaoNaAgenda[]): IndiceDaAgenda {
  const porDia = new Map<string, PublicacaoNaAgenda[]>();
  const porConteudo = new Map<string, PublicacaoNaAgenda[]>();
  for (const item of agenda) {
    const doConteudo = porConteudo.get(item.contentId) ?? [];
    doConteudo.push(item);
    porConteudo.set(item.contentId, doConteudo);
    if (!item.data) continue;
    const chave = chaveDoDia(item.contentId, item.data);
    const doDia = porDia.get(chave) ?? [];
    doDia.push(item);
    porDia.set(chave, doDia);
  }
  return { porDia, porConteudo };
}

/** Regra da Criação: as redes do conteúdo todas dentro das marcadas; o formato, em alguma conta dele. */
function itensPassam(itens: readonly PublicacaoNaAgenda[], filtro: FiltroCalendario): boolean {
  if (itens.length === 0) return false;
  // No YouTube, Shorts e vídeo longo pelo formato da publicação (parte A: escolhido ou deduzido).
  const redes = normalizarRedesDoFiltro(itens.map(item => redeDoFiltro(item.rede ?? 'outra', item.formato)));
  if (!passaNoFiltroRede(redes, filtro.redes)) return false;
  return !filtro.formato || itens.some(item => item.formato === filtro.formato);
}

/** Publicações do conteúdo naquele dia; sem nenhuma no dia, as do conteúdo inteiro. */
export function publicacoesDoCard(indice: IndiceDaAgenda, contentId: string, dia: string | null | undefined): PublicacaoNaAgenda[] {
  const doDia = dia ? indice.porDia.get(chaveDoDia(contentId, dia)) : undefined;
  return doDia && doDia.length > 0 ? doDia : indice.porConteudo.get(contentId) ?? [];
}

/**
 * O conteúdo passa pelas redes dele inteiro, como na Criação, e não pelas do dia do card: assim o
 * mesmo conteúdo aparece (ou não) em todos os dias e a Saúde conta o mesmo recorte.
 * Sem publicação por conta, some com filtro ligado.
 */
export function conteudoPassa(indice: IndiceDaAgenda, contentId: string, filtro: FiltroCalendario): boolean {
  if (!filtroAtivo(filtro)) return true;
  return itensPassam(indice.porConteudo.get(contentId) ?? [], filtro);
}

/**
 * Post-it com conteúdo segue o conteúdo. Sem conteúdo: com filtro de formato some (o formato não é
 * conhecido); com filtro de rede, valem as redes anotadas no post-it, como na Criação.
 */
export function postItPassa(indice: IndiceDaAgenda, postIt: PlanejamentoPostIt, filtro: FiltroCalendario): boolean {
  if (!filtroAtivo(filtro)) return true;
  if (postIt.contentId) return conteudoPassa(indice, postIt.contentId, filtro);
  if (filtro.formato) return false;
  // Sem conteúdo, respeita a rede anotada (inclusive Shorts e YouTube longo diretamente).
  const redes = normalizarRedesPostIt(postIt.redes ?? []);
  return passaNoFiltroRede(normalizarRedesDoFiltro(redes), filtro.redes);
}

/** Formatos que podem ser filtrados: os que dividem metas por rede e "Sem formato". */
export function formatosDoFiltro(): Array<{ value: FormatoPublicacao; label: string }> {
  const vistos = new Set<FormatoPublicacao>();
  for (const lista of Object.values(FORMATOS_DA_REDE)) for (const formato of lista ?? []) vistos.add(formato);
  vistos.add('sem-classificacao');
  return [...vistos].map(formato => ({ value: formato, label: rotuloDoFormato(formato) }));
}

export const ROTULO_SITUACAO: Record<SituacaoNaAgenda, string> = {
  realizada: 'publicada',
  prevista: 'prevista',
  vencida: 'data passou sem registro',
  'sem-data': 'sem data',
};

/** Uma conta dentro do card agrupado: ícone, formato e a situação dela. */
export type ContaDoCard = {
  platformId: string;
  nome: string;
  rede: string | null;
  formato: string;
  rotuloFormato: string;
  situacao: SituacaoNaAgenda;
  rotuloSituacao: string;
  programado: boolean;
};

export function contasDoCard(itens: readonly PublicacaoNaAgenda[], platforms: readonly Platform[]): ContaDoCard[] {
  const vistas = new Set<string>();
  const contas: ContaDoCard[] = [];
  for (const item of itens) {
    if (vistas.has(item.platformId)) continue;
    vistas.add(item.platformId);
    const conta = platforms.find(platform => platform.id === item.platformId);
    contas.push({
      platformId: item.platformId,
      nome: conta ? rotuloConta(conta) : 'Conta',
      rede: item.rede,
      formato: item.formato,
      rotuloFormato: rotuloDoFormato(item.formato, item.rede),
      situacao: item.situacao,
      rotuloSituacao: ROTULO_SITUACAO[item.situacao],
      programado: item.programado,
    });
  }
  return contas;
}
