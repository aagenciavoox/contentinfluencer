import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  clampDraftSplitRatio,
  DEFAULT_DRAFT_SPLIT_RATIO,
  readDraftSplitRatio,
  writeDraftSplitRatio,
  writingNotesToHtml,
} from './writingDraftLayout.ts';

describe('writingDraftLayout', () => {
  it('keeps the draft ratio inside comfortable min widths', () => {
    assert.ok(clampDraftSplitRatio(DEFAULT_DRAFT_SPLIT_RATIO, 1200) > 0.2);
    assert.ok(clampDraftSplitRatio(0.05, 1000) >= 260 / 1000);
    assert.ok(clampDraftSplitRatio(0.95, 1000) <= 1 - 280 / 1000);
  });

  it('converts plain notes to HTML without wiping existing markup', () => {
    assert.equal(writingNotesToHtml(''), '');
    assert.equal(writingNotesToHtml('<p>Já em HTML</p>'), '<p>Já em HTML</p>');
    assert.equal(writingNotesToHtml('linha 1\n\nlinha 2'), '<p>linha 1</p><p>linha 2</p>');
    assert.equal(writingNotesToHtml('a\nb'), '<p>a<br>b</p>');
  });

  it('stores draft split ratio per device without clobbering the other', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
    };
    const previousWindow = (globalThis as {window?: unknown}).window;
    (globalThis as {window: {localStorage: typeof storage}}).window = {localStorage: storage};
    try {
      writeDraftSplitRatio(0.45, false);
      writeDraftSplitRatio(0.55, true);
      assert.equal(readDraftSplitRatio(false), 0.45);
      assert.equal(readDraftSplitRatio(true), 0.55);
      // Legado `ratio` alimenta só o desktop.
      memory.set('writing_draft_split_ratio', JSON.stringify({ratio: 0.33}));
      assert.equal(readDraftSplitRatio(false), 0.33);
      assert.equal(readDraftSplitRatio(true), DEFAULT_DRAFT_SPLIT_RATIO);
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as {window?: unknown}).window;
      } else {
        (globalThis as {window: unknown}).window = previousWindow;
      }
    }
  });
});
