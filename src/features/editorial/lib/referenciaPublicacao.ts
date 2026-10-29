import type { PublicacaoStatus } from '../../../lib/database.ts';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
import { type DestinoPlataforma, mesmoDestino, resolverRedeReferencia } from './destinations.ts';
import { normalizarFormato } from './funcoes.ts';

export type PublicacaoReferencia = {
  id: string;
  platformId: string;
  publishDate?: string | null;
  publishTime?: string | null;
  publicationKind?: string | null;
  status?: PublicacaoStatus | string | null;
  realizadaManualEm?: string | null;
  realizadaApiEm?: string | null;
  contaNaGrade?: boolean;
  formato?: string | null;
  formatoVisual?: string | null;
};

export type ConteudoReferencia = {
  id?: string;
  status?: string | null;
  publishDate?: string | null;
  publishTime?: string | null;
  formatoVisual?: string | null;
  redeReferenciaCongeladaId?: string | null;
  plataformas?: readonly PublicacaoReferencia[] | null;
};

export type ReferenciaSettings = {
  redeReferenciaId: string | null;
};

export type ReferenciaEscolhida = {
  publicacao: PublicacaoReferencia | null;
  data: string | null;
  hora: string | null;
  /** Rede usada como base: a congelada, quando vale, ou a das preferências. */
  redeBaseId: string | null;
  publicada: boolean;
  /**
   * Há rede de base e só existem publicações originais fora dela.
   * Não preenche a grade; aparece em “Só em outras redes”.
   */
  soEmOutrasRedes: boolean;
};

function dia(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}

function horaDe(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /(\d{2}):(\d{2})/.exec(value.trim());
  return match ? `${match[1]}:${match[2]}` : null;
}

function ehStories(formato: string | null | undefined): boolean {
  const normalized = normalizarFormato(formato);
  return normalized === 'stories' || normalized === 'story';
}

function formatoDaPublicacao(publicacao: PublicacaoReferencia): string | null {
  return publicacao.formato ?? publicacao.formatoVisual ?? null;
}

function ehRepost(publicacao: PublicacaoReferencia): boolean {
  return publicacao.publicationKind === 'repost';
}

/** Stories não viram referência. Repost também não. */
function podeSerReferencia(publicacao: PublicacaoReferencia, conteudo: ConteudoReferencia): boolean {
  if (ehRepost(publicacao)) return false;
  const formato = formatoDaPublicacao(publicacao);
  if (formato && ehStories(formato)) return false;
  if (!formato && ehStories(conteudo.formatoVisual)) return false;
  return true;
}

function conteudoJaPublicado(
  conteudo: ConteudoReferencia,
  publicacoes: readonly PublicacaoReferencia[],
): boolean {
  if (normalizeContentStatus(conteudo.status ?? '') === CONTENT_STATUS.POSTADO) return true;
  return publicacoes.some(publicacao => publicacao.status === 'publicada');
}

function redeBase(
  conteudo: ConteudoReferencia,
  settings: ReferenciaSettings,
  publicacoes: readonly PublicacaoReferencia[],
): string | null {
  const congelada = conteudo.redeReferenciaCongeladaId?.trim() || null;
  if (conteudoJaPublicado(conteudo, publicacoes) && congelada) return congelada;
  return settings.redeReferenciaId?.trim() || null;
}

function naRede(
  platformId: string,
  redeId: string | null,
  platforms: readonly DestinoPlataforma[],
): boolean {
  if (!redeId) return false;
  const rede = resolverRedeReferencia(redeId, platforms);
  return rede != null && mesmoDestino(platformId, rede);
}

/** Data, depois hora, depois id. Sem data fica por último. A ordem do array não entra. */
function maisCedo(publicacoes: readonly PublicacaoReferencia[]): PublicacaoReferencia {
  return [...publicacoes].sort((esquerda, direita) => {
    const dataEsquerda = dia(esquerda.publishDate) ?? '9999-99-99';
    const dataDireita = dia(direita.publishDate) ?? '9999-99-99';
    if (dataEsquerda !== dataDireita) return dataEsquerda < dataDireita ? -1 : 1;
    const horaEsquerda = horaDe(esquerda.publishTime) ?? '99:99';
    const horaDireita = horaDe(direita.publishTime) ?? '99:99';
    if (horaEsquerda !== horaDireita) return horaEsquerda < horaDireita ? -1 : 1;
    if (esquerda.id === direita.id) return 0;
    return esquerda.id < direita.id ? -1 : 1;
  })[0];
}

/**
 * Uma publicação de referência por roteiro.
 * Rede congelada só vale quando o conteúdo já foi publicado.
 * Com rede de base, só a publicação nessa rede preenche a grade —
 * conteúdo só em outras redes não entra (soEmOutrasRedes).
 * Sem rede de base, vale a original mais cedo. Sem publicação, a data do roteiro.
 */
export function referenciaPublicacao(
  conteudo: ConteudoReferencia,
  settings: ReferenciaSettings,
  platforms: readonly DestinoPlataforma[] = [],
): ReferenciaEscolhida {
  const publicacoes = conteudo.plataformas ?? [];
  const redeBaseId = redeBase(conteudo, settings, publicacoes);
  const candidatas = publicacoes.filter(publicacao => podeSerReferencia(publicacao, conteudo));
  const naBase = candidatas.filter(publicacao => naRede(publicacao.platformId, redeBaseId, platforms));
  const soEmOutrasRedes = Boolean(redeBaseId) && naBase.length === 0 && candidatas.length > 0;
  const escolhida = naBase.length > 0
    ? maisCedo(naBase)
    : (redeBaseId ? null : (candidatas.length > 0 ? maisCedo(candidatas) : null));

  const statusPostado = normalizeContentStatus(conteudo.status ?? '') === CONTENT_STATUS.POSTADO;
  const publicada = soEmOutrasRedes
    ? false
    : (statusPostado || escolhida?.status === 'publicada');
  const dataDaPublicacao = escolhida ? dia(escolhida.publishDate) : null;

  return {
    publicacao: escolhida,
    // Só em outras redes: não usa data de fora da base nem a do roteiro para preencher a grade.
    data: soEmOutrasRedes ? null : (dataDaPublicacao ?? dia(conteudo.publishDate)),
    hora: soEmOutrasRedes
      ? null
      : (dataDaPublicacao ? horaDe(escolhida?.publishTime) : horaDe(conteudo.publishTime)),
    redeBaseId,
    publicada,
    soEmOutrasRedes,
  };
}
