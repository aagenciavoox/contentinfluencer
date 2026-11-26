import assert from 'node:assert/strict';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {
  FILTRO_PUXAR_VAZIO,
  filtroPuxarAtivo,
  opcoesDoFiltroPuxar,
  ordenarPorPrioridadeDeStatus,
  passaNoFiltroPuxar,
  pilarEfetivo,
  prioridadeStatusPuxar,
  quantosFiltrosPuxar,
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

function conteudo(partial: Partial<{seriesId: string | null; pilarId: string | null; tags: string[]; temaIds: string[]; status: string; title: string}>) {
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
    passaNoFiltroPuxar(resenha, {...FILTRO_PUXAR_VAZIO, serieIds: ['s-res'], pilarIds: ['p-cie']}, series, temas),
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
  assert.deepEqual(opcoes.status, []);
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
  assert.equal(filtroPuxarAtivo({...FILTRO_PUXAR_VAZIO, statusIds: [CONTENT_STATUS.EDICAO]}), true);
  assert.equal(quantosFiltrosPuxar(FILTRO_PUXAR_VAZIO), 0);
  assert.equal(quantosFiltrosPuxar({...FILTRO_PUXAR_VAZIO, tags: ['terror', 'natal'], statusIds: [CONTENT_STATUS.EDICAO]}), 2);
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

function testFiltroStatus() {
  const edicao = conteudo({status: CONTENT_STATUS.EDICAO});
  const producao = conteudo({status: CONTENT_STATUS.PRODUCAO});
  const legado = conteudo({status: 'Gravado'});

  assert.equal(passaNoFiltroPuxar(edicao, FILTRO_PUXAR_VAZIO, series, temas), true);
  assert.equal(passaNoFiltroPuxar(edicao, {...FILTRO_PUXAR_VAZIO, statusIds: [CONTENT_STATUS.EDICAO]}, series, temas), true);
  assert.equal(passaNoFiltroPuxar(producao, {...FILTRO_PUXAR_VAZIO, statusIds: [CONTENT_STATUS.EDICAO]}, series, temas), false);
  // Dentro do mesmo filtro, basta um dos escolhidos.
  assert.equal(
    passaNoFiltroPuxar(producao, {...FILTRO_PUXAR_VAZIO, statusIds: [CONTENT_STATUS.EDICAO, CONTENT_STATUS.PRODUCAO]}, series, temas),
    true,
  );
  // Status legado entra pelo canônico.
  assert.equal(passaNoFiltroPuxar(legado, {...FILTRO_PUXAR_VAZIO, statusIds: [CONTENT_STATUS.EDICAO]}, series, temas), true);
  // Entre filtros, precisa passar em todos.
  assert.equal(
    passaNoFiltroPuxar(edicao, {...FILTRO_PUXAR_VAZIO, statusIds: [CONTENT_STATUS.EDICAO], tags: ['terror']}, series, temas),
    false,
  );
}

function testOpcoesStatusSoTrazemOQueExisteENaPrioridade() {
  const opcoes = opcoesDoFiltroPuxar(
    [
      conteudo({status: CONTENT_STATUS.IDEIA}),
      conteudo({status: 'Gravado'}),
      conteudo({status: CONTENT_STATUS.PRODUCAO}),
      conteudo({status: CONTENT_STATUS.IDEIA}),
    ],
    series,
    pilares,
    temas,
  );
  assert.deepEqual(opcoes.status, [
    {value: CONTENT_STATUS.EDICAO, label: CONTENT_STATUS.EDICAO},
    {value: CONTENT_STATUS.PRODUCAO, label: CONTENT_STATUS.PRODUCAO},
    {value: CONTENT_STATUS.IDEIA, label: CONTENT_STATUS.IDEIA},
  ]);
}

function testOrdenarPorPrioridadeDeStatus() {
  const ideiaB = {status: CONTENT_STATUS.IDEIA, title: 'Beta'};
  const ideiaA = {status: CONTENT_STATUS.IDEIA, title: 'Alfa'};
  const producao = {status: CONTENT_STATUS.PRODUCAO, title: 'Zebra'};
  const edicao = {status: 'Gravado', title: 'Meio'};
  const roteiro = {status: CONTENT_STATUS.ROTEIRO, title: 'Roteiro'};
  const desconhecido = {status: 'Outro', title: 'Aaa'};
  const semTitulo = {status: CONTENT_STATUS.EDICAO, title: ''};

  assert.deepEqual(
    ordenarPorPrioridadeDeStatus([ideiaB, desconhecido, producao, ideiaA, roteiro, edicao, semTitulo]).map(item => `${item.status}:${item.title}`),
    [
      `${CONTENT_STATUS.EDICAO}:`,
      'Gravado:Meio',
      `${CONTENT_STATUS.PRODUCAO}:Zebra`,
      `${CONTENT_STATUS.ROTEIRO}:Roteiro`,
      `${CONTENT_STATUS.IDEIA}:Alfa`,
      `${CONTENT_STATUS.IDEIA}:Beta`,
      'Outro:Aaa',
    ],
  );
  assert.equal(prioridadeStatusPuxar('Outro') > prioridadeStatusPuxar(CONTENT_STATUS.IDEIA), true);
}

testPilarVemDaSerieQuandoOConteudoNaoTem();
testFiltroCombinaSeriePilarETag();
testOpcoesSoTrazemOQueExisteNosConteudos();
testSerieTrazOsQuadrosEOsQuadrosMostramOCaminho();
testFiltroAtivo();
testFiltroRede();
testFiltroStatus();
testOpcoesStatusSoTrazemOQueExisteENaPrioridade();
testOrdenarPorPrioridadeDeStatus();
