import assert from 'node:assert/strict';
import { faixaDaEtapa, metaDoCabecalho, totaisDoCabecalho } from './serieCabecalho.ts';

const series = [
  { id: 's', parentId: null },
  { id: 'q1', parentId: 's' },
  { id: 'q2', parentId: 's' },
  { id: 'outra', parentId: null },
];
const ep = (id: string, seriesId: string, status: string, extra: Record<string, unknown> = {}) =>
  ({ id, seriesId, status, archivedAt: null, deletedAt: null, ...extra });

// Edição conta como Produção; cada etapa cai numa faixa só.
assert.equal(faixaDaEtapa('edicao'), 'producao');
assert.equal(faixaDaEtapa('producao'), 'producao');
assert.equal(faixaDaEtapa('roteiro'), 'roteiros');
assert.equal(faixaDaEtapa('ideia'), 'ideias');
assert.equal(faixaDaEtapa('postado'), 'postados');

const contents = [
  ep('d1', 's', 'Ideia'),
  ep('d2', 's', 'Roteiro'),
  ep('q1a', 'q1', 'Produção'),
  ep('q1b', 'q1', 'Edição'),
  // Duas contas, uma publicada e outra não: o status segue Roteiro, então não é Postado.
  ep('q2a', 'q2', 'Roteiro', { plataformas: [{ status: 'publicado' }, { status: 'pendente' }] }),
  // Três contas publicadas: conta como um episódio só.
  ep('q2b', 'q2', 'Publicado', { plataformas: [{ status: 'publicado' }, { status: 'publicado' }, { status: 'publicado' }] }),
  ep('q2b', 'q2', 'Publicado'),
  ep('fora', 'outra', 'Publicado'),
  ep('lixo', 's', 'Roteiro', { deletedAt: '2026-01-01T00:00:00Z' }),
];

const t = totaisDoCabecalho({ serieId: 's', series, contents });
assert.deepEqual(t, { total: 6, ideias: 1, roteiros: 2, producao: 2, postados: 1 });
assert.equal(t.ideias + t.roteiros + t.producao + t.postados, t.total);

// Página de um quadro: só ele.
assert.deepEqual(totaisDoCabecalho({ serieId: 'q2', series, contents }), { total: 2, ideias: 0, roteiros: 1, producao: 0, postados: 1 });

// Meta.
const base = { id: 's', name: 'S', parentId: null, frequenciaRecomendada: null, frequenciaVezes: null, frequenciaUnidade: null, frequenciaAPartirDe: null };
const semana = { modo: 'semana' as const, inicio: '2026-11-01', fim: '2026-11-07' };
const itens = [
  { serieId: 's', espacoId: 'd1:original', contentId: 'd1' },
  { serieId: 'q1', espacoId: 'q1a:original', contentId: 'q1a' },
];
const lista = [base, { ...base, id: 'q1', parentId: 's' }];

assert.deepEqual(metaDoCabecalho({ serie: base, series: lista, itens, periodo: semana, hoje: '2026-11-02' }), { estado: 'sem-meta', texto: 'Sem meta definida' });

const comMeta = { ...base, frequenciaVezes: 3, frequenciaUnidade: 'semana' };
const m = metaDoCabecalho({ serie: comMeta, series: [comMeta, lista[1]], itens, periodo: semana, hoje: '2026-11-02' });
assert.equal(m.estado, 'ativa');
assert.equal(m.texto, '2 de 3 episódios previstos nesta semana');
if (m.estado === 'ativa') {
  assert.equal(m.regra, 'Meta: 3 por semana');
  assert.equal(m.barra, 67);
}

// Mais previstos que a meta: barra para em 100, número real fica.
const umaVez = { ...base, frequenciaVezes: 1, frequenciaUnidade: 'semana' };
const acima = metaDoCabecalho({ serie: umaVez, series: [umaVez, lista[1]], itens, periodo: semana, hoje: '2026-11-02' });
assert.equal(acima.texto, '2 de 1 episódio previsto nesta semana');
if (acima.estado === 'ativa') assert.equal(acima.barra, 100);

// Frase antiga continua valendo.
const legado = { ...base, frequenciaRecomendada: 'Semanal' };
assert.equal(metaDoCabecalho({ serie: legado, series: [legado], itens: [], periodo: semana, hoje: '2026-11-02' }).texto, '0 de 1 episódio previsto nesta semana');

const futura = { ...comMeta, frequenciaAPartirDe: '2026-12-01' };
const f = metaDoCabecalho({ serie: futura, series: [futura], itens, periodo: semana, hoje: '2026-11-02' });
assert.equal(f.estado, 'futura');
assert.equal(f.texto, 'Começa em 01/12/2026');

console.log('serieCabecalho: ok');
