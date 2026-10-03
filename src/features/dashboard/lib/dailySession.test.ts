import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Content, RecordingBlock } from '../../../lib/database.ts';
import {
  buildDailySessionBlock,
  buildDailySessionName,
  getSessionCandidates,
  groupCandidatesBySeries,
  moveSessionId,
  resolveSessionSelection,
  suggestSessionIds,
  suggestionSummary,
  toggleSessionId,
} from './dailySession.ts';

function content(partial: Partial<Content> & Pick<Content, 'id'>): Content {
  return {
    userId: 'u1',
    title: partial.title ?? partial.id,
    status: 'Produção',
    tags: [],
    notes: '',
    script: 'texto',
    platforms: [],
    seriesId: null,
    pilarId: null,
    projectId: null,
    recordedAt: null,
    postedAt: null,
    scheduledAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: partial.updatedAt ?? '2026-01-02T00:00:00.000Z',
    archivedAt: null,
    deletedAt: null,
    ...partial,
  } as Content;
}

describe('dailySession', () => {
  it('lists queue contents that are not recorded and not in a block', () => {
    const ready = content({ id: 'a', updatedAt: '2026-09-07T12:00:00.000Z' });
    const recorded = content({ id: 'b', recordedAt: '2026-09-06T12:00:00.000Z' });
    const inBlock = content({ id: 'c' });
    const blocks: RecordingBlock[] = [
      {
        id: 'block-1',
        userId: 'u1',
        name: 'Bloco',
        createdAt: '2026-09-01T00:00:00.000Z',
        contents: [{ blockId: 'block-1', contentId: 'c', ordem: 0, gravado: false }],
      },
    ];

    const ids = getSessionCandidates([ready, recorded, inBlock], blocks).map(item => item.id);
    assert.deepEqual(ids, ['a']);
  });

  it('suggests every candidate when the list is already short', () => {
    const candidates = [content({ id: '1' }), content({ id: '2' })];
    assert.deepEqual(suggestSessionIds(candidates), ['1', '2']);
    assert.equal(suggestionSummary(candidates, []), 'Todos os roteiros prontos.');
  });

  it('suggests the largest series, capped at four', () => {
    const candidates = [
      content({ id: 'a1', seriesId: 'a', updatedAt: '2026-09-05T00:00:00.000Z' }),
      content({ id: 'b1', seriesId: 'b', updatedAt: '2026-09-04T00:00:00.000Z' }),
      content({ id: 'a2', seriesId: 'a', updatedAt: '2026-09-03T00:00:00.000Z' }),
      content({ id: 'loose', updatedAt: '2026-09-02T00:00:00.000Z' }),
      content({ id: 'a3', seriesId: 'a', updatedAt: '2026-09-01T00:00:00.000Z' }),
      content({ id: 'b2', seriesId: 'b', updatedAt: '2026-08-01T00:00:00.000Z' }),
    ];
    assert.deepEqual(suggestSessionIds(candidates), ['a1', 'a2', 'a3']);
    assert.equal(
      suggestionSummary(candidates, [{ id: 'a', name: 'Império do Vampiro' }]),
      'Sugestão da série Império do Vampiro.',
    );
  });

  it('breaks series ties by the most recently updated script', () => {
    const candidates = [
      content({ id: 'b1', seriesId: 'b', updatedAt: '2026-09-08T00:00:00.000Z' }),
      content({ id: 'a1', seriesId: 'a', updatedAt: '2026-09-02T00:00:00.000Z' }),
      content({ id: 'b2', seriesId: 'b', updatedAt: '2026-09-01T00:00:00.000Z' }),
      content({ id: 'a2', seriesId: 'a', updatedAt: '2026-08-01T00:00:00.000Z' }),
      content({ id: 'x', updatedAt: '2026-07-01T00:00:00.000Z' }),
    ];
    assert.deepEqual(suggestSessionIds(candidates), ['b1', 'b2']);
  });

  it('suggests the four most recent scripts when no series has a pair', () => {
    const candidates = Array.from({ length: 6 }, (_, index) => content({ id: `c${index}` }));
    assert.deepEqual(suggestSessionIds(candidates), ['c0', 'c1', 'c2', 'c3']);
    assert.equal(suggestionSummary(candidates, []), 'Sugestão com os roteiros mais recentes.');
  });

  it('groups named series by size and leaves loose scripts last', () => {
    const candidates = [
      content({ id: 'loose' }),
      content({ id: 'b1', seriesId: 'b' }),
      content({ id: 'a1', seriesId: 'a' }),
      content({ id: 'a2', seriesId: 'a' }),
    ];
    const groups = groupCandidatesBySeries(candidates, [
      { id: 'a', name: 'Império' },
      { id: 'b', name: 'POVS' },
    ]);
    assert.deepEqual(groups.map(group => group.label), ['Império', 'POVS', 'Avulsos']);
    assert.deepEqual(groups[0]?.items.map(item => item.id), ['a1', 'a2']);
  });

  it('appends on select, removes on toggle, and moves within the session order', () => {
    assert.deepEqual(toggleSessionId(['a'], 'b'), ['a', 'b']);
    assert.deepEqual(toggleSessionId(['a', 'b'], 'a'), ['b']);
    assert.deepEqual(moveSessionId(['a', 'b', 'c'], 'c', -1), ['a', 'c', 'b']);
    assert.deepEqual(moveSessionId(['a', 'b'], 'a', -1), ['a', 'b']);
  });

  it('keeps a saved session and drops ids that left the queue', () => {
    const candidates = [content({ id: 'a' }), content({ id: 'b' })];
    assert.deepEqual(
      resolveSessionSelection(candidates, { day: '2026-10-02', ids: ['b', 'gone'], touched: true }),
      ['b'],
    );
  });

  it('starts from the suggestion when the day has no draft', () => {
    const candidates = [content({ id: 'a' }), content({ id: 'b' })];
    assert.deepEqual(resolveSessionSelection(candidates, null), ['a', 'b']);
  });

  it('builds a named daily session block from selected ids', () => {
    const contents = [content({ id: 'a', tags: ['gravar'] }), content({ id: 'b' })];
    const result = buildDailySessionBlock({
      contents,
      contentIds: ['b', 'a'],
      userId: 'u1',
      now: new Date('2026-09-07T15:00:00.000Z'),
    });

    assert.ok(result);
    assert.equal(result.block.name, buildDailySessionName(new Date('2026-09-07T15:00:00.000Z')));
    assert.deepEqual(
      result.blockContents.map(item => item.contentId),
      ['b', 'a'],
    );
    assert.equal(result.block.metadata?.dailySession, true);
  });
});
