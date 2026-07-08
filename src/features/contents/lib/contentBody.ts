import type { Content } from '../../../lib/database';

/** Lista/calendário usam select leve sem roteiro — `script` fica `undefined` (não `null`). */
export function isContentBodyLoaded(
  content: Pick<Content, 'script' | 'notes' | 'referencias'>,
): boolean {
  return (
    content.script !== undefined ||
    content.notes !== undefined ||
    content.referencias !== undefined
  );
}

export function upsertContent(contents: Content[], item: Content): Content[] {
  const index = contents.findIndex(entry => entry.id === item.id);
  if (index === -1) return [item, ...contents];
  const next = [...contents];
  next[index] = item;
  return next;
}
