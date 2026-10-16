/** Controles que ficam visíveis na barra de Escrita (desfazer, B, I, destaque e comentário). */
export const WRITING_BAR_GROUPS = [
  ['undo'],
  ['bold', 'italic', 'highlight', 'comment'],
] as const;

/** Todo o resto, inclusive lista, lista numerada e link, fica em Mais. */
export const WRITING_MENU_ACTION_IDS = [
  'redo',
  'paragraph',
  'h1',
  'h2',
  'quote',
  'underline',
  'strike',
  'link',
  'align-left',
  'align-center',
  'align-right',
  'align-justify',
  'list',
  'ordered',
  'indent',
  'outdent',
  'rule',
  'clear',
  'find',
] as const;

export const WRITING_BAR_ACTION_IDS = WRITING_BAR_GROUPS.flat();

const MENU_ONLY = ['list', 'ordered', 'link'] as const;

export function writingBarHidesMenuOnlyActions() {
  const bar = new Set<string>(WRITING_BAR_ACTION_IDS);
  return MENU_ONLY.every(id => !bar.has(id) && (WRITING_MENU_ACTION_IDS as readonly string[]).includes(id));
}
