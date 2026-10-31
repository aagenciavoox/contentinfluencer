import assert from 'node:assert/strict';
import type { Anotacao } from '../../../lib/database.ts';
import { dia } from '../../../lib/dates.ts';
import {
  avaliacaoGeralDosCriterios,
  formatarNota,
  lerAvaliacaoCriterios,
  mediaDosCriterios,
  normalizarNota,
} from './avaliacaoCriterios.ts';
import {
  annotationsExportFilename,
  buildAnnotationExportEntries,
  buildRatingExportLines,
  createAnnotationsDocxBlob,
} from './exportAnnotationsDocx.ts';

function anotacao(overrides: Partial<Anotacao> = {}): Anotacao {
  return {
    id: 'a-1',
    userId: 'user-1',
    itemId: 'item-1',
    texto: 'Texto da anotação',
    tipo: 'Anotação',
    capituloRef: null,
    destilada: false,
    contentPotential: false,
    createdAt: '2026-10-20T12:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

// Notas: de 0 a 5, de meia em meia.
assert.equal(normalizarNota(4.5), 4.5);
assert.equal(normalizarNota(4.3), 4.5);
assert.equal(normalizarNota('3,5'), 3.5);
assert.equal(normalizarNota(7), 5);
assert.equal(normalizarNota(-1), 0);
assert.equal(normalizarNota('abc'), undefined);
assert.deepEqual(
  lerAvaliacaoCriterios({ escrita: 4, plot: '4.5', inventado: 3, cenario: null }),
  { escrita: 4, plot: 4.5 },
);
assert.equal(lerAvaliacaoCriterios({}), undefined);
assert.equal(lerAvaliacaoCriterios(null), undefined);
assert.equal(formatarNota(4.5), '4,5');
assert.equal(formatarNota(4), '4');

// A nota geral do item é a média arredondada, de 1 a 5.
const criterios = { personagens: 4.5, escrita: 4, cenario: 4, divertimento: 5, envolvimento: 5, plot: 4 };
assert.equal(mediaDosCriterios(criterios), 26.5 / 6);
assert.equal(avaliacaoGeralDosCriterios(criterios), 4);
assert.equal(avaliacaoGeralDosCriterios({ escrita: 0 }), 1);
assert.equal(avaliacaoGeralDosCriterios({}), undefined);

assert.deepEqual(buildRatingExportLines(criterios), [
  'Desenvolvimento dos personagens: 4.5/5',
  'Escrita: 4/5',
  'Cenário: 4/5',
  'Divertimento: 5/5',
  'Envolvimento: 5/5',
  'Plot: 4/5',
]);
assert.deepEqual(buildRatingExportLines({ plot: 3 }), ['Plot: 3/5']);
assert.deepEqual(buildRatingExportLines(undefined), []);

// Anotações: todas, da mais antiga para a mais nova, com tipo, destaque e referência.
const entries = buildAnnotationExportEntries([
  anotacao({ id: 'nova', texto: 'Segunda', createdAt: '2026-10-22T12:00:00.000Z' }),
  anotacao({
    id: 'antiga',
    tipo: 'Trecho',
    texto: '  Primeira linha\r\nSegunda linha  ',
    contentPotential: true,
    capituloRef: 'Cap. 3',
    createdAt: '2026-10-01T12:00:00.000Z',
  }),
  anotacao({ id: 'vazia', texto: '   ' }),
  anotacao({ id: 'apagada', deletedAt: '2026-10-23T12:00:00.000Z' }),
]);
assert.deepEqual(entries.map(entry => entry.id), ['antiga', 'nova']);
assert.equal(entries[0]?.rotulo, 'Trecho · Destaque · Cap. 3');
assert.equal(entries[0]?.texto, 'Primeira linha\nSegunda linha');
assert.equal(entries[0]?.data, dia('2026-10-01T12:00:00.000Z'));
assert.equal(entries[1]?.rotulo, 'Anotação');

assert.equal(annotationsExportFilename('A Biblioteca da Meia-Noite'), 'anotacoes-a-biblioteca-da-meia-noite.docx');
assert.equal(annotationsExportFilename('   '), 'anotacoes-item.docx');

const blob = await createAnnotationsDocxBlob({
  titulo: 'Torto Arado',
  criador: 'Itamar Vieira Junior',
  rotuloCriador: 'Autor',
  rotuloTipo: 'Livro',
  criterios,
  anotacoes: [anotacao(), anotacao({ id: 'a-2', tipo: 'Reação', texto: 'Uau' })],
});
assert.ok(blob.size > 1_000);

// Sem anotações nem notas, o arquivo sai mesmo assim, com a ficha.
const vazio = await createAnnotationsDocxBlob({
  titulo: 'Sem nada',
  criador: '',
  rotuloCriador: 'Autor',
  rotuloTipo: 'Livro',
  anotacoes: [],
});
assert.ok(vazio.size > 1_000);
