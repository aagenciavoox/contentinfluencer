import type { Content, Platform, RedeSocial } from '../../../lib/database.ts';
import { htmlToReadableText } from '../../../lib/utils.ts';
import { rotuloConta } from '../../contas/lib/contas.ts';
import { contentReadableBody } from '../../contents/lib/carouselSlides.ts';
import { isContentBodyLoaded } from '../../contents/lib/contentBody.ts';
import { estadoLegenda, legendaEfetiva, type EstadoLegenda } from '../../editorial/lib/captions.ts';
import { rotuloDoFormato, type PublicacaoNaAgenda, type SituacaoNaAgenda } from '../../editorial/lib/publicacoes.ts';
import { ROTULO_SITUACAO } from './filtroCalendario.ts';

/**
 * O que a pré-visualização do Planejamento mostra de um conteúdo puxado: onde vai ser postado,
 * se cada conta já tem legenda e um pedaço do texto. Só lê; nada aqui grava.
 */

export type LegendaDoResumo = {
  tem: boolean;
  estado: EstadoLegenda;
  trecho: string;
};

export type DestinoDoResumo = {
  publicacaoId: string;
  platformId: string;
  nome: string;
  rede: RedeSocial | null;
  rotuloFormato: string;
  situacao: SituacaoNaAgenda;
  rotuloSituacao: string;
  data: string | null;
  hora: string | null;
  programado: boolean;
  legenda: LegendaDoResumo | null;
};

export type TextoDoResumo =
  | { estado: 'carregando' }
  | { estado: 'vazio' }
  | { estado: 'pronto'; trecho: string; palavras: number; cortado: boolean };

const TRECHO_MAX = 320;

/** Primeiros caracteres, sem cortar palavra no meio. */
export function trecho(texto: string, max = TRECHO_MAX): { texto: string; cortado: boolean } {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (limpo.length <= max) return { texto: limpo, cortado: false };
  const corte = limpo.lastIndexOf(' ', max);
  return { texto: `${limpo.slice(0, corte > max / 2 ? corte : max).trimEnd()}…`, cortado: true };
}

function legendaDaPublicacao(content: Content, publicacaoId: string): LegendaDoResumo | null {
  const publicacao = content.plataformas.find(item => item.id === publicacaoId);
  if (!publicacao) return null;
  const texto = legendaEfetiva(content.legendaBase, publicacao);
  return {
    tem: texto.trim().length > 0,
    estado: estadoLegenda(publicacao, content),
    trecho: trecho(texto, 140).texto,
  };
}

/** Uma linha por conta, com a situação da agenda e a legenda efetiva dela. */
export function destinosDoResumo(
  content: Content,
  agenda: readonly PublicacaoNaAgenda[],
  platforms: readonly Platform[],
): DestinoDoResumo[] {
  const vistas = new Set<string>();
  const destinos: DestinoDoResumo[] = [];
  for (const item of agenda) {
    if (item.contentId !== content.id || vistas.has(item.platformId)) continue;
    vistas.add(item.platformId);
    const conta = platforms.find(platform => platform.id === item.platformId);
    destinos.push({
      publicacaoId: item.id,
      platformId: item.platformId,
      nome: conta ? rotuloConta(conta) : 'Conta',
      rede: item.rede,
      rotuloFormato: rotuloDoFormato(item.formato, item.rede),
      situacao: item.situacao,
      rotuloSituacao: ROTULO_SITUACAO[item.situacao],
      data: item.data,
      hora: item.hora,
      programado: item.programado,
      legenda: legendaDaPublicacao(content, item.id),
    });
  }
  return destinos;
}

/** Legenda-base do conteúdo: vale para as contas que não têm versão própria. */
export function legendaBaseDoResumo(content: Pick<Content, 'legendaBase'>): LegendaDoResumo | null {
  const texto = content.legendaBase ?? '';
  if (!texto.trim()) return null;
  return { tem: true, estado: 'base', trecho: trecho(texto, 140).texto };
}

/** Ideia mostra o texto da ideia; roteiro mostra o corpo. Sem o corpo carregado, "carregando". */
export function textoDoResumo(content: Content): TextoDoResumo {
  if (!isContentBodyLoaded(content)) return { estado: 'carregando' };
  const corpo = contentReadableBody(content) || htmlToReadableText(content.notes || '').trim();
  if (!corpo) return { estado: 'vazio' };
  const recorte = trecho(corpo);
  return { estado: 'pronto', trecho: recorte.texto, palavras: corpo.split(/\s+/).filter(Boolean).length, cortado: recorte.cortado };
}

/** "2 de 3 contas com legenda" ou "Sem legenda". */
export function resumoDasLegendas(destinos: readonly DestinoDoResumo[], legendaBase: LegendaDoResumo | null): string {
  const comLegenda = destinos.filter(destino => destino.legenda?.tem).length;
  if (destinos.length === 0) return legendaBase ? 'Legenda-base pronta' : 'Sem legenda';
  if (comLegenda === 0) return 'Sem legenda';
  if (comLegenda === destinos.length) return destinos.length === 1 ? 'Com legenda' : 'Todas as contas com legenda';
  return `${comLegenda} de ${destinos.length} contas com legenda`;
}
