import type { Content, Idea } from '../../../lib/database';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline';
import { isDraftTitle } from '../../contents/lib/contentCardMeta';
import { htmlToReadableText } from '../../../lib/utils';

export type SeriesContentTab = 'roteiros' | 'ideias' | 'todos';

export interface SeriesContentStats {
  total: number;
  inboxIdeas: number;
  roteiros: number;
  ideias: number;
  publicados: number;
  emProducao: number;
  rascunhos: number;
}

export function getInboxIdeasForSeriesScripts(ideas: Idea[]): Idea[] {
  return ideas.filter(idea => !idea.promotedToContentId);
}

export function isIncompleteRoteiro(content: Content): boolean {
  const status = normalizeContentStatus(content.status);
  if (status !== CONTENT_STATUS.ROTEIRO) return false;
  const script = htmlToReadableText(content.script || '');
  return isDraftTitle(content.title) || !script.trim();
}

export function computeSeriesContentStats(
  contents: Content[],
  inboxIdeas: Idea[] = [],
): SeriesContentStats {
  let roteiros = 0, contentIdeias = 0, publicados = 0, emProducao = 0, rascunhos = 0;
  for (const c of contents) {
    const status = normalizeContentStatus(c.status);
    if (status === CONTENT_STATUS.IDEIA) { contentIdeias++; continue; }
    roteiros++;
    if (status === CONTENT_STATUS.POSTADO || c.postedAt) publicados++;
    else if (status === CONTENT_STATUS.PRODUCAO) emProducao++;
    if (isIncompleteRoteiro(c)) rascunhos++;
  }
  return {
    total: contents.length,
    inboxIdeas: inboxIdeas.length,
    roteiros,
    ideias: contentIdeias + inboxIdeas.length,
    publicados,
    emProducao,
    rascunhos,
  };
}

export function filterByTab(contents: Content[], tab: SeriesContentTab): Content[] {
  if (tab === 'ideias') return contents.filter(c => normalizeContentStatus(c.status) === CONTENT_STATUS.IDEIA);
  if (tab === 'roteiros') return contents.filter(c => normalizeContentStatus(c.status) !== CONTENT_STATUS.IDEIA);
  return contents;
}
