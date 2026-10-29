import assert from 'node:assert/strict';
import {
  aplicarContextoNoRascunho,
  blocosPendentes,
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
assert.deepEqual(pendentes.map(item => item.id), ['pronto', 'ideia']);

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

console.log('seriesBulkDraft.test.ts passed');
