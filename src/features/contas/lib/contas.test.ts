import assert from 'node:assert/strict';
import {
  contaDaRef,
  complementoDoRotulo,
  detalheConta,
  estadoCadastro,
  inferirRedePeloNome,
  normalizarHandle,
  redeDaConta,
  resolverConta,
  rotuloConexao,
  rotuloConta,
  travaDaContaPadrao,
  validarConta,
  type ContaRef,
} from './contas.ts';

const igPrincipal: ContaRef = { id: 'ig-1', nome: 'Instagram', rede: 'instagram', handle: 'dizaianne', ativo: true, userId: 'u' };
const igLeituras: ContaRef = { id: 'ig-2', nome: 'Leituras', rede: 'instagram', handle: 'diza.leituras', ativo: true, userId: 'u' };
const tiktok: ContaRef = { id: 'tt-1', nome: 'TikTok', rede: 'tiktok', handle: null, ativo: true, userId: 'u' };
const legado: ContaRef = { id: 'yt-1', nome: 'YouTube', ativo: true, userId: 'u' };
const contas = [igPrincipal, igLeituras, tiktok, legado];

function testDuasContasDaMesmaPlataformaSeDistinguem() {
  assert.equal(rotuloConta(igPrincipal), 'Instagram @dizaianne');
  assert.equal(rotuloConta(igLeituras), 'Instagram @diza.leituras');
  assert.notEqual(rotuloConta(igPrincipal), rotuloConta(igLeituras));
  assert.equal(detalheConta(igLeituras), '@diza.leituras · Leituras');
  assert.equal(complementoDoRotulo(igLeituras), 'Leituras');
  assert.equal(complementoDoRotulo(igPrincipal), null);
  assert.equal(rotuloConta(tiktok), 'TikTok');
  assert.equal(detalheConta(tiktok), 'TikTok · sem @');
  assert.equal(complementoDoRotulo(tiktok), 'sem @');
  assert.equal(complementoDoRotulo(legado), 'sem @');
}

function testVinculoPeloIdSobreviveATrocaDoArroba() {
  const renomeada = { ...igLeituras, handle: 'novo.arroba', nome: 'Clube' };
  const resolvida = contaDaRef('ig-2', [igPrincipal, renomeada]);
  assert.equal(resolvida?.id, 'ig-2');
  assert.equal(rotuloConta(resolvida as ContaRef), 'Instagram @novo.arroba');
}

function testNomeAntigoSoResolveSemAmbiguidade() {
  assert.equal(contaDaRef('Instagram', contas)?.id, 'ig-1');
  const duplicada = { ...igLeituras, nome: 'Instagram' };
  const resolucao = resolverConta('Instagram', [igPrincipal, duplicada]);
  assert.equal(resolucao.conta, null);
  assert.equal(resolucao.ambigua, true);
  assert.equal(resolverConta('Pinterest', contas).ambigua, false);
}

function testRedeSoPorNomeInequivoco() {
  assert.equal(inferirRedePeloNome(' Tik Tok '), 'tiktok');
  assert.equal(inferirRedePeloNome('Blog'), 'outra');
  assert.equal(inferirRedePeloNome('Insta da Diza'), null);
  assert.equal(redeDaConta(legado), 'youtube');
  assert.equal(redeDaConta({ nome: 'Reels', rede: null }), null);
}

function testHandleNormalizado() {
  assert.equal(normalizarHandle(' @@diza '), 'diza');
  assert.equal(normalizarHandle('@'), null);
  assert.equal(normalizarHandle(null), null);
}

function testEstadoDeCadastroNaoEhConexao() {
  assert.equal(estadoCadastro(igPrincipal), 'ativa');
  assert.equal(estadoCadastro(tiktok), 'incompleta');
  assert.equal(estadoCadastro({ ...igPrincipal, ativo: false }), 'inativa');
  assert.equal(estadoCadastro({ id: 'z', nome: 'Reels', ativo: true }), 'revisar');
  // Ter @ não conecta a conta.
  assert.equal(rotuloConexao(igPrincipal), 'Não conectada');
  assert.equal(rotuloConexao({ conexao: { status: 'conectada', provedor: 'x', contaExternaId: '1', atualizadaEm: null } }), 'Conectada');
}

function testValidacaoDaConta() {
  assert.deepEqual(validarConta({ rede: 'instagram', nome: 'Outra', handle: '@DIZAIANNE' }, contas).handle,
    'Já existe uma conta de Instagram com @DIZAIANNE.');
  assert.equal(validarConta({ rede: 'instagram', nome: 'Mesma', handle: 'dizaianne' }, contas, 'ig-1').handle, undefined);
  assert.equal(validarConta({ rede: 'tiktok', nome: 'TT', handle: '' }, contas).handle, 'Informe o @ da conta.');
  assert.equal(validarConta({ rede: 'outra', nome: 'Blog', handle: '' }, contas).handle, undefined);
  assert.equal(validarConta({ rede: 'tiktok', nome: 'TT', handle: 'com espaço!' }, contas).handle,
    'Use só letras, números, ponto, traço e sublinhado.');
  assert.equal(validarConta({ rede: null, nome: '', handle: 'x' }, contas).rede, 'Escolha a plataforma.');
}

function testPlataformaPadraoMantemUmaContaAtiva() {
  // Com duas contas de Instagram, qualquer uma pode ser desativada.
  assert.equal(travaDaContaPadrao(igPrincipal, contas), null);
  // TikTok tem uma só: fica ligada.
  assert.match(travaDaContaPadrao(tiktok, contas) ?? '', /Única conta ativa de TikTok/);
  const igInativa = { ...igLeituras, ativo: false };
  assert.match(travaDaContaPadrao(igPrincipal, [igPrincipal, igInativa]) ?? '', /Única conta ativa de Instagram/);
}

testDuasContasDaMesmaPlataformaSeDistinguem();
testVinculoPeloIdSobreviveATrocaDoArroba();
testNomeAntigoSoResolveSemAmbiguidade();
testRedeSoPorNomeInequivoco();
testHandleNormalizado();
testEstadoDeCadastroNaoEhConexao();
testValidacaoDaConta();
testPlataformaPadraoMantemUmaContaAtiva();
console.log('contas tests passed');
