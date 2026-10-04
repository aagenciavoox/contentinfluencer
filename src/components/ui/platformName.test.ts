import assert from 'node:assert/strict';
import { platformDisplayName, platformKey } from './platformName.ts';

function testPlatformKeyNormalizesSavedSpellings() {
  assert.equal(platformKey('Instagram'), 'instagram');
  assert.equal(platformKey('TikTok'), 'tiktok');
  assert.equal(platformKey('Tiktok'), 'tiktok');
  assert.equal(platformKey('YouTube'), 'youtube');
  assert.equal(platformKey('Youtube'), 'youtube');
}

function testPlatformKeyIgnoresSpacesAndAccents() {
  assert.equal(platformKey('  Tik Tok '), 'tiktok');
  assert.equal(platformKey('You\tTube'), 'youtube');
  assert.equal(platformKey('Pinterést'), 'pinterest');
  assert.equal(platformKey('Ínstagram'), 'instagram');
  assert.equal(platformKey(''), '');
}

function testDisplayNameUsesOfficialSpelling() {
  assert.equal(platformDisplayName('Tiktok'), 'TikTok');
  assert.equal(platformDisplayName('tiktok'), 'TikTok');
  assert.equal(platformDisplayName('Youtube'), 'YouTube');
  assert.equal(platformDisplayName('YOUTUBE'), 'YouTube');
  assert.equal(platformDisplayName('instagram'), 'Instagram');
  assert.equal(platformDisplayName(' Tik Tok '), 'TikTok');
}

function testDisplayNameKeepsUnknownPlatformsAsSaved() {
  assert.equal(platformDisplayName('Blog'), 'Blog');
  assert.equal(platformDisplayName('newsletter da Anne'), 'newsletter da Anne');
  assert.equal(platformDisplayName(''), '');
}

testPlatformKeyNormalizesSavedSpellings();
testPlatformKeyIgnoresSpacesAndAccents();
testDisplayNameUsesOfficialSpelling();
testDisplayNameKeepsUnknownPlatformsAsSaved();

console.log('platformName.test.ts: ok');
