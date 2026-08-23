import assert from 'node:assert/strict';
import {
  buildCalendarPath,
  parseCalendarMode,
} from './calendarMode.ts';

assert.equal(parseCalendarMode(null), 'ver');
assert.equal(parseCalendarMode(undefined), 'ver');
assert.equal(parseCalendarMode('ver'), 'ver');
assert.equal(parseCalendarMode('agenda'), 'ver');
assert.equal(parseCalendarMode('agendar'), 'agendar');

assert.equal(buildCalendarPath(), '/calendario');
assert.equal(buildCalendarPath('ver'), '/calendario');
assert.equal(buildCalendarPath('agendar'), '/calendario?modo=agendar');

console.log('calendarMode.test.ts passed');
