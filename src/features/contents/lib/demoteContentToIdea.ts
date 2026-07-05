import type {Content, Idea} from '../../../lib/database';
import {htmlToReadableText} from '../../../lib/utils';
import {generateUUID} from '../../../utils/uuid';
import {buildIdeaFields, composeIdeaText} from '../../ideas/lib/ideaText';

export function buildIdeaBodyFromContent(
  content: Pick<Content, 'notes' | 'script'>,
  title: string,
): string {
  const notes = content.notes?.trim() ?? '';
  const script = htmlToReadableText(content.script).trim();
  const parts: string[] = [];

  if (notes && notes !== title) parts.push(notes);
  if (script) parts.push(script);

  return parts.join('\n\n').trim();
}

export function buildIdeaFromContent(content: Content): Pick<Idea, 'title' | 'notes' | 'text'> {
  const title = content.title.trim() || 'Nota editorial';
  const notes = buildIdeaBodyFromContent(content, title);

  return buildIdeaFields({title, notes});
}

export function createIdeaFromContent(content: Content, userId: string): Idea {
  const fields = buildIdeaFromContent(content);

  return {
    id: generateUUID(),
    userId,
    ...fields,
    pilarId: content.pilarId,
    seriesId: content.seriesId,
    origemId: content.bibliotecaItemId,
    promotedToContentId: null,
    demotedFromContentId: content.id,
    archived: false,
    createdAt: new Date().toISOString(),
  };
}

export function restoreIdeaFromContent(idea: Idea, content: Content): Idea {
  const fields = buildIdeaFromContent(content);

  return {
    ...idea,
    ...fields,
    archived: false,
    promotedToContentId: null,
    demotedFromContentId: content.id,
  };
}

export type DemoteContentsPlan = {
  ideasToSave: Idea[];
  contentIdsToDelete: string[];
  nextIdeas: Idea[];
};

export function planDemoteContentsToIdeas(
  contents: Content[],
  ideas: Idea[],
  contentIds: string[],
  userId: string,
): DemoteContentsPlan {
  const contentIdSet = new Set(contentIds);
  const ideasToSave: Idea[] = [];
  const newIdeas: Idea[] = [];
  const updatedIdeasById = new Map<string, Idea>();

  for (const contentId of contentIds) {
    const content = contents.find(item => item.id === contentId);
    if (!content) continue;

    const linkedIdea = ideas.find(item => item.promotedToContentId === contentId);
    if (linkedIdea) {
      const restored = restoreIdeaFromContent(linkedIdea, content);
      updatedIdeasById.set(linkedIdea.id, restored);
      ideasToSave.push(restored);
    } else {
      const created = createIdeaFromContent(content, content.userId || userId);
      newIdeas.push(created);
      ideasToSave.push(created);
    }
  }

  const nextIdeas = [
    ...newIdeas,
    ...ideas.map(idea => updatedIdeasById.get(idea.id) ?? idea),
  ];

  return {
    ideasToSave,
    contentIdsToDelete: [...contentIdSet].filter(id => contents.some(content => content.id === id)),
    nextIdeas,
  };
}

/** @deprecated Use buildIdeaFromContent */
export function buildIdeaTextFromContent(
  content: Pick<Content, 'title' | 'notes' | 'script'>,
): string {
  const title = content.title.trim() || 'Nota editorial';
  const notes = buildIdeaBodyFromContent(content, title);
  return composeIdeaText(title, notes) || 'Nota editorial';
}
