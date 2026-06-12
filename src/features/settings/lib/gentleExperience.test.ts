import assert from 'node:assert/strict';
import {
  DEFAULT_GENTLE_EXPERIENCE,
  GENTLE_EXPERIENCE_PREFERENCE_KEY,
  getGentleExperienceSettings,
} from './gentleExperience.ts';

function testDefaultsToGentleExperience() {
  assert.deepEqual(getGentleExperienceSettings({}), DEFAULT_GENTLE_EXPERIENCE);
  assert.equal(getGentleExperienceSettings(null).enabled, true);
  assert.equal(getGentleExperienceSettings(undefined).calmSuggestions, true);
}

function testMergesSavedPartialPreferences() {
  const settings = getGentleExperienceSettings({
    [GENTLE_EXPERIENCE_PREFERENCE_KEY]: {
      dashboardCounts: false,
    },
  });

  assert.equal(settings.enabled, true);
  assert.equal(settings.pauseMode, false);
  assert.equal(settings.calmSuggestions, true);
  assert.equal(settings.dashboardCounts, false);
  assert.equal(settings.realDeadlineHighlights, false);
}

function testIgnoresInvalidPreferenceShape() {
  assert.deepEqual(
    getGentleExperienceSettings({ [GENTLE_EXPERIENCE_PREFERENCE_KEY]: 'off' }),
    DEFAULT_GENTLE_EXPERIENCE
  );
}

function testIgnoresInvalidIndividualValues() {
  const settings = getGentleExperienceSettings({
    [GENTLE_EXPERIENCE_PREFERENCE_KEY]: {
      enabled: 'false',
      pauseMode: true,
      calmSuggestions: null,
      dashboardCounts: 0,
      realDeadlineHighlights: false,
    },
  });

  assert.equal(settings.enabled, true);
  assert.equal(settings.pauseMode, true);
  assert.equal(settings.calmSuggestions, true);
  assert.equal(settings.dashboardCounts, true);
  assert.equal(settings.realDeadlineHighlights, false);
}

const tests = [
  ['defaults to gentle experience', testDefaultsToGentleExperience],
  ['merges saved partial gentle preferences', testMergesSavedPartialPreferences],
  ['ignores invalid gentle preference shape', testIgnoresInvalidPreferenceShape],
  ['ignores invalid individual gentle preference values', testIgnoresInvalidIndividualValues],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
