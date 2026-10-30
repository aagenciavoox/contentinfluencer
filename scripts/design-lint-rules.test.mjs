import assert from 'node:assert/strict';
import test from 'node:test';
import { dateFormattingViolations, tokenViolations, isTokenMigrated } from './design-lint-rules.mjs';

const view = 'src/features/contents/Example.tsx';
const dates = code => dateFormattingViolations(view, code);

test('visible date calls in JSX and helpers, including spacing, optional and bracket access', () => {
  for (const code of [
    'const x = <span>{date.toLocaleDateString()}</span>;',
    'export const label = date.toLocaleDateString /* comment */ ("pt-BR");',
    'const x = date?.toLocaleDateString?.();',
    'const x = date["toLocaleDateString"]();',
    'const x = date[\'toLocaleDateString\']?.();',
    'export function format(date) { return date.toLocaleDateString(); }',
  ]) assert.equal(dates(code).length, 1, code);
});

test('comments, examples, unrelated methods, calculations and persistence are inert', () => {
  assert.equal(dates('// date.toLocaleDateString()\nconst example = "date.toLocaleDateString()";').length, 0);
  assert.equal(dates('const x = date.toLocaleString(); const iso = date.toISOString(); const day = date.getDate();').length, 0);
  assert.equal(dates('const key = "toLocaleDateString"; const value = date.toLocaleDateString;').length, 0);
  assert.equal(dates('console.debug(date.toLocaleDateString());').length, 0);
  assert.equal(dates('console.log(() => date.toLocaleDateString());').length, 1);
});

test('owners are exact paths and tests can exercise formatters', () => {
  for (const file of ['src/lib/dates.ts', 'src/components/ui/PropertyDatePicker.tsx', 'src/components/ui/TimeField.tsx', 'src/components/calendar/CalendarMiniMonth.tsx', 'src/lib/dates.test.ts']) {
    assert.equal(dateFormattingViolations(file, 'date.toLocaleDateString()').length, 0, file);
  }
  assert.equal(dateFormattingViolations('src/features/contents/PropertyDatePicker.tsx', 'date.toLocaleDateString()').length, 1);
  assert.equal(dateFormattingViolations('C:\\repo\\src\\lib\\dates.ts', 'date.toLocaleDateString()').length, 0);
});

test('a technical exception needs category and reason and applies to one statement', () => {
  const allowed = '// design-lint-allow-date: integration — third-party date key\nconst key = date.toLocaleDateString("en-CA");';
  assert.equal(dates(allowed).length, 0);
  assert.equal(dates(allowed + '\nconst label = date.toLocaleDateString();').length, 1);
  assert.equal(dates('// design-lint-allow-date: integration\nconst label = date.toLocaleDateString();').length, 1);
  assert.equal(dates('// design-lint-allow-date: display — label\nconst label = date.toLocaleDateString();').length, 1);
});

test('tokens are errors only in migrated folders; legacy remains gradual', () => {
  assert.equal(isTokenMigrated(view), true);
  assert.equal(isTokenMigrated('src/features/creation/Example.tsx'), false);
  assert.equal(isTokenMigrated('src/features/contents-old/Example.tsx'), false);
  assert.equal(tokenViolations(view, 'const x = <p className="text-sm rounded-[22px]">Text</p>;').length, 2);
  assert.equal(tokenViolations(view, 'const x = <p className="t-body rounded-[var(--radius-card)] rounded-full rounded-r-none">Text</p>;').length, 0);
  assert.equal(tokenViolations(view, 'const x = <p className="md:text-xs focus:rounded-lg">Text</p>;').length, 2);
  assert.equal(tokenViolations(view, '// text-sm rounded-lg\nconst help = "avoid text-sm and rounded-lg";').length, 0);
});
