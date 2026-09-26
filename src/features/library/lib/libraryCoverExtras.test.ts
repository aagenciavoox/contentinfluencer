import assert from 'node:assert/strict';
import { coverInitial, libraryCoverPathFromUrl } from './libraryCoverFile.ts';

assert.equal(coverInitial('Duna'), 'D');
assert.equal(coverInitial('  árvore'), 'Á');
assert.equal(coverInitial(''), '?');

assert.equal(
  libraryCoverPathFromUrl(
    'https://aftffcaychrfffefkeoj.supabase.co/storage/v1/object/public/library-covers/user-1/item-1/abc.jpeg',
  ),
  'user-1/item-1/abc.jpeg',
);
assert.equal(libraryCoverPathFromUrl('https://cdn.example.com/cover.jpg'), null);
assert.equal(libraryCoverPathFromUrl(null), null);

console.log('libraryCoverExtras.test.ts: ok');
