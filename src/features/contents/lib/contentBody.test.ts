import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isContentBodyLoaded } from './contentBody.ts';
import type { Content } from '../../../lib/database.ts';
import { sanitizeDomainPayload } from '../../../lib/persistentDataCache.ts';

function content(partial: Partial<Content>): Content {
  return partial as Content;
}

describe('isContentBodyLoaded', () => {
  it('returns false for schedule rows without body fields', () => {
    assert.equal(isContentBodyLoaded(content({})), false);
  });

  it('returns true when script was loaded even if empty', () => {
    assert.equal(isContentBodyLoaded(content({ script: null })), true);
  });

  it('returns true when notes or referencias were loaded', () => {
    assert.equal(isContentBodyLoaded(content({ notes: null })), true);
    assert.equal(isContentBodyLoaded(content({ referencias: '' })), true);
  });

  it('keeps cached summaries marked as body not loaded', () => {
    const cached = sanitizeDomainPayload({
      contents: [content({
        script: '<p>Roteiro completo</p>',
        notes: 'Notas',
        referencias: 'Referências',
        scriptNotes: [],
      })],
    });
    const cachedContent = cached.contents?.[0];

    assert.ok(cachedContent);
    assert.equal(cachedContent.script, undefined);
    assert.equal(cachedContent.notes, undefined);
    assert.equal(cachedContent.referencias, undefined);
    assert.equal(isContentBodyLoaded(cachedContent), false);
  });
});
