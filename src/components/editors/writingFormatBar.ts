/**
 * Barra de Escrita do roteiro (computador):
 * [Bloco] [desfazer refazer] | [estilo ▾] [fonte ▾] [− tamanho +] | [B I U, cor, destaque, listas]
 * | [link, comentário] | [alinhar ▾, recuos] | secundários em "Mais opções" …
 * [Comentários] [Rascunho] [Modo foco]
 * Em telas estreitas os grupos recolhíveis caem no "⋯", do fim para o começo.
 */
export type WritingBarGroupId = 'history' | 'style' | 'typography' | 'format' | 'insert' | 'paragraph' | 'tools';

export interface WritingBarGroup {
  id: WritingBarGroupId;
  /** Controles do grupo, na ordem da barra. */
  items: readonly string[];
  /** Pode ir para o "⋯" em telas estreitas. O básico nunca vai. */
  collapsible: boolean;
}

export const WRITING_BAR_GROUPS: readonly WritingBarGroup[] = [
  { id: 'history', items: ['undo', 'redo'], collapsible: false },
  { id: 'style', items: ['style'], collapsible: false },
  { id: 'typography', items: ['font', 'size'], collapsible: false },
  { id: 'format', items: ['bold', 'italic', 'underline', 'text-color', 'highlight', 'list', 'ordered', 'link'], collapsible: false },
  { id: 'insert', items: ['comment'], collapsible: true },
  { id: 'paragraph', items: ['align', 'outdent', 'indent'], collapsible: true },
  /** Sempre no menu "Mais opções", nunca na barra principal. */
  { id: 'tools', items: ['strike', 'rule', 'clear', 'repair', 'find'], collapsible: false },
];

export const WRITING_BAR_ACTION_IDS = WRITING_BAR_GROUPS.flatMap(group => group.items);

/** Grupos que podem cair no overflow em telas estreitas (o último sai primeiro). */
export const WRITING_COLLAPSIBLE_GROUPS = WRITING_BAR_GROUPS
  .filter(group => group.collapsible)
  .map(group => group.id);

/** Itens sempre presentes em "Mais opções". */
export const WRITING_ALWAYS_MORE_IDS = ['strike', 'rule', 'clear', 'repair', 'find'] as const;

/** Itens do overflow para um grupo escondido (o alinhamento vira as quatro opções). */
const OVERFLOW_ITEMS: Partial<Record<WritingBarGroupId, readonly string[]>> = {
  insert: ['comment'],
  paragraph: ['align-left', 'align-center', 'align-right', 'align-justify', 'outdent', 'indent'],
};

export function writingOverflowItemIds(hidden: readonly WritingBarGroupId[]): string[] {
  return hidden.flatMap(id => OVERFLOW_ITEMS[id] ?? []);
}

/**
 * Quantos grupos recolhíveis cabem: o básico e a ponta direita sempre ficam; se algum grupo
 * sair, sobra espaço também para o botão "⋯". Larguras desconhecidas contam como 0.
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
