import assert from 'node:assert/strict';
import type { Content, Serie, Temporada } from '../../../lib/database.ts';
import {
  ROTULO_SEM_TEMPORADA,
  bloqueioAoExcluirQuadro,
  destinosAoExcluirQuadro,
  destinosAoExcluirTemporada,
  episodiosDaTemporada,
  episodiosDoQuadro,
  nomeDeQuadroRepetido,
  planoAoExcluirQuadro,
  planoAoExcluirTemporada,
} from './estruturaSerie.ts';
import { ROTULO_SEM_QUADRO } from './selecaoEpisodios.ts';
import { FILTROS_LISTA_PADRAO, montarLista, type ContextoLista } from './seriesLista.ts';

const serie = (id: string, parentId: string | null, extra: Partial<Serie> = {}) =>
  ({ id, parentId, name: id.toUpperCase(), ativa: true, pilarIds: [], ...extra } as unknown as Serie);
const series = [
  serie('s', null, { usaTemporadas: true, pilarPrincipalId: 'p-s', funcaoPadrao: 'atrair' } as Partial<Serie>),
  serie('q1', 's', { pilarPrincipalId: 'p-q1', funcaoPadrao: 'converter' } as Partial<Serie>),
  serie('q2', 's'),
  serie('q3', 's', { ativa: false }),
  serie('sub', 'q2'),
];
const temporadas = [
  { id: 't1', serieId: 's', nome: 'T1', userId: 'u', createdAt: '1' },
  { id: 't2', serieId: 's', nome: 'T2', userId: 'u', createdAt: '2' },
] as Temporada[];
let n = 0;
const ep = (id: string, seriesId: string, extra: Partial<Content> = {}): Content => ({
  id, seriesId, title: id, status: 'Roteiro', script: `roteiro ${id}`, legendaBase: `legenda ${id}`,
  publishDate: '2026-03-01', createdAt: `2026-01-${String(++n).padStart(2, '0')}`, updatedAt: '2026-02-01',
  archivedAt: null, deletedAt: null, temporadaId: null, plataformas: [{ platformId: 'ig', status: 'publicada', ciclo: 1 }],
  pilarId: null, pilarOrigem: null, funcao: null, funcaoOrigem: null, ordemEpisodio: null,
  ...extra,
} as unknown as Content);

const contents = [
  ep('a', 'q1', { pilarId: 'p-q1', pilarOrigem: 'herdada', funcao: 'converter', funcaoOrigem: 'herdada', temporadaId: 't1', ordemEpisodio: 1 } as Partial<Content>),
  ep('b', 'q1', { pilarId: 'meu', pilarOrigem: 'escolhida', funcao: 'reter', funcaoOrigem: 'escolhida', ordemEpisodio: 2 } as Partial<Content>),
  ep('c', 's', { temporadaId: 't1', ordemEpisodio: 3 } as Partial<Content>),
  ep('lixo', 'q1', { deletedAt: '2026-02-02', temporadaId: 't1' } as Partial<Content>),
];

// Contagem ignora a lixeira.
assert.deepEqual(episodiosDoQuadro('q1', contents).map(c => c.id), ['a', 'b']);
assert.deepEqual(episodiosDaTemporada('t1', contents).map(c => c.id), ['a', 'c']);

// Quadro com sub-quadro bloqueia; sem filhos, não.
assert.match(bloqueioAoExcluirQuadro('q2', series) ?? '', /1 quadro dentro dele/);
assert.equal(bloqueioAoExcluirQuadro('q1', series), null);

// Destinos: sem o próprio, sem arquivados, com "Sem quadro"; temporadas: as outras e "Sem temporada".
assert.deepEqual(destinosAoExcluirQuadro('q1', 's', series), [{ id: 's', label: ROTULO_SEM_QUADRO }, { id: 'q2', label: 'Q2' }]);
assert.deepEqual(destinosAoExcluirTemporada(temporadas[0], temporadas), [{ id: 't2', label: 'T2' }, { id: null, label: ROTULO_SEM_TEMPORADA }]);

