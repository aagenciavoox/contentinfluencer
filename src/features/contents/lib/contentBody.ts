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

export type ScriptBodyStatus = 'loading' | 'ready' | 'empty' | 'error';

/**
 * Per-item script body status for queue cards.
 * Never stays on "loading" after a failed or completed hydration attempt.
 */
export function resolveScriptBodyStatus(
  content: Pick<Content, 'script' | 'notes' | 'referencias'>,
  options?: {
    hydrating?: boolean;
    error?: boolean;
    hasScriptText?: boolean;
  },
): ScriptBodyStatus {
  if (options?.error) return 'error';
  if (!isContentBodyLoaded(content)) {
    return options?.hydrating === false ? 'error' : 'loading';
  }
  if (options?.hasScriptText === false) return 'empty';
  if (options?.hasScriptText === true) return 'ready';
  // Body loaded — treat null/empty script as empty unless caller overrides.
  const script = content.script;
  if (script == null || String(script).trim() === '') return 'empty';
  return 'ready';
}

export function scriptBodyStatusLabel(status: ScriptBodyStatus, wordCount = 0): string {
  switch (status) {
    case 'loading':
      return 'Carregando roteiro...';
    case 'error':
      return 'Não foi possível carregar o roteiro';
    case 'empty':
      return 'Sem roteiro escrito';
    case 'ready':
      return wordCount > 0 ? `${wordCount} palavras no roteiro` : 'Roteiro pronto';
  }
}

export function upsertContent(contents: Content[], item: Content): Content[] {
  const index = contents.findIndex(entry => entry.id === item.id);
  if (index === -1) return [item, ...contents];
  const next = [...contents];
  next[index] = item;
  return next;
}

export function upsertContents(contents: Content[], items: Content[]): Content[] {
  return items.reduce((acc, item) => upsertContent(acc, item), contents);
}
