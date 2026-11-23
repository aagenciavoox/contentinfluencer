import assert from 'node:assert/strict';
import { htmlDosBlocos, lerBlocosYoutube } from './youtubeBlocos.ts';

const blocos = lerBlocosYoutube([
  { id: 'a', nome: '', roteiro: '<p>Antes</p>', referencias: 'som' },
  { id: 'b', nome: 'Abertura', roteiro: '<p>Gancho</p>', referencias: 'https://exemplo.com/a.jpg' },
]);

assert.equal(blocos?.length, 2);
assert.equal(blocos?.[1]?.referencias, 'https://exemplo.com/a.jpg');
const html = htmlDosBlocos(blocos ?? []);
assert.match(html, /^<p>Antes<\/p><h2 data-bloco="b">Abertura<\/h2><p>Gancho<\/p>$/);
assert.equal(html.includes('exemplo.com'), false);
assert.equal(lerBlocosYoutube(null), null);

console.log('ok - youtubeBlocos mcp');
