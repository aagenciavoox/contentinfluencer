import type {Idea} from '../../../lib/database';

export function composeIdeaText(title: string, notes: string): string {
  const normalizedTitle = title.trim();
  const normalizedNotes = notes.trim();

  if (normalizedTitle && normalizedNotes) {
    return `${normalizedTitle}\n\n${normalizedNotes}`;
  }

  return normalizedTitle || normalizedNotes;
}

export function parseLegacyIdeaText(text: string): {title: string; notes: string} {
  const trimmed = text.trim();
  if (!trimmed) {
    return {title: '', notes: ''};
  }

  const newlineIndex = trimmed.indexOf('\n');
  if (newlineIndex === -1) {
    return {title: trimmed, notes: ''};
  }

  return {
    title: trimmed.slice(0, newlineIndex).trim(),
    notes: trimmed.slice(newlineIndex + 1).trim(),
  };
}

/** Resolve título e observações mesmo quando só `text` foi persistido (ideias demovidas antes da migração). */
export function resolveIdeaFields(
  idea: Pick<Idea, 'title' | 'notes' | 'text'>,
): {title: string; notes: string} {
  const text = idea.text?.trim() ?? '';
  let title = idea.title?.trim() ?? '';
  let notes = idea.notes?.trim() ?? '';

  if (!title && !notes && text) {
    const parsed = parseLegacyIdeaText(text);
    title = parsed.title;
    notes = parsed.notes;
  }

  if (!notes && text) {
    const parsed = parseLegacyIdeaText(text);

    if (!title) {
      title = parsed.title;
      notes = parsed.notes;
    } else if (text !== title) {
      if (text.startsWith(title)) {
        const remainder = text.slice(title.length).replace(/^\s*\n+/, '').trim();
        notes = remainder || parsed.notes;
      } else {
        notes = parsed.notes;
        if (!title && parsed.title) title = parsed.title;
      }
    }
  }

  if (!title && notes) {
    title = parseLegacyIdeaText(text).title || notes.split('\n')[0]?.trim() || 'Nota editorial';
  }

  return {
    title: title || 'Nota editorial',
    notes,
  };
}

export function getIdeaTitle(idea: Pick<Idea, 'title' | 'notes' | 'text'>): string {
  return resolveIdeaFields(idea).title;
}

export function getIdeaNotes(idea: Pick<Idea, 'title' | 'notes' | 'text'>): string {
  return resolveIdeaFields(idea).notes;
}

export function buildIdeaFields(input: {
  title?: string;
  notes?: string;
  text?: string;
}): Pick<Idea, 'title' | 'notes' | 'text'> {
  if (input.title !== undefined || input.notes !== undefined) {
    const title = (input.title ?? '').trim();
    const notes = (input.notes ?? '').trim();
    const text = composeIdeaText(title, notes);

    return {
      title: title || null,
      notes: notes || null,
      text: text || 'Nota editorial',
    };
  }

  const parsed = parseLegacyIdeaText(input.text ?? '');
  const text = composeIdeaText(parsed.title, parsed.notes) || input.text?.trim() || 'Nota editorial';

  return {
    title: parsed.title || null,
    notes: parsed.notes || null,
    text,
  };
}

export function normalizeIdea(idea: Idea): Idea {
  const {title, notes} = resolveIdeaFields(idea);

  return {
    ...idea,
    title: title || null,
    notes: notes || null,
    text: composeIdeaText(title, notes) || idea.text.trim() || 'Nota editorial',
  };
}

export function ideaSearchText(idea: Pick<Idea, 'title' | 'notes' | 'text'>): string {
  const {title, notes} = resolveIdeaFields(idea);
  return [title, notes, idea.text].filter(Boolean).join('\n').toLowerCase();
}