// Excluir quadro: move para o destino, herdado recalcula, manual fica, texto e etapa ficam, movidos no fim.
const pq = planoAoExcluirQuadro({ quadroId: 'q1', destinoId: 's', serieId: 's', series, temporadas, contents, agora: 'agora', comOrdem: true });
assert.deepEqual(pq.conteudos.map(c => [c.id, c.seriesId, c.temporadaId]), [['a', 's', 't1'], ['b', 's', null]]);
assert.equal(pq.conteudos[0].pilarId, 'p-s');
assert.equal(pq.conteudos[0].funcao, 'atrair');
assert.equal(pq.conteudos[1].pilarId, 'meu');
assert.equal(pq.conteudos[1].funcao, 'reter');
for (const c of pq.conteudos) {
  const antes = contents.find(item => item.id === c.id)!;
  assert.equal(c.script, antes.script);
  assert.equal(c.legendaBase, antes.legendaBase);
  assert.equal(c.status, antes.status);
  assert.deepEqual(c.plataformas, antes.plataformas);
}
assert.deepEqual(pq.ordem, ['c', 'a', 'b']);
assert.equal(pq.perdemTemporada, 0);
assert.equal(planoAoExcluirQuadro({ quadroId: 'q1', destinoId: 's', serieId: 's', series, temporadas, contents, agora: 'x', comOrdem: false }).ordem, null);
// Quadro vazio: nada a mover.
assert.deepEqual(planoAoExcluirQuadro({ quadroId: 'q2', destinoId: 's', serieId: 's', series, temporadas, contents, agora: 'x', comOrdem: true }), { conteudos: [], ordem: null, perdemTemporada: 0 });

// Excluir temporada: só a temporada muda.
const pt = planoAoExcluirTemporada({ temporadaId: 't1', destinoId: 't2', contents, agora: 'agora' });
assert.deepEqual(pt.conteudos.map(c => [c.id, c.seriesId, c.temporadaId]), [['a', 'q1', 't2'], ['c', 's', 't2']]);
assert.deepEqual(planoAoExcluirTemporada({ temporadaId: 't1', destinoId: null, contents, agora: 'x' }).conteudos.map(c => c.temporadaId), [null, null]);

// Nome repetido entre quadros (sem diferenciar maiúsculas), ignorando o próprio.
assert.equal(nomeDeQuadroRepetido(' q2 ', 's', series), true);
assert.equal(nomeDeQuadroRepetido('Q1', 's', series, 'q1'), false);

// Lista: temporada e quadro ativo vazios aparecem sem filtro; com filtro somem; arquivado vazio não aparece.
const ctx: ContextoLista = { serieId: 's', series, contas: [], temporadasValidas: temporadas };
const vivos = contents.filter(c => !c.deletedAt);
const porTemporada = montarLista({ episodios: vivos, filtros: FILTROS_LISTA_PADRAO, agrupar: 'temporada', ordem: 'manual', ctx, temporadas });
assert.deepEqual(porTemporada.map(g => [g.id, g.total]), [['temporada:t1', 2], ['temporada:t2', 0], ['sem-temporada', 1]]);
const comBusca = montarLista({ episodios: vivos, filtros: { ...FILTROS_LISTA_PADRAO, busca: 'a' }, agrupar: 'temporada', ordem: 'manual', ctx, temporadas });
assert.ok(!comBusca.some(g => g.id === 'temporada:t2'));
const porQuadro = montarLista({ episodios: vivos, filtros: FILTROS_LISTA_PADRAO, agrupar: 'quadro', ordem: 'manual', ctx, temporadas });
assert.ok(porQuadro.some(g => g.id === 'quadro:q2' && g.total === 0));
assert.ok(!porQuadro.some(g => g.id === 'quadro:q3'));

console.log('estruturaSerie: ok');
