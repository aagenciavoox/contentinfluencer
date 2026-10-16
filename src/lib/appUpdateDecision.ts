export type NewVersionAction = 'reload' | 'prompt';

/** Nova versão do SW: recarrega direto só se não houver rascunho pendente. */
export function decideOnNewVersion(input: { hasUnsavedChanges: boolean }): NewVersionAction {
  return input.hasUnsavedChanges ? 'prompt' : 'reload';
}

/** Com o aviso na tela: recarrega sozinho quando tudo foi salvo e a aba está escondida. */
export function shouldAutoApplyPendingUpdate(input: {
  updatePending: boolean;
  hasUnsavedChanges: boolean;
  documentHidden: boolean;
  applying: boolean;
}): boolean {
  return input.updatePending && !input.applying && !input.hasUnsavedChanges && input.documentHidden;
}