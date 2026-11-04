import type { Content, RecordingBlock } from '../../../lib/database.ts';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute.ts';
import { CONTENT_STATUS, getDisplayStatus, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
import { isActiveCreation, isPostedContent } from '../../contents/lib/contentWorkflow.ts';
import { isBlockContentComplete } from '../../recording/lib/recordingWorkflow.ts';

export type TodayWorkItem = { id: string; title: string; description: string; to: string };

/** Uma escrita recente e uma sessão com material pendente, sem ressuscitar itens arquivados. */
export function getTodayWork(contents: Content[], blocks: RecordingBlock[], recordingEnabled: boolean): TodayWorkItem[] {
  const active = contents.filter(content => isActiveCreation(content) && !isPostedContent(content));
  const byId = new Map(active.map(content => [content.id, content]));
  const session = recordingEnabled ? [...blocks]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .find(block => block.contents.some(item => {
      const content = byId.get(item.contentId);
      return content && !isBlockContentComplete(item, content);
    })) : undefined;
  const inBlocks = new Set(recordingEnabled ? blocks.flatMap(block => block.contents.map(item => item.contentId)) : []);
  const writing = active.filter(content => {
    const status = normalizeContentStatus(content.status);
    return status === CONTENT_STATUS.ROTEIRO
      || (status === CONTENT_STATUS.PRODUCAO && !inBlocks.has(content.id))
      || (status === CONTENT_STATUS.EDICAO && !content.edicaoConcluidaEm);
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  const result: TodayWorkItem[] = [];
  if (writing) result.push({
    id: writing.id,
    title: writing.title.trim() || 'Sem título',
    description: `${getDisplayStatus(writing)} · Atualizado recentemente`,
    to: buildContentDetailRoute(writing.id, normalizeContentStatus(writing.status) === CONTENT_STATUS.EDICAO
      ? 'publicacao' : normalizeContentStatus(writing.status) === CONTENT_STATUS.PRODUCAO && recordingEnabled ? 'gravacao' : 'roteiro'),
  });
  if (session) result.push({
    id: session.id,
    title: session.name.trim() || 'Sessão de gravação',
    description: 'Sessão com roteiros para gravar',
    to: `/gravacao/${session.id}?burst=1`,
  });
  return result;
}
