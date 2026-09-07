import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Content, RecordingBlock } from '../../../lib/database.ts';
import {
  buildDailySessionBlock,
  buildDailySessionName,
  defaultSelectedSessionIds,
  getSessionCandidates,
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

  it('auto-selects all candidates when the list is small', () => {
    const candidates = [content({ id: '1' }), content({ id: '2' })];
    assert.deepEqual(defaultSelectedSessionIds(candidates), ['1', '2']);
  });

  it('does not auto-select when there are many candidates', () => {
    const candidates = Array.from({ length: 6 }, (_, index) => content({ id: `c${index}` }));
    assert.deepEqual(defaultSelectedSessionIds(candidates), []);
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
