import assert from 'node:assert/strict';
import {monthDate, monthIndex, activeMonthAt, extendMonthWindow} from './monthScroll.ts';

for (const date of [new Date(2026, 11, 31), new Date(2027, 0, 1), new Date(2024, 1, 29)]) {
  assert.equal(monthIndex(monthDate(monthIndex(date))), monthIndex(date));
}
assert.equal(monthDate(monthIndex(new Date(2026, 11, 31)) + 1).getFullYear(), 2027);
const sections = [{index: 1, top: -400, bottom: 190}, {index: 2, top: 190, bottom: 800}];
assert.equal(activeMonthAt(sections, 1, 200), 1, 'pequenas oscilações mantêm o mês ativo');
assert.equal(activeMonthAt(sections, 1, 230), 2, 'a troca ocorre quando o próximo mês assume o ponto de leitura');
assert.equal(activeMonthAt(sections, 2, 180), 2, 'a margem também estabiliza a volta');
assert.equal(activeMonthAt(sections, 2, 150), 1);
assert.deepEqual(extendMonthWindow({start: 1, end: 3}, -1), {start: 0, end: 3});
assert.deepEqual(extendMonthWindow({start: 1, end: 3}, 1), {start: 1, end: 4});
let range = {start: 1, end: 3};
for (let i = 0; i < 100; i++) range = extendMonthWindow(range, 1);
assert.equal(range.end, 103);
assert.equal(range.end - range.start + 1, 15);
for (let i = 0; i < 200; i++) range = extendMonthWindow(range, -1);
assert.equal(range.start, -111);
assert.equal(range.end - range.start + 1, 15);
console.log('ok - transições estáveis, virada do ano e carregamento mensal contínuo');
