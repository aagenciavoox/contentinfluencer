import assert from 'node:assert/strict';
import {
  ERRO_ROTEIRO_CARROSSEL,
  lerTelas,
  modoEscrita,
  rascunhoDasNotas,
  roteiroDoConteudo,
  scriptEditado,
  temRoteiroEscrito,
  textoDasTelas,
} from './carrossel.ts';
import {columnAbsence, readCompat, stripSelectColumn} from './lib.ts';

const telas = [
  {id: 't1', html: '<p>Gancho &amp; pergunta</p>', images: [{id: 'i1', value: ' https://exemplo.com/capa.jpg '}]},
  {id: 't2', html: '<p>Só uma nota de imagem</p>', images: [{id: 'i2', value: ''}, 'foto da estante']},
  {id: 't3', html: '', images: [{id: 'i3', url: 'https://exemplo.com/fim.png'}]},
];

const carrossel = {
  id: 'c1',
  title: 'Livros de outubro',
  script: '<p>Texto antigo, de antes do carrossel</p>',
  writing_mode: 'carrossel',
  carousel_slides: telas,
};

// Banco sem as colunas (migração pendente): conta como Texto, igual ao app.
const bancoAntigo = {id: 'c2', title: 'Antigo', script: '<p>Roteiro corrido</p>'};

function testLeitura() {
  assert.equal(modoEscrita(carrossel), 'carrossel');
  assert.equal(modoEscrita(bancoAntigo), 'texto');
  assert.equal(modoEscrita({writing_mode: 'qualquer'}), 'texto');

  const texto = roteiroDoConteudo(carrossel, 'texto');
  assert.equal(texto.modo_escrita, 'carrossel');
  assert.deepEqual(texto.telas, [
    {tela: 'Tela 1', texto: 'Gancho & pergunta', imagens: ['https://exemplo.com/capa.jpg']},
    {tela: 'Tela 2', texto: 'Só uma nota de imagem', imagens: ['foto da estante']},
    {tela: 'Tela 3', texto: '', imagens: ['https://exemplo.com/fim.png']},
  ]);
  // O texto velho do script não aparece: o roteiro junta as telas.
  assert.equal(texto.roteiro, 'Tela 1\nGancho & pergunta\n\nTela 2\nSó uma nota de imagem');

  const html = roteiroDoConteudo(carrossel, 'html');
  assert.deepEqual(html.telas?.[0], {tela: 'Tela 1', html: '<p>Gancho &amp; pergunta</p>', imagens: ['https://exemplo.com/capa.jpg']});

  assert.deepEqual(roteiroDoConteudo(bancoAntigo, 'texto'), {modo_escrita: 'texto', roteiro: 'Roteiro corrido'});
  assert.deepEqual(roteiroDoConteudo(bancoAntigo, 'html'), {modo_escrita: 'texto', roteiro: '<p>Roteiro corrido</p>'});
  assert.deepEqual(roteiroDoConteudo({...carrossel, writing_mode: 'texto'}, 'texto'), {
    modo_escrita: 'texto',
    roteiro: 'Texto antigo, de antes do carrossel',
  });

  // JSON em texto e lixo no meio não quebram a leitura.
  assert.equal(lerTelas(JSON.stringify(telas)).length, 3);
  assert.deepEqual(lerTelas([null, 3, 'x', {html: 7, images: 'nada'}]), [{html: '', imagens: []}]);
  assert.deepEqual(lerTelas('{quebrado'), []);
  assert.deepEqual(lerTelas(undefined), []);
  assert.equal(textoDasTelas([]), '');
}

function testEdicaoDoRoteiro() {
  assert.throws(() => scriptEditado(carrossel, 'Novo texto', 'substituir'), {message: ERRO_ROTEIRO_CARROSSEL});
  assert.throws(() => scriptEditado(carrossel, 'Mais texto', 'acrescentar'), {message: ERRO_ROTEIRO_CARROSSEL});
  assert.match(ERRO_ROTEIRO_CARROSSEL, /modo Carrossel/);
  assert.match(ERRO_ROTEIRO_CARROSSEL, /Nada foi alterado/);

  assert.equal(scriptEditado(bancoAntigo, 'Novo texto', 'substituir'), '<p>Novo texto</p>');
  assert.equal(scriptEditado(bancoAntigo, 'Mais', 'acrescentar'), '<p>Roteiro corrido</p><p>Mais</p>');
  assert.equal(scriptEditado({script: null}, 'Primeiro', 'acrescentar'), '<p>Primeiro</p>');
}

function testProducao() {
  assert.equal(temRoteiroEscrito(carrossel), true);
  // Só imagem já conta como tela com conteúdo.
  assert.equal(temRoteiroEscrito({writing_mode: 'carrossel', carousel_slides: [{html: '<p></p>', images: ['capa']}]}), true);
  // Script antigo cheio não salva um carrossel vazio.
  assert.equal(temRoteiroEscrito({...carrossel, carousel_slides: [{html: '<p> </p>', images: [{value: '  '}]}]}), false);
  assert.equal(temRoteiroEscrito({...carrossel, carousel_slides: []}), false);
  assert.equal(temRoteiroEscrito(bancoAntigo), true);
  assert.equal(temRoteiroEscrito({script: '<p></p>'}), false);
}

function testRascunhoDasNotas() {
  assert.equal(rascunhoDasNotas({script: null, notes: 'Ideia solta'}), '<p>Ideia solta</p>');
  assert.equal(rascunhoDasNotas({script: '<p>Já escrito</p>', notes: 'Ideia'}), null);
  assert.equal(rascunhoDasNotas({script: null, notes: null}), null);
  // No carrossel o script fica escondido: nada é copiado para lá.
  assert.equal(rascunhoDasNotas({writing_mode: 'carrossel', carousel_slides: [], script: null, notes: 'Ideia'}), null);
}

async function testListaSemColunas() {
  // Banco sem a migração: o PostgREST recusa writing_mode e a lista repete sem ela.
  const erro = {message: 'column contents.writing_mode does not exist'};
  assert.deepEqual(columnAbsence(erro), {column: 'writing_mode', table: 'contents'});
  const select = 'writing_mode, id, title, content_plataformas(id, platform_id)';
  assert.equal(stripSelectColumn(select, 'writing_mode', 'contents'), 'id, title, content_plataformas(id, platform_id)');

  const tentativas: string[] = [];
  const result = await readCompat('listar conteúdos', select, async columns => {
    tentativas.push(columns);
    return columns.includes('writing_mode')
      ? {data: null, error: erro}
      : {data: [{id: 'c2', title: 'Antigo'}], error: null};
  });
  assert.equal(tentativas.length, 2);
  assert.deepEqual(result.omitidas, ['contents.writing_mode']);
  assert.equal(modoEscrita((result.data as Array<Record<string, unknown>>)[0]), 'texto');
}

testLeitura();
testEdicaoDoRoteiro();
testProducao();
testRascunhoDasNotas();
await testListaSemColunas();

console.log('ok - mcp lê o carrossel pelas telas e não grava roteiro no lugar errado');
