import assert from 'node:assert/strict';
import { getUserInitials } from './userInitials.ts';

function testInitialsFromFullName() {
  assert.equal(getUserInitials('Dizaianne Mendes'), 'DM');
}

function testInitialsFromSingleName() {
  assert.equal(getUserInitials('Anne'), 'AN');
}

function testInitialsFallback() {
  assert.equal(getUserInitials('   '), 'C');
}

const tests = [
  ['uses first and last initials', testInitialsFromFullName],
  ['uses two letters from a single name', testInitialsFromSingleName],
  ['falls back to C when empty', testInitialsFallback],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
