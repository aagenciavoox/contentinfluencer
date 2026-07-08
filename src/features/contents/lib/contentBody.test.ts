import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isContentBodyLoaded } from './contentBody.ts';
import type { Content } from '../../../lib/database.ts';

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
});
