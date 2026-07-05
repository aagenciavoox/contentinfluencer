import type {Content, Idea} from '../../../lib/database';
import {buildIdeaFromContent} from '../../contents/lib/demoteContentToIdea';
import {getIdeaNotes, normalizeIdea} from './ideaText';

export function hydrateIdeaFromDemotedContent(idea: Idea, content: Content): Idea {
  if (!idea.demotedFromContentId || idea.demotedFromContentId !== content.id) {
    return idea;
  }

  if (getIdeaNotes(idea).trim()) {
    return idea;
  }

  return normalizeIdea({
    ...idea,
    ...buildIdeaFromContent(content),
    demotedFromContentId: content.id,
  });
}

export function hydrateIdeasFromDemotedContents(ideas: Idea[], contents: Content[]): Idea[] {
  const contentById = new Map(contents.map(content => [content.id, content]));

  return ideas.map(idea => {
    if (!idea.demotedFromContentId) return idea;
    const content = contentById.get(idea.demotedFromContentId);
    if (!content) return idea;
    return hydrateIdeaFromDemotedContent(idea, content);
  });
}
