import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {rotulosDeEpisodio} from './episodioNaTemporada.ts';

const ep = (id: string, temporadaId: string | null, ordemEpisodio: number | null, createdAt = '2026-01-01') => ({
  id,
  temporadaId,
  ordemEpisodio,
  createdAt,
});

describe('posição do episódio na temporada', () => {
  it('mostra a posição só de quem tem temporada, na ordem do episódio', () => {
    const rotulos = rotulosDeEpisodio([
      ep('c', 't1', 3),
      ep('a', 't1', 1),
      ep('b', 't1', 2),
      ep('solto', null, 1),
      ep('outra', 't2', 1),
    ]);
    assert.equal(rotulos.get('a'), '1 de 3');
    assert.equal(rotulos.get('b'), '2 de 3');
    assert.equal(rotulos.get('c'), '3 de 3');
    assert.equal(rotulos.get('outra'), '1 de 1');
    assert.equal(rotulos.has('solto'), false);
  });

  it('ignora episódio arquivado na conta da temporada', () => {
    const rotulos = rotulosDeEpisodio([
      ep('a', 't1', 1),
      {...ep('b', 't1', 2), archivedAt: '2026-02-01'},
    ]);
    assert.equal(rotulos.get('a'), '1 de 1');
    assert.equal(rotulos.has('b'), false);
  });
});
