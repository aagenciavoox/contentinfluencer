import assert from 'node:assert/strict';
import {
  adicionarBloco,
  alterarBloco,
  aplicarComum,
  aplicarContextoNoRascunho,
  blocosPendentes,
  blocosSemTitulo,
  moverBloco,
  resumoDosPendentes,
  conteudoDoBloco,
  criarBloco,
  marcarCriados,
  type BlocoMassa,
} from './seriesBulkDraft.ts';
import type { Serie } from '../../../lib/database.ts';

const serie = {
  id: 's',
  userId: 'u',
  name: 'Série',
  template: '',
  notes: '',
  slotPadrao: null,
  formatoVisualPadrao: ['Reels'],
  estruturaRoteiro: null,
  bordao: null,
  cor: null,
  capaUrl: null,
  ativa: true,
  frequenciaRecomendada: null,
  funcaoPadrao: null,
  energiaPadrao: null,
  pilarIds: [],
  plataformas: [],
  createdAt: '',
  updatedAt: '',
} satisfies Serie;

function bloco(parcial: Partial<BlocoMassa> & Pick<BlocoMassa, 'id'>): BlocoMassa {
  return {
    modo: 'roteiro',
    serieId: 's',
    temporadaId: null,
    titulo: 'Título',
    texto: '<p>Texto inteiro</p>',
    criado: false,
    ...parcial,
  };
}

const vazio = aplicarContextoNoRascunho({ blocos: [] }, { serieId: 'quadro', temporadaId: 't1' }, 'grupo', 'novo');
assert.equal(vazio.blocos.length, 1);
assert.equal(vazio.blocos[0]?.serieId, 'quadro');
assert.equal(vazio.blocos[0]?.temporadaId, 't1');

const comTexto = aplicarContextoNoRascunho(
  { blocos: [bloco({ id: 'a', titulo: 'Já escrito', serieId: 's', temporadaId: null })] },
  { serieId: 'quadro', temporadaId: 't1' },
  'grupo',
  'b',
);
assert.equal(comTexto.blocos.length, 2);
assert.equal(comTexto.blocos[0]?.titulo, 'Já escrito');
assert.equal(comTexto.blocos[1]?.serieId, 'quadro');

const ultimoVazio = aplicarContextoNoRascunho(
  { blocos: [criarBloco({ id: 'a', serieId: 's' })] },
  { serieId: 'quadro', temporadaId: 't2' },
  'grupo',
  'b',
);
assert.equal(ultimoVazio.blocos.length, 1);
assert.equal(ultimoVazio.blocos[0]?.serieId, 'quadro');
assert.equal(ultimoVazio.blocos[0]?.temporadaId, 't2');

const massaPreserva = aplicarContextoNoRascunho(
  { blocos: [bloco({ id: 'a' })] },
  { serieId: 'outro', temporadaId: null },
  'massa',
  'b',
);
assert.equal(massaPreserva.blocos.length, 1);
assert.equal(massaPreserva.blocos[0]?.id, 'a');

const pendentes = blocosPendentes([
  bloco({ id: 'pronto' }),
  bloco({ id: 'criado', criado: true }),
  bloco({ id: 'existe' }),
  bloco({ id: 'sem-texto', texto: '<p></p>' }),
  bloco({ id: 'ideia', modo: 'ideia', texto: '' }),
], new Set(['existe']));
// Texto é opcional: o título basta, inclusive no roteiro.
assert.deepEqual(pendentes.map(item => item.id), ['pronto', 'sem-texto', 'ideia']);
assert.deepEqual(resumoDosPendentes(pendentes), { conteudos: 3, ideias: 1, roteiros: 2 });
assert.deepEqual(
  blocosSemTitulo([bloco({ id: 'x', titulo: '' }), bloco({ id: 'y', titulo: '', texto: '' })]).map(item => item.id),
  ['x'],
);

// Valores comuns valem para o conjunto; a entrada que ajustou o campo fica como está.
let conjunto = { blocos: [bloco({ id: 'a' }), bloco({ id: 'b' })] };
conjunto = alterarBloco(conjunto, 's', 'b', { modo: 'ideia' });
assert.equal(conjunto.blocos[1]?.proprio?.modo, true);
conjunto = aplicarComum(conjunto, 's', { temporadaId: 't1' });
conjunto = aplicarComum(conjunto, 's', { modo: 'ideia' });
conjunto = aplicarComum(conjunto, 's', { modo: 'roteiro' });
assert.deepEqual(conjunto.blocos.map(item => [item.modo, item.temporadaId]), [['roteiro', 't1'], ['ideia', 't1']]);
// Voltar ao valor do conjunto desfaz o ajuste.
conjunto = alterarBloco(conjunto, 's', 'b', { modo: 'roteiro' });
assert.equal(conjunto.blocos[1]?.proprio?.modo, false);
conjunto = adicionarBloco(conjunto, 's', 'c');
assert.equal(conjunto.blocos[2]?.temporadaId, 't1');
assert.deepEqual(moverBloco(conjunto, 'c', 0).blocos.map(item => item.id), ['c', 'a', 'b']);
assert.deepEqual(moverBloco(conjunto, 'a', 9).blocos.map(item => item.id), ['b', 'c', 'a']);

const marcados = marcarCriados([bloco({ id: 'pronto' }), bloco({ id: 'outro' })], new Set(['pronto']));
assert.equal(marcados[0]?.criado, true);
assert.equal(marcados[1]?.criado, false);

const roteiro = conteudoDoBloco(
  bloco({ id: 'ep-1', temporadaId: 'temp', serieId: 's' }),
  serie,
  [serie],
);
assert.equal(roteiro.id, 'ep-1');
assert.equal(roteiro.seriesId, 's');
assert.equal(roteiro.temporadaId, 'temp');
assert.equal(roteiro.status, 'Roteiro');
assert.equal(roteiro.publishDate, null);
assert.match(roteiro.script || '', /Texto inteiro/);

const ideia = conteudoDoBloco(
  bloco({ id: 'ep-2', modo: 'ideia', texto: '<p>Uma ideia</p>' }),
  serie,
  [serie],
);
assert.equal(ideia.status, 'Ideia');
assert.equal(ideia.notes, 'Uma ideia');
assert.equal(ideia.publishDate, null);

// Roteiro sem texto entra sem script; o modelo da série vale como em qualquer roteiro novo.
const semTexto = conteudoDoBloco(bloco({ id: 'ep-3', texto: '' }), serie, [serie]);
assert.equal(semTexto.status, 'Roteiro');
assert.equal(semTexto.title, 'Título');

console.log('seriesBulkDraft.test.ts passed');
