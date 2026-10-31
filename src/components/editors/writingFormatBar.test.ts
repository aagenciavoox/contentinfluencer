import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  WRITING_BAR_ACTION_IDS,
  WRITING_BAR_GROUPS,
  WRITING_COLLAPSIBLE_GROUPS,
  WRITING_FORMAT_MENU_IDS,
  fitWritingGroups,
  writingOverflowItemIds,
} from './writingFormatBar.ts';

describe('writing format bar', () => {
  it('keeps Inserir, histórico e Formatar fixos; estilo e marcas recolhem', () => {
    assert.deepEqual(WRITING_BAR_GROUPS.map(group => group.id), [
      'insert', 'history', 'style', 'marks', 'formatMenu',
    ]);
    for (const id of ['insert', 'undo', 'redo', 'style', 'bold', 'italic', 'link', 'format']) {
      assert.ok(WRITING_BAR_ACTION_IDS.includes(id), id);
    }
    assert.equal(new Set(WRITING_BAR_ACTION_IDS).size, WRITING_BAR_ACTION_IDS.length);
    assert.ok(WRITING_FORMAT_MENU_IDS.includes('underline'));
    assert.ok(WRITING_FORMAT_MENU_IDS.includes('list'));
    assert.equal((WRITING_FORMAT_MENU_IDS as readonly string[]).includes('bold'), false);
  });

  it('never collapses Inserir/histórico/Formatar', () => {
    assert.deepEqual(WRITING_COLLAPSIBLE_GROUPS, ['style', 'marks']);
  });

  it('collapses the last groups first when the bar is narrow', () => {
    const widths = [80, 120];
    assert.equal(fitWritingGroups({available: 1000, fixed: 500, widths, overflowWidth: 0}), 2);
    assert.equal(fitWritingGroups({available: 620, fixed: 500, widths, overflowWidth: 0}), 1);
    assert.equal(fitWritingGroups({available: 500, fixed: 500, widths, overflowWidth: 0}), 0);
  });

  it('lists hidden style and marks inside Formatar', () => {
    assert.deepEqual(writingOverflowItemIds(['style']), ['paragraph', 'h1', 'h2', 'quote']);
    assert.deepEqual(writingOverflowItemIds(['marks']), ['bold', 'italic', 'link']);
  });
});
