import type { Content, ContentPlataforma } from '../../../lib/database.ts';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
import { publicacaoJaPostada, temLegenda } from '../../editorial/lib/captions.ts';
import { contaDaRef, rotuloConta, type ContaRef } from '../../contas/lib/contas.ts';

export type CaptionListFilter = 'todos' | 'sem-legenda' | 'com-legenda';

export const CAPTION_PAGE_SIZE = 10;

type CaptionSource = Pick<ContentPlataforma, 'platformId' | 'legenda' | 'hashtags'>;

export function formatCaptionBlock(record: Pick<ContentPlataforma, 'legenda' | 'hashtags'>): string {
  return [record.legenda.trim(), record.hashtags.trim()].filter(Boolean).join('\n\n');
}

/** Texto pronto para colar. Prefere a rede em foco; junta as demais só quando há mais de uma. */
export function captionClipboardText(
  plataformas: CaptionSource[],
  preferredPlatformId?: string | null,
): string {
  const blocks = plataformas.flatMap(record => {
    const text = formatCaptionBlock(record);
    if (!text) return [];
    return [{ platformId: record.platformId, text }];
  });

  if (blocks.length === 0) return '';

  const preferred = preferredPlatformId
    ? blocks.find(block => block.platformId === preferredPlatformId)
    : undefined;
  if (preferred) return preferred.text;
  if (blocks.length === 1) return blocks[0].text;

  return blocks.map(block => `${block.platformId}\n${block.text}`).join('\n\n');
}

type ConteudoDaFila = Pick<Content, 'status' | 'deletedAt' | 'archivedAt' | 'legendaBase' | 'plataformas'>;

/** O roteiro ainda pode ter legenda pendente. Postado só entra se alguma publicação não foi ao ar. */
export function isCaptionQueueContent(
  content: Pick<Content, 'status' | 'deletedAt' | 'archivedAt'>,
): boolean {
  if (content.deletedAt || content.archivedAt) return false;
  const status = normalizeContentStatus(content.status);
  return status === CONTENT_STATUS.ROTEIRO
    || status === CONTENT_STATUS.PRODUCAO
    || status === CONTENT_STATUS.POSTADO;
}

/**
 * Uma publicação sai da fila quando já foi postada.
 * Concluir o Instagram não tira o TikTok, nem outra conta, da fila.
 */
export function publicacaoNaFila(
  content: ConteudoDaFila,
  publicacao: Pick<ContentPlataforma, 'status'>,
): boolean {
  if (!isCaptionQueueContent(content)) return false;
  return !publicacaoJaPostada(publicacao, content);
}

export type ItemFilaLegenda = {
  /** Id da publicação, para a ordem da fila não pular enquanto se escreve. */
  id: string;
  content: Content;
  publicacao: ContentPlataforma;
};

function casaBusca(item: ItemFilaLegenda, query: string, contas: readonly ContaRef[]): boolean {
  if (!query) return true;
  const conta = contaDaRef(item.publicacao.platformId, contas);
  const campos = [
    item.content.title,
    item.publicacao.legenda,
    item.content.legendaBase ?? '',
    conta ? rotuloConta(conta) : item.publicacao.platformId,
    conta?.nome ?? '',
    conta?.handle ?? '',
  ];
  return campos.some(campo => campo.toLocaleLowerCase('pt-BR').includes(query));
}

/** Fila por publicação. Busca e filtro valem juntos. A classificação usa o texto efetivo. */
export function filtrarFilaLegendas(
  contents: readonly Content[],
  filter: CaptionListFilter,
  search: string,
  contas: readonly ContaRef[] = [],
): ItemFilaLegenda[] {
  const query = search.trim().toLocaleLowerCase('pt-BR');
  const itens: ItemFilaLegenda[] = [];

  for (const content of contents) {
    for (const publicacao of content.plataformas) {
      if (!publicacaoNaFila(content, publicacao)) continue;
      const comLegenda = temLegenda(content.legendaBase, publicacao);
      if (filter === 'sem-legenda' && comLegenda) continue;
      if (filter === 'com-legenda' && !comLegenda) continue;
      const item = { id: publicacao.id, content, publicacao };
      if (!casaBusca(item, query, contas)) continue;
      itens.push(item);
    }
  }

  return itens.sort((left, right) => {
    const porData = right.content.updatedAt.localeCompare(left.content.updatedAt);
    if (porData !== 0) return porData;
    return left.id.localeCompare(right.id);
  });
}

/**
 * Mantém a fila parada enquanto se escreve. Salvar uma legenda muda o updatedAt e tiraria
 * a linha de "Sem legenda"; ela só sai quando o filtro ou a busca mudam.
 */
export function stableCaptionOrder<T extends { id: string }>(
  previousOrder: readonly string[],
  matched: readonly T[],
  pool: readonly T[],
): T[] {
  const byId = new Map(pool.map(item => [item.id, item]));
  const kept = previousOrder.flatMap(id => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
  const keptIds = new Set(previousOrder);
  return [...kept, ...matched.filter(item => !keptIds.has(item.id))];
}

export function paginateCaptionQueue<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize = CAPTION_PAGE_SIZE,
) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}
