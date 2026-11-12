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

// --- Vitrine: séries e quadros lado a lado, cards planos; família só no filtro dela; pilar filtra os dois.
{
  const { montarListaSeries, etiquetaDoCard, secoesPorFamilia, FILTROS_LISTA_PADRAO } = await import('./seriesListaView.ts');
  const { TIPO_AGRUPAMENTO_LABEL } = await import('./serieAgrupamento.ts');
  const no = (id: string, extra: Record<string, unknown> = {}) =>
    ({ id, name: id, ativa: true, status: 'ativa', parentId: null, pilarIds: [], ...extra }) as unknown as Serie;
  const series = [
    no('Fam', { tipoAgrupamento: 'familia' }),
    no('Ser', { tipoAgrupamento: 'serie', parentId: 'Fam', pilarIds: ['p1'] }),
    no('Qua', { tipoAgrupamento: 'quadro', parentId: 'Ser' }),
    no('Solo', { tipoAgrupamento: 'serie', pilarIds: ['p2'] }),
  ];
  const lista = (filtros: Partial<typeof FILTROS_LISTA_PADRAO>) => montarListaSeries({
    series, contents: [], filtros: { ...FILTROS_LISTA_PADRAO, ...filtros }, emAberto: () => false,
  });
  const ids = (filtros: Partial<typeof FILTROS_LISTA_PADRAO>) => lista(filtros).visiveis.map(item => item.serie.id);
  assert.deepEqual(ids({}), ['Ser', 'Qua', 'Solo'], 'Todos: séries e quadros, quadro logo depois da série dele');
  assert.deepEqual(lista({}).elegiveis.map(item => item.serie.id), ['Fam', 'Ser', 'Qua', 'Solo'], 'elegíveis incluem a família para as seções');
  const resultado = lista({});
  assert.deepEqual(
    secoesPorFamilia(resultado.visiveis, resultado.itens).map(secao => [secao.id, secao.titulo, secao.itens.map(item => item.serie.id)]),
    [['Fam', 'Família: Fam', ['Ser', 'Qua']], ['avulsos', 'Outros / Avulsos', ['Solo']]],
    'seções por família, avulsos no fim',
  );
  assert.deepEqual(ids({ tipo: 'serie' }), ['Ser', 'Solo']);
  assert.deepEqual(ids({ tipo: 'quadro' }), ['Qua']);
  assert.deepEqual(ids({ tipo: 'familia' }), ['Ser', 'Qua', 'Solo'], 'filtro antigo de Famílias vira a vitrine de séries e quadros');
  assert.deepEqual(ids({ familia: 'Fam' }), ['Ser', 'Qua'], 'chip da família mostra só o que está nela');
  // O quadro herda o pilar da série.
  assert.deepEqual(ids({ pilar: 'p1' }), ['Ser', 'Qua']);
  assert.deepEqual(ids({ pilar: 'p2' }), ['Solo']);

  const itens = lista({}).itens;
  assert.equal(etiquetaDoCard(itens.get('Ser')!, TIPO_AGRUPAMENTO_LABEL), 'Série · Ativa');
  assert.equal(etiquetaDoCard(itens.get('Qua')!, TIPO_AGRUPAMENTO_LABEL), 'Quadro · Sob demanda');
  assert.equal(etiquetaDoCard({ tipo: 'quadro', serie: no('x', { ativa: false, status: 'arquivada' }) }, TIPO_AGRUPAMENTO_LABEL), 'Quadro · Arquivado');
  assert.equal(etiquetaDoCard({ tipo: 'quadro', serie: no('x', { ativa: false, status: 'rascunho' }) }, TIPO_AGRUPAMENTO_LABEL), 'Quadro · Rascunho');
  assert.equal(etiquetaDoCard({ tipo: 'serie', serie: no('x', { ativa: false, status: 'arquivada' }) }, TIPO_AGRUPAMENTO_LABEL), 'Série · Arquivada');
  console.log('seriesListaView.test.ts (vitrine) ok');
}
