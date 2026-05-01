export type ModuleFlagKey =
  | 'library'
  | 'recording'
  | 'calendar'
  | 'projects'
  | 'analytics';

export type ModuleFlags = Record<ModuleFlagKey, boolean>;

export const MODULE_FLAGS_PREFERENCE_KEY = 'module_flags';

export const DEFAULT_MODULE_FLAGS: ModuleFlags = {
  library: true,
  recording: true,
  calendar: true,
  projects: true,
  analytics: true,
};

export function getModuleFlags(preferences: Record<string, unknown> | null | undefined): ModuleFlags {
  const raw = preferences?.[MODULE_FLAGS_PREFERENCE_KEY];
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_MODULE_FLAGS;
  }

  return {
    ...DEFAULT_MODULE_FLAGS,
    ...(raw as Partial<ModuleFlags>),
  };
}
