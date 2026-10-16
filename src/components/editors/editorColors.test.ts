import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HIGHLIGHT_COLORS, HIGHLIGHT_INK, TEXT_COLORS, THEME_SURFACES } from './editorColors.ts';
import { hexContrastRatio, readableInkOn } from '../../lib/utils.ts';

describe('paletas do editor', () => {
  it('destaque: tinta escura legível (>= 7:1) em todas as cores', () => {
    for (const color of HIGHLIGHT_COLORS) {
      assert.equal(readableInkOn(color.value), HIGHLIGHT_INK, color.name);
      assert.ok((hexContrastRatio(HIGHLIGHT_INK, color.value) ?? 0) >= 7, color.name);
    }
  });

  it('cor do texto: >= 3,5:1 no tema claro e no escuro', () => {
    for (const color of TEXT_COLORS) {
      assert.ok((hexContrastRatio(color.value, THEME_SURFACES.light) ?? 0) >= 3.5, `${color.name} claro`);
      assert.ok((hexContrastRatio(color.value, THEME_SURFACES.dark) ?? 0) >= 3.5, `${color.name} escuro`);
    }
  });
});
