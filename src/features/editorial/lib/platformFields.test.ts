import assert from 'node:assert/strict';
import { platformShowsField, visiblePlatformFields } from './platformFields.ts';

function testYouTubeMostraTitulo() {
  assert.deepEqual(visiblePlatformFields('YouTube'), ['titulo', 'legenda']);
  assert.equal(platformShowsField('youtube', 'titulo'), true);
  assert.equal(platformShowsField('YouTube', 'hashtags'), false);
}

function testInstagramETikTokMostramHashtags() {
  assert.deepEqual(visiblePlatformFields('Instagram'), ['legenda', 'hashtags']);
  assert.deepEqual(visiblePlatformFields('tik tok'), ['legenda', 'hashtags']);
  assert.equal(platformShowsField('TikTok', 'titulo'), false);
  assert.equal(platformShowsField('Instagram', 'hashtags'), true);
}

function testOutrasRedesSoTemLegenda() {
  assert.deepEqual(visiblePlatformFields('Blog'), ['legenda']);
  assert.equal(platformShowsField('Blog', 'titulo'), false);
  assert.equal(platformShowsField('Blog', 'hashtags'), false);
}

testYouTubeMostraTitulo();
testInstagramETikTokMostramHashtags();
testOutrasRedesSoTemLegenda();
console.log('platformFields tests passed');