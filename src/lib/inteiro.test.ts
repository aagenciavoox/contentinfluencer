import assert from 'node:assert/strict';
import { inteiroNaoNegativo } from './inteiro.ts';

assert.equal(inteiroNaoNegativo(''), null);
assert.equal(inteiroNaoNegativo('  '), null);
assert.equal(inteiroNaoNegativo('0'), 0);
assert.equal(inteiroNaoNegativo('15'), 15);
assert.equal(inteiroNaoNegativo('1.5'), null);
assert.equal(inteiroNaoNegativo('-1'), null);
assert.equal(inteiroNaoNegativo('1e2'), null);
assert.equal(inteiroNaoNegativo('quinze'), null);

console.log('ok - inteiro nao negativo');
