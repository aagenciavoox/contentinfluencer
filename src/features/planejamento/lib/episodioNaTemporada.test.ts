import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {progressoDasOndas, rotulosDeEpisodio, textoDoProgresso} from './episodioNaTemporada.ts';

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

describe('progresso da wave', () => {
  const pub = (id: string, temporadaId: string, postedAt: string | null) => ({
    id, temporadaId, status: 'roteiro', postedAt,
  });
  it('conta publicados de todos os episódios e os dias desde o último', () => {
    const progresso = progressoDasOndas([
      pub('a', 't1', '2026-11-01'),
      pub('b', 't1', '2026-10-20'),
      pub('c', 't1', null),
      pub('d', 't2', null),
    ], '2026-11-10');
    assert.deepEqual(progresso.get('t1'), {publicados: 2, total: 3, diasDesdeUltima: 9});
    assert.deepEqual(progresso.get('t2'), {publicados: 0, total: 1, diasDesdeUltima: null});
  });
  it('mostra parada só em andamento e a partir do limite', () => {
    assert.equal(textoDoProgresso({publicados: 2, total: 3, diasDesdeUltima: 9}), 'Wave 2/3 · parada há 9 dias');
    assert.equal(textoDoProgresso({publicados: 2, total: 3, diasDesdeUltima: 9}, 10), 'Wave 2/3');
    assert.equal(textoDoProgresso({publicados: 3, total: 3, diasDesdeUltima: 30}), 'Wave 3/3');
  });
});
