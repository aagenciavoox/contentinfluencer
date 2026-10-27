import assert from 'node:assert/strict';
import type { ContentPlataforma } from '../../../lib/database.ts';
import {
  adaptarLegenda,
  adicionarHashtagsAoFim,
  atualizarLegendaBase,
  copiarLegendaParaTodas,
  criarVersaoPropria,
  definirLegendaCompartilhada,
  editarLegendaDaConta,
  editarVersaoPropria,
  estadoLegenda,
  hashtagsNaLegenda,
  legendaComHashtags,
  legendaEfetiva,
  legendasDaSerie,
  legendasQueSeriamSubstituidas,
  migrarLegendas,
  publicacaoJaPostada,
  temLegenda,
  voltarParaBase,
} from './captions.ts';
import { markPublished } from './markPublished.ts';

const instagram = { id: 'ig', nome: 'Instagram' };
const tiktok = { id: 'tt', nome: 'TikTok' };

function publicacao(
  partial: Partial<ContentPlataforma> & Pick<ContentPlataforma, 'id' | 'platformId' | 'legenda'>,
): ContentPlataforma {
  return {
    contentId: 'c1',
    hashtags: '',
    publishDate: null,
    publicationKind: 'post',
    status: 'agendada',
    legendaPropria: false,
    ...partial,
  };
}

function testBaseAteAdaptar() {
  const compartilhada = publicacao({ id: 'ig', platformId: 'ig', legenda: 'antiga' });
  assert.equal(legendaEfetiva(null, compartilhada), 'antiga');
  assert.equal(legendaEfetiva('base nova', compartilhada), 'base nova');

  const adaptada = adaptarLegenda('base nova', [compartilhada], instagram)[0];
  assert.equal(adaptada?.legendaPropria, true);
  assert.equal(adaptada?.legenda, 'base nova');
  assert.equal(legendaEfetiva('outra base', adaptada as ContentPlataforma), 'base nova');
}

function testPrimeiraEdicaoPreservaTextoDiferente() {
  const resultado = definirLegendaCompartilhada({
    legendaBaseAtual: null,
    novoTexto: 'legenda do instagram',
    plataformaEditada: instagram,
    publicacoes: [
      publicacao({ id: 'ig', platformId: 'Instagram', legenda: 'legenda do insta' }),
      publicacao({ id: 'tt', platformId: 'tt', legenda: 'só no tiktok' }),
    ],
  });

  assert.equal(resultado.legendaBase, 'legenda do instagram');
  const tiktokPub = resultado.publicacoes.find(item => item.id === 'tt');
  const instagramPub = resultado.publicacoes.find(item => item.id === 'ig');
  assert.equal(tiktokPub?.legendaPropria, true);
  assert.equal(tiktokPub?.legenda, 'só no tiktok');
  assert.equal(instagramPub?.legendaPropria, false);
  assert.equal(instagramPub?.legenda, 'legenda do instagram');
  assert.equal(legendaEfetiva(resultado.legendaBase, tiktokPub as ContentPlataforma), 'só no tiktok');
  assert.equal(legendaEfetiva(resultado.legendaBase, instagramPub as ContentPlataforma), 'legenda do instagram');
}

function testEditarBaseNaoMexeNaPropria() {
  const resultado = definirLegendaCompartilhada({
    legendaBaseAtual: 'base',
    novoTexto: 'base editada',
    plataformaEditada: instagram,
    publicacoes: [
      publicacao({ id: 'ig', platformId: 'ig', legenda: 'base' }),
      publicacao({ id: 'tt', platformId: 'tt', legenda: 'exclusiva', legendaPropria: true }),
    ],
  });
  assert.equal(resultado.legendaBase, 'base editada');
  assert.equal(resultado.publicacoes.find(item => item.id === 'ig')?.legenda, 'base editada');
  assert.equal(resultado.publicacoes.find(item => item.id === 'tt')?.legenda, 'exclusiva');
}

