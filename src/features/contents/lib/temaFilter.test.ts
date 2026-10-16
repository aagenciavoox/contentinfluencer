import assert from 'node:assert/strict';
import {
  matchesTemaFilter,
  migrateLegacyTemaParams,
  parseTemaFilterParam,
  serializeTemaFilterParam,
  temaIdsFromLegacyTags,
} from './temaFilter.ts';
import {immediateSaveUpdates} from './draftChanges.ts';

const temas = [{id: 't1', nome: 'Halloween'}, {id: 't2', nome: 'Dica rápida'}];

assert.deepEqual(parseTemaFilterParam('t1, t2,,t1'), ['t1', 't2']);
assert.deepEqual(parseTemaFilterParam(null, 't3'), ['t3']);
assert.equal(serializeTemaFilterParam(['t1', 't1', ' t2 ']), 't1,t2');

assert.equal(matchesTemaFilter(['t1'], []), true);
assert.equal(matchesTemaFilter(['t1'], ['t2', 't1']), true);
assert.equal(matchesTemaFilter([], ['t1']), false);
assert.equal(matchesTemaFilter(null, ['t1']), false);

assert.deepEqual(temaIdsFromLegacyTags('#halloween,DICA  rápida,sumiu', temas), ['t1', 't2']);
const migrated = migrateLegacyTemaParams(new URLSearchParams('tab=roteiros&tags=halloween&tema=t2'), temas);
assert.equal(migrated?.toString(), 'tab=roteiros&temas=t2%2Ct1');
assert.equal(migrateLegacyTemaParams(new URLSearchParams('temas=t1'), temas), null);
assert.equal(migrateLegacyTemaParams(new URLSearchParams('tags=sumiu'), temas)?.toString(), '');

// Temas gravam na hora, sem esperar o autosave.
assert.deepEqual(immediateSaveUpdates({temaIds: ['t1']}, {temaIds: ['t1', 't2']}), {temaIds: ['t1', 't2']});
assert.equal(immediateSaveUpdates({temaIds: ['t1']}, {temaIds: ['t1']}), null);
assert.equal(immediateSaveUpdates({temaIds: ['t1'], title: 'a'}, {title: 'b'}), null);

console.log('ok - tema filter (multi, legacy ?tema/?tags) and immediate tema save');
