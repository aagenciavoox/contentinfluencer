import assert from 'node:assert/strict';
import {
  applyUserTags,
  collectTagOptions,
  matchesTagFilter,
  normalizeTags,
  parseTagFilterParam,
  serializeTagFilterParam,
  userTags,
} from './contentTags.ts';

assert.deepEqual(normalizeTags([' #Livro ', 'livro', '', null, 'dica  rápida']), ['Livro', 'dica rápida']);
assert.deepEqual(userTags(['gravar', 'Halloween', 'EDITAR']), ['Halloween']);
assert.deepEqual(applyUserTags(['gravar', 'velha'], ['nova', 'Nova', 'editar']), ['gravar', 'nova']);
assert.deepEqual(applyUserTags(null, []), []);
assert.deepEqual(
  collectTagOptions([{tags: ['zebra', 'gravar']}, {tags: ['Ácido', 'Zebra']}, {tags: null}]),
  ['Ácido', 'zebra'],
);
assert.equal(matchesTagFilter(['Halloween'], []), true);
assert.equal(matchesTagFilter(['Halloween'], ['halloween', 'outra']), true);
assert.equal(matchesTagFilter(['gravar'], ['gravar']), false);
assert.equal(matchesTagFilter([], ['x']), false);
assert.deepEqual(parseTagFilterParam('a, b,,A'), ['a', 'b']);
assert.equal(serializeTagFilterParam(['a', 'b,c']), 'a,b c');
assert.deepEqual(parseTagFilterParam(serializeTagFilterParam(['dica rápida', 'livro'])), ['dica rápida', 'livro']);

console.log('ok - content tags normalize, preserve technical tags and filter');
