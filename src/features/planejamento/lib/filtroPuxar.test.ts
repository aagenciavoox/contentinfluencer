import assert from 'node:assert/strict';
import {
  FILTRO_PUXAR_VAZIO,
  filtroPuxarAtivo,
  opcoesDoFiltroPuxar,
  passaNoFiltroPuxar,
  pilarEfetivo,
} from './filtroPuxar.ts';

const series = [
  {id: 's-res', name: 'Resenhas', pilarPrincipalId: 'p-ind'},
  {id: 's-hum', name: 'Humor de leitor', pilarPrincipalId: null},
  {id: 's-sem-uso', name: 'Sem uso', pilarPrincipalId: null},
];
const pilares = [
  {id: 'p-ind', nome: 'Indicação'},
  {id: 'p-cie', nome: 'Ciência'},
  {id: 'p-sem-uso', nome: 'Sem uso'},
];
const temas = [{id: 't-hal', nome: 'Halloween'}];

function conteudo(partial: Partial<{seriesId: string | null; pilarId: string | null; tags: string[]; temaIds: string[]}>) {
  return {seriesId: null, pilarId: null, tags: [], temaIds: [], ...partial};
}

function testPilarVemDaSerieQuandoOConteudoNaoTem() {
  assert.equal(pilarEfetivo(conteudo({seriesId: 's-res'}), series), 'p-ind');
  assert.equal(pilarEfetivo(conteudo({seriesId: 's-res', pilarId: 'p-cie'}), series), 'p-cie');
  assert.equal(pilarEfetivo(conteudo({seriesId: 's-hum'}), series), null);
}

function testFiltroCombinaSeriePilarETag() {
  const resenha = conteudo({seriesId: 's-res', tags: ['#Terror'], temaIds: ['t-hal']});
  const ciencia = conteudo({pilarId: 'p-cie', tags: ['gravar']});

  assert.equal(passaNoFiltroPuxar(resenha, FILTRO_PUXAR_VAZIO, series, temas), true);
  assert.equal(passaNoFiltroPuxar(resenha, {...FILTRO_PUXAR_VAZIO, serieIds: ['s-res']}, series, temas), true);
  assert.equal(passaNoFiltroPuxar(ciencia, {...FILTRO_PUXAR_VAZIO, serieIds: ['s-res']}, series, temas), false);
  assert.equal(passaNoFiltroPuxar(resenha, {...FILTRO_PUXAR_VAZIO, pilarIds: ['p-ind']}, series, temas), true);
  assert.equal(passaNoFiltroPuxar(ciencia, {...FILTRO_PUXAR_VAZIO, pilarIds: ['p-ind']}, series, temas), false);
  // Dentro do mesmo filtro, basta um dos escolhidos.
  assert.equal(passaNoFiltroPuxar(ciencia, {...FILTRO_PUXAR_VAZIO, pilarIds: ['p-ind', 'p-cie']}, series, temas), true);
  // Tag de usuário e tema contam como tag, sem diferenciar maiúsculas.
  assert.equal(passaNoFiltroPuxar(resenha, {...FILTRO_PUXAR_VAZIO, tags: ['terror']}, series, temas), true);
  assert.equal(passaNoFiltroPuxar(resenha, {...FILTRO_PUXAR_VAZIO, tags: ['halloween']}, series, temas), true);
  assert.equal(passaNoFiltroPuxar(ciencia, {...FILTRO_PUXAR_VAZIO, tags: ['terror', 'natal']}, series, temas), false);
  // Tag técnica de produção não é tag de filtro.
  assert.equal(passaNoFiltroPuxar(ciencia, {...FILTRO_PUXAR_VAZIO, tags: ['gravar']}, series, temas), false);
  // Entre filtros, precisa passar em todos.
  assert.equal(
    passaNoFiltroPuxar(resenha, {serieIds: ['s-res'], pilarIds: ['p-cie'], tags: []}, series, temas),
    false,
  );
}

function testOpcoesSoTrazemOQueExisteNosConteudos() {
  const opcoes = opcoesDoFiltroPuxar(
    [
      conteudo({seriesId: 's-res', tags: ['Terror']}),
      conteudo({seriesId: 's-hum', pilarId: 'p-cie', tags: ['terror', 'Clássicos'], temaIds: ['t-hal']}),
    ],
    series,
    pilares,
    temas,
  );
  assert.deepEqual(opcoes.series.map(opcao => opcao.label), ['Humor de leitor', 'Resenhas']);
  assert.deepEqual(opcoes.pilares.map(opcao => opcao.value), ['p-ind', 'p-cie']);
  assert.deepEqual(opcoes.tags, [
    {value: 'clássicos', label: 'Clássicos'},
    {value: 'halloween', label: 'Halloween'},
    {value: 'terror', label: 'Terror'},
  ]);
}

