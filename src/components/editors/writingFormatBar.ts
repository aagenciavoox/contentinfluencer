/**
 * Barra de Escrita do roteiro (computador):
 * [+ Inserir] [desfazer refazer] [estilo ▾] [B I link] [Formatar ▾] …
 * [Comentários] [Rascunho] [Modo foco]
 * Em telas estreitas estilo e marcas caem no menu Formatar.
 */
export type WritingBarGroupId = 'insert' | 'history' | 'style' | 'marks' | 'formatMenu';

export interface WritingBarGroup {
  id: WritingBarGroupId;
  /** Controles do grupo, na ordem da barra. */
  items: readonly string[];
  /** Pode ir para o Formatar em telas estreitas. O básico nunca vai. */
  collapsible: boolean;
}

export const WRITING_BAR_GROUPS: readonly WritingBarGroup[] = [
  {id: 'insert', items: ['insert'], collapsible: false},
  {id: 'history', items: ['undo', 'redo'], collapsible: false},
  {id: 'style', items: ['style'], collapsible: true},
  {id: 'marks', items: ['bold', 'italic', 'link'], collapsible: true},
  /** Sempre um menu; conteúdos extras entram quando a barra aperta. */
  {id: 'formatMenu', items: ['format'], collapsible: false},
];

export const WRITING_BAR_ACTION_IDS = WRITING_BAR_GROUPS.flatMap(group => group.items);

/** Grupos que podem cair no Formatar em telas estreitas (o último sai primeiro). */
export const WRITING_COLLAPSIBLE_GROUPS = WRITING_BAR_GROUPS
  .filter(group => group.collapsible)
  .map(group => group.id);

/** Itens fixos do menu Formatar (não duplicam a barra principal). */
export const WRITING_FORMAT_MENU_IDS = [
  'underline',
  'text-color',
  'highlight',
  'list',
  'ordered',
  'align-left',
  'align-center',
  'align-right',
  'align-justify',
  'outdent',
  'indent',
  'strike',
  'rule',
  'clear',
  'repair',
  'find',
] as const;

/** Itens do overflow quando um grupo some da barra. */
const OVERFLOW_ITEMS: Partial<Record<WritingBarGroupId, readonly string[]>> = {
  style: ['paragraph', 'h1', 'h2', 'quote'],
  marks: ['bold', 'italic', 'link'],
};

export function writingOverflowItemIds(hidden: readonly WritingBarGroupId[]): string[] {
  return hidden.flatMap(id => OVERFLOW_ITEMS[id] ?? []);
}

/**
 * Quantos grupos recolhíveis cabem: o básico e a ponta direita sempre ficam; se algum grupo
 * sair, sobra espaço também para o botão Formatar. Larguras desconhecidas contam como 0.
 */
export function fitWritingGroups({
  available,
  fixed,
  widths,
  overflowWidth,
}: {
  available: number;
  fixed: number;
  widths: readonly number[];
  overflowWidth: number;
}): number {
  for (let count = widths.length; count > 0; count -= 1) {
    const groups = widths.slice(0, count).reduce((sum, width) => sum + Math.max(0, width), 0);
    const overflow = count < widths.length ? overflowWidth : 0;
    if (fixed + groups + overflow <= available) return count;
  }
  return 0;
}
