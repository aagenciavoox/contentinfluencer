import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  WRITING_BAR_ACTION_IDS,
  WRITING_BAR_GROUPS,
  WRITING_COLLAPSIBLE_GROUPS,
  fitWritingGroups,
  writingOverflowItemIds,
} from './writingFormatBar.ts';

describe('writing format bar', () => {
  it('shows every control in Docs-like groups, without a Mais menu', () => {
    assert.deepEqual(WRITING_BAR_GROUPS.map(group => group.id), [
      'history', 'style', 'typography', 'format', 'insert', 'paragraph', 'tools',
    ]);
    for (const id of ['undo', 'redo', 'bold', 'italic', 'underline', 'highlight', 'text-color', 'link', 'comment', 'list', 'ordered', 'indent', 'outdent', 'clear', 'find']) {
      assert.ok(WRITING_BAR_ACTION_IDS.includes(id), id);
    }
    assert.equal(new Set(WRITING_BAR_ACTION_IDS).size, WRITING_BAR_ACTION_IDS.length);
  });

  it('never collapses the basics', () => {
    assert.deepEqual(WRITING_COLLAPSIBLE_GROUPS, ['insert', 'paragraph', 'tools']);
  });

  it('collapses the last groups first when the bar is narrow', () => {
    const widths = [80, 200, 110];
    assert.equal(fitWritingGroups({ available: 1000, fixed: 500, widths, overflowWidth: 36 }), 3);
    assert.equal(fitWritingGroups({ available: 889, fixed: 500, widths, overflowWidth: 36 }), 2);
    assert.equal(fitWritingGroups({ available: 700, fixed: 500, widths, overflowWidth: 36 }), 1);
    assert.equal(fitWritingGroups({ available: 520, fixed: 500, widths, overflowWidth: 36 }), 0);
  });

  it('lists the hidden controls in the overflow menu', () => {
    assert.deepEqual(writingOverflowItemIds(['tools']), ['rule', 'clear', 'find']);
    assert.deepEqual(writingOverflowItemIds(['paragraph']).slice(0, 4), ['align-left', 'align-center', 'align-right', 'align-justify']);
  });
});