function testMigracaoUsaRedeDeReferencia() {
  const resultado = migrarLegendas({
    legendaBase: null,
    redeReferencia: instagram,
    publicacoes: [
      publicacao({ id: 'ig', platformId: 'ig', legenda: 'texto da grade' }),
      publicacao({ id: 'tt', platformId: tiktok.id, legenda: 'outro texto' }),
      publicacao({ id: 'yt', platformId: 'yt', legenda: 'texto da grade' }),
    ],
  });
  assert.equal(resultado.legendaBase, 'texto da grade');
  assert.equal(resultado.publicacoes.find(item => item.id === 'tt')?.legendaPropria, true);
  assert.equal(resultado.publicacoes.find(item => item.id === 'yt')?.legendaPropria, false);
  assert.equal(resultado.publicacoes.find(item => item.id === 'ig')?.legendaPropria, false);
}

// Duas contas de Instagram e uma de TikTok, com o mesmo conteúdo.
function tresPublicacoes(): ContentPlataforma[] {
  return [
    publicacao({ id: 'ig1', platformId: 'conta-ig-1', legenda: 'base' }),
    publicacao({ id: 'ig2', platformId: 'conta-ig-2', legenda: 'só na segunda conta', legendaPropria: true }),
    publicacao({ id: 'tt', platformId: 'conta-tt', legenda: 'base' }),
  ];
}

function testVersaoPropriaIsolaUmaPublicacao() {
  const editadas = editarVersaoPropria(tresPublicacoes(), 'ig2', 'texto novo da segunda');
  assert.equal(editadas.find(item => item.id === 'ig2')?.legenda, 'texto novo da segunda');
  assert.equal(legendaEfetiva('base', editadas.find(item => item.id === 'ig1') as ContentPlataforma), 'base');
  assert.equal(legendaEfetiva('base', editadas.find(item => item.id === 'tt') as ContentPlataforma), 'base');

  const criada = criarVersaoPropria('base', editadas, 'tt');
  const tiktokPub = criada.find(item => item.id === 'tt') as ContentPlataforma;
  assert.equal(tiktokPub.legendaPropria, true);
  assert.equal(tiktokPub.legenda, 'base');
  assert.equal(estadoLegenda(tiktokPub), 'propria');
  // A outra conta de Instagram continua acompanhando a base.
  assert.equal(estadoLegenda(criada.find(item => item.id === 'ig1') as ContentPlataforma), 'base');
}

function testBaseNovaNaoSobrescreveAdaptacaoNemPublicada() {
  const publicacoes = tresPublicacoes().map(item => (
    item.id === 'tt' ? { ...item, status: 'publicada' as const, legenda: '' } : item
  ));
  const resultado = atualizarLegendaBase({ anterior: 'base', nova: 'base revisada', publicacoes });
  const porId = new Map(resultado.publicacoes.map(item => [item.id, item]));
  assert.equal(legendaEfetiva(resultado.legendaBase, porId.get('ig1') as ContentPlataforma), 'base revisada');
  assert.equal(legendaEfetiva(resultado.legendaBase, porId.get('ig2') as ContentPlataforma), 'só na segunda conta');
  // A publicada acompanhava a base e não tinha texto gravado: congela no texto que estava valendo.
  assert.equal(legendaEfetiva(resultado.legendaBase, porId.get('tt') as ContentPlataforma), 'base');
  assert.equal(estadoLegenda(porId.get('tt') as ContentPlataforma), 'publicada');
}

function testVoltarParaBaseAcompanhaABaseAtual() {
  const voltou = voltarParaBase('base atual', tresPublicacoes(), 'ig2');
  const segunda = voltou.find(item => item.id === 'ig2') as ContentPlataforma;
  assert.equal(segunda.legendaPropria, false);
  assert.equal(legendaEfetiva('base atual', segunda), 'base atual');
  // Depois de voltar, a próxima mudança da base chega nela.
  const depois = atualizarLegendaBase({ anterior: 'base atual', nova: 'base de amanhã', publicacoes: voltou });
  assert.equal(legendaEfetiva(depois.legendaBase, depois.publicacoes.find(item => item.id === 'ig2') as ContentPlataforma), 'base de amanhã');
  // Publicada não volta.
  const publicada = tresPublicacoes().map(item => (item.id === 'ig2' ? { ...item, status: 'publicada' as const } : item));
  assert.equal(voltarParaBase('x', publicada, 'ig2').find(item => item.id === 'ig2')?.legenda, 'só na segunda conta');
  assert.equal(editarVersaoPropria(publicada, 'ig2', 'mudou?').find(item => item.id === 'ig2')?.legenda, 'só na segunda conta');
}

