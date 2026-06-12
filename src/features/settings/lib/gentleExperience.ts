export const GENTLE_EXPERIENCE_PREFERENCE_KEY = 'gentle_experience';

export interface GentleExperienceSettings {
  enabled: boolean;
  pauseMode: boolean;
  calmSuggestions: boolean;
  dashboardCounts: boolean;
  realDeadlineHighlights: boolean;
}

export const DEFAULT_GENTLE_EXPERIENCE: GentleExperienceSettings = {
  enabled: true,
  pauseMode: false,
  calmSuggestions: true,
  dashboardCounts: true,
  realDeadlineHighlights: false,
};

function readBooleanSetting(
  source: Partial<Record<keyof GentleExperienceSettings, unknown>>,
  key: keyof GentleExperienceSettings
) {
  const value = source[key];
  return typeof value === 'boolean' ? value : DEFAULT_GENTLE_EXPERIENCE[key];
}

export function getGentleExperienceSettings(
  preferences: Record<string, unknown> | null | undefined
): GentleExperienceSettings {
  const raw = preferences?.[GENTLE_EXPERIENCE_PREFERENCE_KEY];
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_GENTLE_EXPERIENCE;
  }

  const saved = raw as Partial<Record<keyof GentleExperienceSettings, unknown>>;

  return {
    enabled: readBooleanSetting(saved, 'enabled'),
    pauseMode: readBooleanSetting(saved, 'pauseMode'),
    calmSuggestions: readBooleanSetting(saved, 'calmSuggestions'),
    dashboardCounts: readBooleanSetting(saved, 'dashboardCounts'),
    realDeadlineHighlights: readBooleanSetting(saved, 'realDeadlineHighlights'),
  };
}
