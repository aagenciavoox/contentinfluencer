import assert from 'node:assert/strict';
import {
  referenciaPublicacao,
  type ConteudoReferencia,
  type PublicacaoReferencia,
} from './referenciaPublicacao.ts';

const INSTAGRAM = 'plat-instagram';
const TIKTOK = 'plat-tiktok';
const YOUTUBE = 'plat-youtube';

function conteudo(partial: Partial<ConteudoReferencia>): ConteudoReferencia {
  return {
    id: 'c1',
    status: 'Produção',
    publishDate: '2026-10-20',
    publishTime: '08:00',
    formatoVisual: 'Reels',
    plataformas: [],
    ...partial,
  };
}

function publicacao(partial: Partial<PublicacaoReferencia> & Pick<PublicacaoReferencia, 'id' | 'platformId'>): PublicacaoReferencia {
  return {
    publishDate: null,
    publishTime: null,
    publicationKind: 'post',
    status: 'agendada',
    ...partial,
  };
}

function testBaseGanhaMesmoComDataMaisTarde() {
  const ref = referenciaPublicacao(conteudo({
    plataformas: [
      publicacao({
        id: 'tt',
        platformId: TIKTOK,
        publishDate: '2026-10-01',
        publishTime: '09:00',
      }),
      publicacao({
        id: 'ig',
        platformId: INSTAGRAM,
        publishDate: '2026-10-18',
        publishTime: '21:00',
      }),
    ],
  }), { redeReferenciaId: INSTAGRAM });

  assert.equal(ref.publicacao?.id, 'ig');
  assert.equal(ref.data, '2026-10-18');
  assert.equal(ref.redeBaseId, INSTAGRAM);
}

function testSoEmOutrasRedesNaoPreencheGrade() {
  const plataformas = [
    publicacao({
      id: 'z-tarde',
      platformId: YOUTUBE,
      publishDate: '2026-10-02',
      publishTime: '08:00',
    }),
    publicacao({
      id: 'a-cedo',
      platformId: TIKTOK,
      publishDate: '2026-10-01',
      publishTime: '09:00',
    }),
  ];
  const settings = { redeReferenciaId: INSTAGRAM };
  const ref = referenciaPublicacao(conteudo({ plataformas, publishDate: '2026-11-01' }), settings);
  assert.equal(ref.soEmOutrasRedes, true);
  assert.equal(ref.publicacao, null);
  assert.equal(ref.data, null);
  assert.equal(ref.hora, null);
}

function testSemRedeDeBaseAindaDesempataFora() {
  const plataformas = [
    publicacao({
      id: 'z-tarde',
      platformId: YOUTUBE,
      publishDate: '2026-10-02',
      publishTime: '08:00',
    }),
    publicacao({
      id: 'a-cedo',
      platformId: TIKTOK,
      publishDate: '2026-10-01',
      publishTime: '09:00',
    }),
  ];
  const ref = referenciaPublicacao(
    conteudo({ plataformas, publishDate: '2026-11-01' }),
    { redeReferenciaId: null },
  );
  assert.equal(ref.soEmOutrasRedes, false);
  assert.equal(ref.publicacao?.id, 'a-cedo');
  assert.equal(ref.data, '2026-10-01');
}

function testCongeladaNaoAcompanhaARedeNova() {
  const plataformas = [
    publicacao({
      id: 'ig',
      platformId: INSTAGRAM,
      publishDate: '2026-10-01',
      status: 'publicada',
    }),
    publicacao({
      id: 'tt',
      platformId: TIKTOK,
      publishDate: '2026-10-08',
      status: 'publicada',
    }),
  ];
  const publicado = conteudo({
    status: 'Postado',
    redeReferenciaCongeladaId: TIKTOK,
    plataformas,
  });

  const naBaseAntiga = referenciaPublicacao(publicado, { redeReferenciaId: INSTAGRAM });
  const baseTrocada = referenciaPublicacao(publicado, { redeReferenciaId: YOUTUBE });
  assert.equal(naBaseAntiga.publicacao?.id, 'tt');
  assert.equal(naBaseAntiga.data, '2026-10-08');
  assert.equal(baseTrocada.publicacao?.id, 'tt');
  assert.equal(baseTrocada.redeBaseId, TIKTOK);

  const aindaAberto = referenciaPublicacao(conteudo({
    status: 'Produção',
    redeReferenciaCongeladaId: TIKTOK,
    plataformas: plataformas.map(item => ({ ...item, status: 'agendada' })),
  }), { redeReferenciaId: INSTAGRAM });
  assert.equal(aindaAberto.publicacao?.id, 'ig');
  assert.equal(aindaAberto.redeBaseId, INSTAGRAM);
}

function testStoriesERepostNaoViraramReferencia() {
  const ref = referenciaPublicacao(conteudo({
    plataformas: [
      publicacao({
        id: 'story',
        platformId: INSTAGRAM,
        publishDate: '2026-10-01',
        formato: 'Stories',
      }),
      publicacao({
        id: 'repost',
        platformId: INSTAGRAM,
        publicationKind: 'repost',
        publishDate: '2026-10-02',
      }),
      publicacao({
        id: 'tt',
        platformId: TIKTOK,
        publishDate: '2026-10-09',
        publishTime: '11:00',
      }),
    ],
  }), { redeReferenciaId: INSTAGRAM });

  // Stories/repost na base não contam; só TikTok fora → fora da grade.
  assert.equal(ref.soEmOutrasRedes, true);
  assert.equal(ref.publicacao, null);
  assert.equal(ref.data, null);
}

function testSemPublicacaoUsaADataDoRoteiro() {
  const ref = referenciaPublicacao(conteudo({
    plataformas: [],
    publishDate: '2026-10-12',
    publishTime: '07:15',
  }), { redeReferenciaId: INSTAGRAM });

  assert.equal(ref.publicacao, null);
  assert.equal(ref.data, '2026-10-12');
  assert.equal(ref.hora, '07:15');
  assert.equal(ref.publicada, false);
}

testBaseGanhaMesmoComDataMaisTarde();
testSoEmOutrasRedesNaoPreencheGrade();
testSemRedeDeBaseAindaDesempataFora();
testCongeladaNaoAcompanhaARedeNova();
testStoriesERepostNaoViraramReferencia();
testSemPublicacaoUsaADataDoRoteiro();

console.log('referenciaPublicacao tests passed');