function testSerieTrazOsQuadrosEOsQuadrosMostramOCaminho() {
  const comQuadro = [...series, {id: 'q-cla', name: 'Clássicos', parentId: 's-res', pilarPrincipalId: null}];
  const episodioDoQuadro = conteudo({seriesId: 'q-cla'});
  assert.equal(passaNoFiltroPuxar(episodioDoQuadro, {...FILTRO_PUXAR_VAZIO, serieIds: ['s-res']}, comQuadro, temas), true);
  assert.equal(passaNoFiltroPuxar(episodioDoQuadro, {...FILTRO_PUXAR_VAZIO, serieIds: ['s-hum']}, comQuadro, temas), false);
  // Escolher o quadro não traz o que está direto na série.
  assert.equal(passaNoFiltroPuxar(conteudo({seriesId: 's-res'}), {...FILTRO_PUXAR_VAZIO, serieIds: ['q-cla']}, comQuadro, temas), false);

  const opcoes = opcoesDoFiltroPuxar([episodioDoQuadro], comQuadro, pilares, temas);
  assert.deepEqual(opcoes.series, [
    {value: 's-res', label: 'Resenhas'},
  ]);
}

function testFiltroAtivo() {
  assert.equal(filtroPuxarAtivo(FILTRO_PUXAR_VAZIO), false);
  assert.equal(filtroPuxarAtivo({...FILTRO_PUXAR_VAZIO, tags: ['terror']}), true);
  assert.equal(filtroPuxarAtivo({...FILTRO_PUXAR_VAZIO, redes: ['instagram']}), true);
}

function testFiltroRede() {
  const item = conteudo({seriesId: 's-res'});
  // Sem filtro de rede, passa com ou sem redes
  assert.equal(passaNoFiltroPuxar(item, FILTRO_PUXAR_VAZIO, series, temas, ['instagram']), true);
  assert.equal(passaNoFiltroPuxar(item, FILTRO_PUXAR_VAZIO, series, temas, []), true);

  // Filtrando por Instagram: item só com Instagram passa; com TikTok também, não; sem rede, não
  const filtroIg = {...FILTRO_PUXAR_VAZIO, redes: ['instagram' as const]};
  assert.equal(passaNoFiltroPuxar(item, filtroIg, series, temas, ['instagram']), true);
  assert.equal(passaNoFiltroPuxar(item, filtroIg, series, temas, ['instagram', 'tiktok']), false);
  assert.equal(passaNoFiltroPuxar(item, filtroIg, series, temas, ['tiktok']), false);
  assert.equal(passaNoFiltroPuxar(item, filtroIg, series, temas, []), false);

  // Filtrando por Instagram e TikTok: itens só de Instagram, só de TikTok ou de ambos passam
  const filtroMulti = {...FILTRO_PUXAR_VAZIO, redes: ['instagram' as const, 'tiktok' as const]};
  assert.equal(passaNoFiltroPuxar(item, filtroMulti, series, temas, ['instagram']), true);
  assert.equal(passaNoFiltroPuxar(item, filtroMulti, series, temas, ['tiktok']), true);
  assert.equal(passaNoFiltroPuxar(item, filtroMulti, series, temas, ['instagram', 'tiktok']), true);
  // Filtrando por Shorts ou YouTube longo:
  const filtroShorts = {...FILTRO_PUXAR_VAZIO, redes: ['youtube-shorts' as const]};
  assert.equal(passaNoFiltroPuxar(item, filtroShorts, series, temas, ['youtube-shorts']), true);
  assert.equal(passaNoFiltroPuxar(item, filtroShorts, series, temas, ['youtube']), false);

  const filtroYtLongo = {...FILTRO_PUXAR_VAZIO, redes: ['youtube' as const]};
  assert.equal(passaNoFiltroPuxar(item, filtroYtLongo, series, temas, ['youtube']), true);
  assert.equal(passaNoFiltroPuxar(item, filtroYtLongo, series, temas, ['youtube-shorts']), false);
}

testPilarVemDaSerieQuandoOConteudoNaoTem();
testFiltroCombinaSeriePilarETag();
testOpcoesSoTrazemOQueExisteNosConteudos();
testSerieTrazOsQuadrosEOsQuadrosMostramOCaminho();
testFiltroAtivo();
testFiltroRede();
