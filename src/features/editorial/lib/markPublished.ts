import type { FuncaoEditorial, FuncaoOrigem, FuncaoPadraoSerie, PublicacaoStatus } from '../../../lib/database.ts';
import { CONTENT_STATUS } from '../../contents/lib/contentPipeline.ts';
import { funcaoHerdavelDaSerie } from './funcoes.ts';
import { parsePostCode } from './postCode.ts';

export type { PublicacaoStatus };

export type EntradaPublicacao = {
  /** Vazio quando ainda não há publicação por rede. A data fica no roteiro. */
  id: string;
  realizadaEm: string;
  postUrl?: string | null;
};

type ConteudoPublicavel = {
  status: string;
  funcao?: FuncaoEditorial | null;
  funcaoOrigem?: FuncaoOrigem | null;
  classificacaoCongeladaEm?: string | null;
  postedAt?: string | null;
  link?: string | null;
};

type PublicacaoPublicavel = {
  id: string;
  status?: PublicacaoStatus | null;
  realizadaManualEm?: string | null;
  realizadaApiEm?: string | null;
  postCodigo?: string | null;
  postUrl?: string | null;
};

export type MarkPublishedOptions = {
  serie?: { funcaoPadrao?: FuncaoPadraoSerie | null } | null;
  now?: string | Date;
};

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Data realizada efetiva: a da API, quando existir, senão a informada. */
export function dataRealizada(
  publicacao: Pick<PublicacaoPublicavel, 'realizadaApiEm' | 'realizadaManualEm'>,
): string | null {
  return publicacao.realizadaApiEm ?? publicacao.realizadaManualEm ?? null;
}

export function earliestRealizadaEm(values: Array<string | null | undefined>): string | null {
  let best: { time: number; value: string } | null = null;
  for (const value of values) {
    if (!value) continue;
    const time = Date.parse(value);
    if (Number.isNaN(time)) continue;
    if (!best || time < best.time) best = { time, value };
  }
  return best?.value ?? null;
}

function freezeInstant(options: MarkPublishedOptions | undefined): string {
  const now = options?.now;
  if (now instanceof Date) return now.toISOString();
  if (typeof now === 'string' && now.trim()) return now;
  return new Date().toISOString();
}

/**
 * Marca as entradas como publicadas, congela a classificação na primeira vez
 * e define postedAt como a menor data realizada.
 * Origem escolhida não é sobrescrita. Congelada não congela de novo.
 */
export function markPublished<C extends ConteudoPublicavel, P extends PublicacaoPublicavel>(
  content: C,
  publicacoes: P[],
  entradas: EntradaPublicacao[],
  options?: MarkPublishedOptions,
): { content: C; publicacoes: P[] } {
  const porId = new Map(
    entradas.filter(entrada => entrada.id).map(entrada => [entrada.id, entrada]),
  );

  const nextPublicacoes = publicacoes.map(publicacao => {
    const entrada = porId.get(publicacao.id);
    if (!entrada) return publicacao;
    const postUrl = blankToNull(entrada.postUrl);
    return {
      ...publicacao,
      status: 'publicada' as const,
      realizadaManualEm: entrada.realizadaEm,
      postUrl,
      postCodigo: parsePostCode(postUrl),
    };
  });

  const entradaDoRoteiro = entradas.find(entrada => !entrada.id) ?? null;
  const realizadas = nextPublicacoes
    .filter(publicacao => (publicacao.status ?? 'agendada') === 'publicada')
    .map(publicacao => dataRealizada(publicacao));
  if (entradaDoRoteiro) realizadas.push(entradaDoRoteiro.realizadaEm);

  const postedAt = earliestRealizadaEm(realizadas) ?? content.postedAt ?? null;
  const jaCongelada = Boolean(content.classificacaoCongeladaEm);
  let funcao = content.funcao ?? null;
  const funcaoOrigem = content.funcaoOrigem ?? null;
  let classificacaoCongeladaEm = content.classificacaoCongeladaEm ?? null;

  if (!jaCongelada) {
    if (funcaoOrigem === 'herdada') {
      funcao = funcaoHerdavelDaSerie(options?.serie ?? null);
    }
    classificacaoCongeladaEm = freezeInstant(options);
  }

  let link = content.link ?? null;
  if (!link) {
    const daPublicacao = nextPublicacoes.find(publicacao => publicacao.postUrl)?.postUrl ?? null;
    const daEntrada = entradaDoRoteiro ? blankToNull(entradaDoRoteiro.postUrl) : null;
    link = daPublicacao ?? daEntrada ?? null;
  }

  return {
    content: {
      ...content,
      status: CONTENT_STATUS.POSTADO,
      postedAt,
      funcao,
      funcaoOrigem,
      classificacaoCongeladaEm,
      link,
    },
    publicacoes: nextPublicacoes,
  };
}

export function setPublicacaoStatus<P extends { id: string; status?: PublicacaoStatus | null }>(
  publicacoes: P[],
  id: string,
  status: 'nao_publicada' | 'removida',
): P[] {
  return publicacoes.map(publicacao => (
    publicacao.id === id ? { ...publicacao, status } : publicacao
  ));
}

export function rotuloStatusPublicacao(status: PublicacaoStatus | null | undefined): string {
  switch (status) {
    case 'publicada':
      return 'Publicada';
    case 'nao_publicada':
      return 'Não foi ao ar';
    case 'removida':
      return 'Removida';
    default:
      return 'Agendada';
  }
}