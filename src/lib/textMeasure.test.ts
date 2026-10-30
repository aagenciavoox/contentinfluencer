import assert from 'node:assert/strict';
import { contagemDeTexto, contagemDeQuantidade, partesValorVazio } from './textMeasure.ts';

const vazio = partesValorVazio();
assert.equal(vazio.visual, '—');
assert.equal(vazio.leitor, 'sem valor');

assert.equal(contagemDeTexto('a'.repeat(120), 2200).texto, '120 / 2.200');
assert.equal(contagemDeTexto('a'.repeat(120)).texto, '120 caracteres');
assert.equal(contagemDeTexto('um dois tres', null, 'words').texto, '3 palavras');
assert.equal(contagemDeTexto('abcd', 2).tom, 'acima');
assert.equal(contagemDeTexto('a'.repeat(90), 100).tom, 'perto');

assert.equal(contagemDeTexto('').texto, '0 caracteres');
assert.equal(contagemDeTexto('x').texto, '1 caractere');
assert.equal(contagemDeTexto('um', null, 'words').texto, '1 palavra');
assert.equal(contagemDeTexto('  um\n dois   ', null, 'words').texto, '2 palavras');
assert.equal(contagemDeQuantidade(1234, null, 'words').texto, '1.234 palavras');
assert.equal(contagemDeQuantidade(2200, 2200).tom, 'perto');
assert.equal(contagemDeQuantidade(2201, 2200).tom, 'acima');
assert.equal(contagemDeQuantidade(0, 0).tom, 'ok');
console.log('textMeasure.test.ts passed');
