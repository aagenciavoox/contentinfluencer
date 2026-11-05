import assert from 'node:assert/strict';
import type { Serie } from '../../../lib/database.ts';
import { passaSituacao } from './seriesListaView.ts';

const ativa = { id: 'a', ativa: true, status: 'ativa' } as unknown as Serie;
const rascunho = { id: 'r', ativa: false, status: 'rascunho' } as unknown as Serie;
const arquivada = { id: 'x', ativa: false, status: 'arquivada' } as unknown as Serie;
const antiga = { id: 'o', ativa: false } as unknown as Serie;

// Rascunho tem filtro próprio e sai de Inativas.
assert.deepEqual([ativa, rascunho, arquivada, antiga].filter(s => passaSituacao(s, 'rascunho', false)).map(s => s.id), ['r']);
assert.deepEqual([ativa, rascunho, arquivada, antiga].filter(s => passaSituacao(s, 'inativas', false)).map(s => s.id), ['x', 'o']);
assert.deepEqual([ativa, rascunho, arquivada, antiga].filter(s => passaSituacao(s, 'ativas', false)).map(s => s.id), ['a']);
assert.equal([ativa, rascunho, arquivada, antiga].filter(s => passaSituacao(s, 'todas', false)).length, 4);

console.log('seriesListaView.test.ts ok');
