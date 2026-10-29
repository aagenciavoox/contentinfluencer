import assert from 'node:assert/strict';
import { hashtagsPadraoForaSerie } from './hashtagsForaSerie.ts';

function testNaoSobrescreveNemAplicaEmSerie() {
  assert.equal(hashtagsPadraoForaSerie({
    seriesId: null,
    hashtagsAtuais: '',
    hashtagsForaSeries: '#livro #lidos',
  }), '#livro #lidos');
  assert.equal(hashtagsPadraoForaSerie({
    seriesId: null,
    hashtagsAtuais: '#meu',
    hashtagsForaSeries: '#livro',
  }), '#meu');
  assert.equal(hashtagsPadraoForaSerie({
    seriesId: 's1',
    hashtagsAtuais: '',
    hashtagsForaSeries: '#livro',
  }), '');
}

testNaoSobrescreveNemAplicaEmSerie();
console.log('hashtagsForaSerie tests passed');