function testMarcarComoPublicadaGuardaOTextoUsado() {
  const content = { status: 'Produção', legendaBase: 'texto que foi ao ar' };
  const publicacoes = [publicacao({ id: 'ig1', platformId: 'conta-ig-1', legenda: '' })];
  const marcado = markPublished(content, publicacoes, [{ id: 'ig1', realizadaEm: '2026-10-10T19:00:00.000Z' }]);
  const pub = marcado.publicacoes[0] as ContentPlataforma;
  assert.equal(pub.legenda, 'texto que foi ao ar');
  assert.equal(legendaEfetiva('base trocada depois', pub), 'texto que foi ao ar');
}

function testComLegendaPeloTextoEfetivo() {
  const usandoBase = publicacao({ id: 'a', platformId: 'x', legenda: '' });
  assert.equal(temLegenda('base preenchida', usandoBase), true);
  assert.equal(temLegenda('   ', usandoBase), false);
  assert.equal(temLegenda(null, usandoBase), false);
}

function testPostadoSemStatusPorPublicacaoContaComoRealizado() {
  const pub = publicacao({ id: 'a', platformId: 'x', legenda: '' });
  assert.equal(publicacaoJaPostada(pub, { status: 'Postado', plataformas: [pub] }), true);
  const outra = { ...pub, id: 'b', status: 'publicada' as const };
  // Com status por publicação, só a marcada conta.
  assert.equal(publicacaoJaPostada(pub, { status: 'Postado', plataformas: [pub, outra] }), false);
  assert.equal(publicacaoJaPostada(pub, { status: 'Roteiro', plataformas: [pub] }), false);
}

function testSerieOrientaRoteiroNovo() {
  const resultado = legendasDaSerie(
    { legendaBase: 'legenda da série', plataformas: [{ platformId: 'conta-tt', legenda: 'versão da série para o TikTok' }] },
    [
      publicacao({ id: 'ig1', platformId: 'conta-ig-1', legenda: '' }),
      publicacao({ id: 'tt', platformId: 'conta-tt', legenda: '' }),
    ],
  );
  assert.equal(resultado.legendaBase, 'legenda da série');
  assert.equal(resultado.publicacoes[0]?.legendaPropria, false);
  assert.equal(legendaEfetiva(resultado.legendaBase, resultado.publicacoes[0] as ContentPlataforma), 'legenda da série');
  assert.equal(resultado.publicacoes[1]?.legendaPropria, true);
  assert.equal(resultado.publicacoes[1]?.legenda, 'versão da série para o TikTok');
}

