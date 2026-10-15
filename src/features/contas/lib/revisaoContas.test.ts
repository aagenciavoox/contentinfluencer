import assert from 'node:assert/strict';
import type { ContentPlataforma } from '../../../lib/database.ts';
import type { ContaRef } from './contas.ts';
import { anexarPublicacaoComLink, contasParaLinkAntigo, moverLinkParaPublicacao, publicacaoDaMetrica, redeSugeridaPeloLink, revisoesDeContas } from './revisaoContas.ts';

const ig: ContaRef = { id: 'ig-1', nome: 'Instagram', rede: 'instagram', handle: 'diza', ativo: true, userId: 'u' };
const ig2: ContaRef = { id: 'ig-2', nome: 'Leituras', rede: 'instagram', handle: 'leituras', ativo: true, userId: 'u' };
const tt: ContaRef = { id: 'tt-1', nome: 'TikTok', ativo: true, userId: 'u' };

function pub(partial: Partial<ContentPlataforma> & Pick<ContentPlataforma, 'id' | 'platformId'>): ContentPlataforma {
  return {
    contentId: 'c1',
    legenda: '',
    hashtags: '',
    publishDate: null,
    publicationKind: 'post',
    status: 'agendada',
    ...partial,
  };
}

function testMigracaoDeCadastrosNaoGeraRevisaoQuandoNadaEhAmbiguo() {
  // Banco antigo: contas sem `rede`, publicações já com o id. Nada a revisar.
  const contas: ContaRef[] = [
    { id: 'p-ig', nome: 'Instagram', ativo: true, userId: 'u' },
    { id: 'p-tt', nome: 'TikTok', ativo: true, userId: 'u' },
    { id: 'p-blog', nome: 'Blog', ativo: false, userId: 'u' },
  ];
  const itens = revisoesDeContas({
    contas,
    contents: [{ id: 'c1', title: 'Afantasia', plataformas: [pub({ id: 'a', platformId: 'p-ig' }), pub({ id: 'b', platformId: 'p-tt' })] }],
  });
  assert.deepEqual(itens, []);
}

function testCasosAmbiguosAparecemSemAtribuicao() {
  const contas: ContaRef[] = [
    ig,
    { id: 'ig-x', nome: 'Instagram', rede: 'instagram', handle: null, ativo: true, userId: 'u' },
    { id: 'ig-y', nome: 'Instagram', rede: 'instagram', handle: null, ativo: true, userId: 'u' },
    { id: 'r', nome: 'Reels da Diza', ativo: true, userId: 'u' },
  ];
  const itens = revisoesDeContas({
    contas,
    contents: [
      {
        id: 'c1',
        title: 'Roteiro antigo',
        link: 'https://www.instagram.com/reel/abc/',
        plataformas: [
          pub({ id: 'p1', platformId: 'Instagram' }),
          pub({ id: 'p2', platformId: 'apagada' }),
          pub({ id: 'p3', platformId: 'ig-1' }),
          pub({ id: 'p4', platformId: 'ig-1' }),
        ],
      },
    ],
    referencias: [{ origem: 'Conta base do calendário', ref: 'Instagram' }],
  });
  const casos = itens.map(item => item.caso).sort();
  assert.deepEqual(casos, [
    'conta_sem_plataforma',
    'contas_indistintas',
    'link_sem_publicacao',
    'publicacao_repetida',
    'publicacao_sem_conta',
    'referencia_ambigua',
    'referencia_ambigua',
  ]);
}

function testMetricaSoLigaComPublicacaoUnica() {
  const publicacoes = [
    pub({ id: 'ig-post', platformId: 'ig-1' }),
    pub({ id: 'ig2-post', platformId: 'ig-2' }),
    pub({ id: 'ig-repost', platformId: 'ig-1', publicationKind: 'repost' }),
  ];
  const contas = [ig, ig2, tt];
  // Mesmo vídeo em duas contas: cada métrica fica com a sua publicação.
  assert.equal(publicacaoDaMetrica({ id: 'm1', contentId: 'c1', platformId: 'ig-1' }, publicacoes, contas)?.id, 'ig-post');
  assert.equal(publicacaoDaMetrica({ id: 'm2', contentId: 'c1', platformId: 'ig-2' }, publicacoes, contas)?.id, 'ig2-post');
  assert.equal(
    publicacaoDaMetrica({ id: 'm3', contentId: 'c1', platformId: 'ig-1', publicacaoId: 'ig-repost' }, publicacoes, contas)?.id,
    'ig-repost',
  );
  const duasOriginais = [...publicacoes, pub({ id: 'ig-dup', platformId: 'ig-1' })];
  assert.equal(publicacaoDaMetrica({ id: 'm4', contentId: 'c1', platformId: 'ig-1' }, duasOriginais, contas), null);
}

function testMoverLinkSoNaPublicacaoEscolhida() {
  const conteudo = {
    id: 'c1',
    title: 'Antigo',
    link: ' https://www.instagram.com/p/abc/ ',
    plataformas: [
      pub({ id: 'ig', platformId: 'ig-1', postUrl: null }),
      pub({ id: 'tt', platformId: 'tt-1', postUrl: 'https://www.tiktok.com/v/1' }),
    ],
  };
  const movido = moverLinkParaPublicacao(conteudo, 'ig');
  assert.equal(movido?.link, null);
  assert.equal(movido?.plataformas[0]?.postUrl, 'https://www.instagram.com/p/abc/');
  assert.equal(movido?.plataformas[1]?.postUrl, 'https://www.tiktok.com/v/1');
  assert.equal(moverLinkParaPublicacao(conteudo, 'nao-existe'), null);
  assert.deepEqual(
    revisoesDeContas({ contas: [ig, tt], contents: movido ? [movido] : [] }),
    [],
  );
}

testMigracaoDeCadastrosNaoGeraRevisaoQuandoNadaEhAmbiguo();
testCasosAmbiguosAparecemSemAtribuicao();
testMetricaSoLigaComPublicacaoUnica();
testMoverLinkSoNaPublicacaoEscolhida();

function testLinkAntigoSemPublicacaoSugereARedeDoEndereco() {
  assert.equal(redeSugeridaPeloLink('https://www.instagram.com/p/abc/'), 'instagram');
  assert.equal(redeSugeridaPeloLink('https://www.tiktok.com/@diza/video/1'), 'tiktok');
  assert.equal(redeSugeridaPeloLink('https://youtu.be/abc'), 'youtube');
  assert.deepEqual(
    contasParaLinkAntigo('https://www.instagram.com/p/abc/', [ig, ig2, tt]).map(conta => conta.id),
    ['ig-1', 'ig-2'],
  );
  const conteudo = {
    id: 'c1',
    title: 'Sem publicação',
    link: 'https://www.instagram.com/p/abc/',
    plataformas: [] as ReturnType<typeof pub>[],
  };
  const criada = pub({ id: 'nova', platformId: 'ig-1', status: 'publicada' });
  const anexado = anexarPublicacaoComLink(conteudo, criada);
  assert.equal(anexado?.link, null);
  assert.equal(anexado?.plataformas.length, 1);
  assert.equal(anexado?.plataformas[0]?.postUrl, 'https://www.instagram.com/p/abc/');
  assert.deepEqual(revisoesDeContas({ contas: [ig], contents: anexado ? [anexado] : [] }), []);
}

testLinkAntigoSemPublicacaoSugereARedeDoEndereco();
console.log('revisaoContas tests passed');
