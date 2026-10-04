import assert from 'node:assert/strict';
import { parsePostCode } from './postCode.ts';

function testInstagram() {
  assert.equal(
    parsePostCode('https://www.instagram.com/reel/ABC123xyz/?igsh=abc&utm_source=ig'),
    'ABC123xyz',
  );
  assert.equal(parsePostCode('https://instagram.com/reels/ReelsCode/'), 'ReelsCode');
  assert.equal(parsePostCode('https://www.instagram.com/p/PostCode'), 'PostCode');
  assert.equal(parsePostCode('instagram.com/tv/TvCode/?utm_medium=copy'), 'TvCode');
}

function testTikTok() {
  assert.equal(
    parsePostCode('https://www.tiktok.com/@criadora/video/7123456789012345678?utm_source=ig&utm_medium=share'),
    '7123456789012345678',
  );
  assert.equal(parsePostCode('https://vm.tiktok.com/ZMabc123/?utm_campaign=x'), null);
  assert.equal(parsePostCode('https://www.tiktok.com/@criadora/video/'), null);
}

function testIgnoraLixo() {
  assert.equal(parsePostCode(''), null);
  assert.equal(parsePostCode(null), null);
  assert.equal(parsePostCode('https://example.com/reel/ABC'), null);
}

testInstagram();
testTikTok();
testIgnoraLixo();

console.log('postCode tests passed');