function testUsarEstaLegendaEmTodas() {
  const publicacoes = [
    publicacao({ id: 'ig', platformId: 'ig', legenda: 'texto do insta', legendaPropria: true }),
    publicacao({ id: 'tt', platformId: 'tt', legenda: 'texto do tiktok', legendaPropria: true }),
    publicacao({ id: 'ig2', platformId: 'ig2', legenda: '' }),
    publicacao({ id: 'yt', platformId: 'yt', legenda: 'já foi ao ar', legendaPropria: true, status: 'publicada' }),
    publicacao({ id: 'fora', platformId: 'fora', legenda: 'não foi ao ar', legendaPropria: true, status: 'nao_publicada' }),
  ];

  // Só quem tem texto diferente pede confirmação; a vazia e a publicada não entram.
  const substituidas = legendasQueSeriamSubstituidas('', publicacoes, 'ig');
  assert.deepEqual(substituidas.map(item => item.id), ['tt']);

  const copiadas = copiarLegendaParaTodas('', publicacoes, 'ig');
  assert.equal(copiadas.find(item => item.id === 'tt')?.legenda, 'texto do insta');
  assert.equal(copiadas.find(item => item.id === 'ig2')?.legenda, 'texto do insta');
  assert.equal(copiadas.find(item => item.id === 'ig2')?.legendaPropria, true);
  assert.equal(copiadas.find(item => item.id === 'yt')?.legenda, 'já foi ao ar');
  assert.equal(copiadas.find(item => item.id === 'fora')?.legenda, 'não foi ao ar');

  // Depois da cópia, cada legenda segue sozinha.
  const editada = editarVersaoPropria(copiadas, 'tt', 'só no tiktok');
  assert.equal(editada.find(item => item.id === 'tt')?.legenda, 'só no tiktok');
  assert.equal(editada.find(item => item.id === 'ig')?.legenda, 'texto do insta');
  assert.equal(editada.find(item => item.id === 'ig2')?.legenda, 'texto do insta');

  // Publicação que acompanhava a base leva o texto que mostrava.
  const daBase = copiarLegendaParaTodas('legenda base', [
    publicacao({ id: 'a', platformId: 'a', legenda: '' }),
    publicacao({ id: 'b', platformId: 'b', legenda: 'outra', legendaPropria: true }),
  ], 'a');
  assert.equal(daBase.find(item => item.id === 'b')?.legenda, 'legenda base');
}

function testHashtagsDentroDaLegenda() {
  // Hashtag nova vai para um parágrafo no fim; a seguinte entra na mesma linha.
  const comUma = adicionarHashtagsAoFim('Livro do mês.\n', ['#livros']);
  assert.equal(comUma, 'Livro do mês.\n\n#livros');
  assert.equal(adicionarHashtagsAoFim(comUma, ['romance', '#Livros']), 'Livro do mês.\n\n#livros #romance');
  assert.equal(adicionarHashtagsAoFim('', ['#booktok']), '#booktok');
  assert.equal(adicionarHashtagsAoFim('Texto #livros no meio.', ['#livros']), 'Texto #livros no meio.');
  assert.deepEqual(hashtagsNaLegenda('Oi #leitura e #Leitura, #ficção_científica'), ['#leitura', '#ficção_científica']);

  // Hashtags guardadas à parte aparecem no fim do texto, sem repetir.
  const antiga = publicacao({ id: 'a', platformId: 'ig', legenda: 'Texto #livros', legendaPropria: true, hashtags: '#livros #romance' });
  assert.equal(legendaComHashtags(null, antiga), 'Texto #livros\n\n#romance');

  // Editar na Gestão leva tudo para o texto e esvazia o campo separado.
  const editada = editarLegendaDaConta([antiga], 'a', 'Texto #livros\n\n#romance #booktok');
  assert.equal(editada[0].legenda, 'Texto #livros\n\n#romance #booktok');
  assert.equal(editada[0].hashtags, '');

  // A cópia leva as hashtags junto e não deixa repetidas no destino.
  const copiadas = copiarLegendaParaTodas(null, [
    antiga,
    publicacao({ id: 'b', platformId: 'tt', legenda: '', hashtags: '#velha' }),
  ], 'a');
  assert.equal(copiadas[1].legenda, 'Texto #livros\n\n#romance');
  assert.equal(copiadas[1].hashtags, '');
}

testBaseAteAdaptar();
testPrimeiraEdicaoPreservaTextoDiferente();
testEditarBaseNaoMexeNaPropria();
testMigracaoUsaRedeDeReferencia();
testVersaoPropriaIsolaUmaPublicacao();
testBaseNovaNaoSobrescreveAdaptacaoNemPublicada();
testVoltarParaBaseAcompanhaABaseAtual();
testMarcarComoPublicadaGuardaOTextoUsado();
testComLegendaPeloTextoEfetivo();
testPostadoSemStatusPorPublicacaoContaComoRealizado();
testSerieOrientaRoteiroNovo();
testUsarEstaLegendaEmTodas();
testHashtagsDentroDaLegenda();
console.log('captions tests passed');