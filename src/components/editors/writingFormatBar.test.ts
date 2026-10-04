import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  WRITING_BAR_ACTION_IDS,
  WRITING_MENU_ACTION_IDS,
  writingBarHidesMenuOnlyActions,
} from './writingFormatBar.ts';

describe('writing format bar', () => {
  it('keeps list, numbered list, and link only in Mais', () => {
    assert.equal(writingBarHidesMenuOnlyActions(), true);
    assert.deepEqual([...WRITING_BAR_ACTION_IDS], ['undo', 'bold', 'italic']);
  });

  it('does not repeat a visible control inside Mais', () => {
    const bar = new Set<string>(WRITING_BAR_ACTION_IDS);
    for (const id of WRITING_MENU_ACTION_IDS) {
      assert.equal(bar.has(id), false);
    }
  });
});
