import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCurrentRead } from './currentRead.ts';

const book = (partial: { id: string; tipo?: string; status?: string; deletedAt?: string | null }) => ({
  tipo: 'livro',
  status: 'Lendo',
  deletedAt: null,
  ...partial,
});

describe('resolveCurrentRead', () => {
  it('prefers the pinned item', () => {
    const items = [book({ id: 'a' }), book({ id: 'b', status: 'Quero ler' })];
    assert.equal(resolveCurrentRead(items, 'b')?.id, 'b');
  });

  it('picks the book in progress before other active media', () => {
    const items = [
      book({ id: 'show', tipo: 'série', status: 'Assistindo' }),
      book({ id: 'novel', tipo: 'livro', status: 'Lendo' }),
    ];
    assert.equal(resolveCurrentRead(items, null)?.id, 'novel');
  });

  it('ignores deleted items and returns null when nothing is in progress', () => {
    const items = [book({ id: 'gone', deletedAt: '2026-01-01' }), book({ id: 'shelf', status: 'Quero ler' })];
    assert.equal(resolveCurrentRead(items, null), null);
  });
});
