import assert from 'node:assert/strict';
import {
  DEFAULT_WRITING_WORKSPACE,
  WRITING_WORKSPACE_PREFERENCE_KEY,
  getWritingWorkspaceSettings,
  isWritingWorkspaceEnabled,
  shouldOpenDraftByDefault,
} from './writingWorkspace.ts';

function testStartsDisabledForEveryAccount() {
  assert.deepEqual(getWritingWorkspaceSettings({}), DEFAULT_WRITING_WORKSPACE);
  assert.equal(isWritingWorkspaceEnabled(null), false);
  assert.equal(isWritingWorkspaceEnabled(undefined), false);
  assert.equal(isWritingWorkspaceEnabled({gentle_experience: {enabled: true}}), false);
  assert.equal(shouldOpenDraftByDefault({}), false);
}

function testReadsSavedToggle() {
  assert.equal(
    isWritingWorkspaceEnabled({
      [WRITING_WORKSPACE_PREFERENCE_KEY]: {enabled: true},
    }),
    true,
  );
  assert.equal(
    isWritingWorkspaceEnabled({
      [WRITING_WORKSPACE_PREFERENCE_KEY]: {enabled: false},
    }),
    false,
  );
}

function testOpenDraftByDefault() {
  assert.equal(
    shouldOpenDraftByDefault({
      [WRITING_WORKSPACE_PREFERENCE_KEY]: {enabled: true},
    }),
    true,
  );
  assert.equal(
    shouldOpenDraftByDefault({
      [WRITING_WORKSPACE_PREFERENCE_KEY]: {enabled: true, openDraftByDefault: false},
    }),
    false,
  );
  assert.equal(
    getWritingWorkspaceSettings({
      [WRITING_WORKSPACE_PREFERENCE_KEY]: {enabled: true, openDraftByDefault: false},
    }).openDraftByDefault,
    false,
  );
}

function testIgnoresInvalidPreference() {
  assert.deepEqual(
    getWritingWorkspaceSettings({[WRITING_WORKSPACE_PREFERENCE_KEY]: 'on'}),
    DEFAULT_WRITING_WORKSPACE,
  );
  assert.equal(
    isWritingWorkspaceEnabled({
      [WRITING_WORKSPACE_PREFERENCE_KEY]: {enabled: 'true'},
    }),
    false,
  );
}

const tests = [
  ['starts disabled for every account', testStartsDisabledForEveryAccount],
  ['reads the saved writing workspace toggle', testReadsSavedToggle],
  ['open draft by default follows settings', testOpenDraftByDefault],
  ['ignores invalid writing workspace preference', testIgnoresInvalidPreference],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
