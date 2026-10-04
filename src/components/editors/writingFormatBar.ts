/** Groups that stay visible on the Escrita format bar. */
export const WRITING_BAR_GROUPS = [
  ['undo'],
  ['bold', 'italic'],
] as const;

/** Everything else, including list, numbered list, and link, lives in Mais. */
export const WRITING_MENU_ACTION_IDS = [
  'redo',
  'underline',
  'strike',
  'align-left',
  'align-center',
  'align-right',
  'list',
  'ordered',
  'link',
  'h1',
  'h2',
  'quote',
  'rule',
] as const;

export const WRITING_BAR_ACTION_IDS = WRITING_BAR_GROUPS.flat();

const MENU_ONLY = ['list', 'ordered', 'link'] as const;

export function writingBarHidesMenuOnlyActions() {
  const bar = new Set<string>(WRITING_BAR_ACTION_IDS);
  return MENU_ONLY.every(id => !bar.has(id) && WRITING_MENU_ACTION_IDS.includes(id));
}
