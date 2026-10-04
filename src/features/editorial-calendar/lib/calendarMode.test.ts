import assert from 'node:assert/strict';
import {buildCalendarPath, parseCalendarViewMode} from './calendarMode.ts';

assert.equal(parseCalendarViewMode(null), 'month');
assert.equal(parseCalendarViewMode(undefined), 'month');
assert.equal(parseCalendarViewMode('agendar'), 'month');
assert.equal(parseCalendarViewMode('week'), 'week');
assert.equal(parseCalendarViewMode('agenda'), 'agenda');
assert.equal(parseCalendarViewMode('timeline'), 'timeline');

assert.equal(buildCalendarPath(), '/calendario');
assert.equal(buildCalendarPath('month'), '/calendario');
assert.equal(buildCalendarPath('week'), '/calendario?vista=week');

console.log('calendarMode.test.ts passed');
