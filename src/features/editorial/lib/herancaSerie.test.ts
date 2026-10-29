import assert from 'node:assert/strict';
import { resolverHerancaSerie, resolverFuncaoHerdada, resolverPilar, resolverModelo, resolverLegendaBase } from './herancaSerie.ts';

const series = [
  {
    id: 'pai',
    name: 'Descomplicando',
    parentId: null,
    template: 'Template pai',
    funcaoPadrao: 'atrair' as const,
    pilarPrincipalId: 'pilar-pai',
    pilarIds: ['pilar-pai'],
    legendaBase: 'Legenda pai',
    plataformas: [{ serieId: 'pai', platformId: 'ig', hashtags: '#pai' }],
    formatoVisualPadrao: ['Reels'],
    energiaPadrao: 'alta' as const,
    ativa: true,
  },
  {
    id: 'filho',
    name: 'Branbran',
    parentId: 'pai',
    template: '',
    funcaoPadrao: null,
    pilarPrincipalId: null,
    pilarIds: [],
    legendaBase: null,
    plataformas: [],
    formatoVisualPadrao: [],
    energiaPadrao: null,
    ativa: true,
  },
  {
    id: 'varia',
    name: 'Varia',
    parentId: 'pai',
    template: '',
    funcaoPadrao: 'varia' as const,
    pilarPrincipalId: null,
    pilarIds: [],
    legendaBase: null,
    plataformas: [],
    formatoVisualPadrao: [],
    energiaPadrao: null,
    ativa: true,
  },
];

{
  const pilar = resolverPilar({ seriesId: 'filho', pilarOrigem: 'herdada' }, series);
  assert.equal(pilar.pilarId, 'pilar-pai');
  assert.equal(pilar.origemSerieId, 'pai');
  assert.equal(pilar.estado, 'herdada');
}

{
  const pilar = resolverPilar({ seriesId: 'filho', pilarOrigem: 'nenhuma' }, series);
  assert.equal(pilar.pilarId, null);
  assert.equal(pilar.estado, 'nenhuma');
}

{
  const pilar = resolverPilar(
    { seriesId: 'filho', pilarId: 'p1', pilarOrigem: 'escolhida', classificacaoCongeladaEm: '2026-01-01' },
    series,
  );
  assert.equal(pilar.pilarId, 'p1');
  assert.equal(pilar.estado, 'congelada');
}

{
  const funcao = resolverFuncaoHerdada({ seriesId: 'filho', funcaoOrigem: 'herdada' }, series);
  assert.equal(funcao.funcao, 'atrair');
  assert.equal(funcao.origemSerieId, 'pai');
}

{
  const funcao = resolverFuncaoHerdada({ seriesId: 'varia', funcaoOrigem: 'herdada' }, series);
  assert.equal(funcao.funcao, null);
  assert.equal(funcao.estado, 'varia');
}

{
  const modelo = resolverModelo({ seriesId: 'filho', script: null, scriptOrigem: 'modelo' }, series);
  assert.equal(modelo.template, 'Template pai');
  assert.equal(modelo.preservarAutor, false);
}

{
  const modelo = resolverModelo({ seriesId: 'filho', script: 'Meu texto', scriptOrigem: 'autor' }, series);
  assert.equal(modelo.preservarAutor, true);
  assert.equal(modelo.template, null);
}

{
  const legenda = resolverLegendaBase({ seriesId: 'filho', legendaBase: null }, series);
  assert.equal(legenda.legendaBase, 'Legenda pai');
}

{
  const legenda = resolverLegendaBase({ seriesId: 'filho', legendaBase: 'Minha' }, series);
  assert.equal(legenda.legendaBase, 'Minha');
  assert.equal(legenda.preservarPropria, true);
}

{
  const resolvido = resolverHerancaSerie({ seriesId: 'filho' }, series);
  assert.equal(resolvido.formato.length, 0); // formato não sobe
  assert.equal(resolvido.energia, null); // esforço não sobe
  assert.deepEqual(resolvido.caminho.map(c => c.id), ['pai', 'filho']);
}

console.log('ok - herancaSerie');
