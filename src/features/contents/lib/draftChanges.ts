/**
 * Texto do editor comparável. Vazio e parágrafos vazios no fim não são conteúdo:
 * o editor os acrescenta sozinho, sem que nada tenha sido escrito.
 */
export function normalizeEditorText(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/(?:<p>(?:<br\s*\/?>)?<\/p>)+$/i, '')
    .trim();
}

const TEXT_FIELDS = new Set(['script', 'notes', 'referencias']);
const LIST_FIELDS = new Set(['scriptNotes', 'plataformas', 'livroIds', 'temaIds']);

/** Um campo do rascunho mudou de verdade. Abrir, focar ou reformatar o mesmo texto não conta. */
export function draftFieldChanged(key: string, previous: unknown, next: unknown): boolean {
  if (key === 'writingNotes') {
    return (previous ?? '') !== (next ?? '');
  }
  if (TEXT_FIELDS.has(key)) {
    return normalizeEditorText(previous as string | null | undefined)
      !== normalizeEditorText(next as string | null | undefined);
  }
  if (LIST_FIELDS.has(key)) {
    return JSON.stringify(previous ?? null) !== JSON.stringify(next ?? null);
  }
  return previous !== next;
}

/** O rascunho difere do que está salvo em algum campo. */
export function draftDiffers<T extends object>(draft: T, saved: T): boolean {
  return (Object.keys(draft) as Array<keyof T & string>).some(key =>
    draftFieldChanged(key, draft[key], saved[key]),
  );
}
