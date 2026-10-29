export const WRITING_WORKSPACE_PREFERENCE_KEY = 'writing_workspace';

export interface WritingWorkspaceSettings {
  enabled: boolean;
  /** Abre o rascunho de apoio ao entrar em um roteiro (modo de escrita). */
  openDraftByDefault: boolean;
}

export const DEFAULT_WRITING_WORKSPACE: WritingWorkspaceSettings = {
  enabled: false,
  openDraftByDefault: true,
};

export function getWritingWorkspaceSettings(
  preferences: Record<string, unknown> | null | undefined,
): WritingWorkspaceSettings {
  const raw = preferences?.[WRITING_WORKSPACE_PREFERENCE_KEY];
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_WRITING_WORKSPACE;
  }

  const value = raw as {enabled?: unknown; openDraftByDefault?: unknown};
  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : DEFAULT_WRITING_WORKSPACE.enabled,
    openDraftByDefault: typeof value.openDraftByDefault === 'boolean'
      ? value.openDraftByDefault
      : DEFAULT_WRITING_WORKSPACE.openDraftByDefault,
  };
}

export function isWritingWorkspaceEnabled(
  preferences: Record<string, unknown> | null | undefined,
) {
  return getWritingWorkspaceSettings(preferences).enabled;
}

export function shouldOpenDraftByDefault(
  preferences: Record<string, unknown> | null | undefined,
) {
  const settings = getWritingWorkspaceSettings(preferences);
  return settings.enabled && settings.openDraftByDefault;
}
