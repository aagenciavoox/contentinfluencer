import assert from 'node:assert/strict';
import { reservaPendente } from './reservaPendente.ts';

const HOJE = '2026-11-09';
assert.equal(reservaPendente({ contentId: null, date: '2026-11-08' }, HOJE), true);
assert.equal(reservaPendente({ contentId: null, date: '2026-11-09T00:00:00' }, HOJE), false);
assert.equal(reservaPendente({ contentId: null, date: '2026-11-10' }, HOJE), false);
assert.equal(reservaPendente({ contentId: 'c1', date: '2026-11-01' }, HOJE), false);
assert.equal(reservaPendente({ contentId: null, date: null }, HOJE), false);

console.log('reservaPendente tests passed');