import assert from 'node:assert/strict';
import {juntarTemas, separarTags} from './tagsTemas.ts';

assert.deepEqual(separarTags(['Gravar', '#Halloween', 'halloween', ' ', 'editar', 'dica  rápida']), {
  producao: ['gravar', 'editar'],
  temas: ['Halloween', 'dica rápida'],
});
assert.deepEqual(separarTags(undefined), {producao: [], temas: []});
assert.deepEqual(juntarTemas(['Halloween'], ['halloween', 'Natal'], undefined), ['Halloween', 'Natal']);

console.log('ok - mcp tags viram temas, gravar/editar ficam como produção');
