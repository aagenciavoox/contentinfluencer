export const WRITING_WORKSPACE_PREFERENCE_KEY = 'writing_workspace';

export interface WritingWorkspaceSettings {
  enabled: boolean;
}

export const DEFAULT_WRITING_WORKSPACE: WritingWorkspaceSettings = {
  enabled: false,
};

export function getWritingWorkspaceSettings(
  preferences: Record<string, unknown> | null | undefined,
): WritingWorkspaceSettings {
  const raw = preferences?.[WRITING_WORKSPACE_PREFERENCE_KEY];
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_WRITING_WORKSPACE;
  }

  const enabled = (raw as {enabled?: unknown}).enabled;
  return {
    enabled: typeof enabled === 'boolean' ? enabled : DEFAULT_WRITING_WORKSPACE.enabled,
  };
}

export function isWritingWorkspaceEnabled(
  preferences: Record<string, unknown> | null | undefined,
) {
  return getWritingWorkspaceSettings(preferences).enabled;
}
