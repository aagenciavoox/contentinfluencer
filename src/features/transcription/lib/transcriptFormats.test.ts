import assert from 'node:assert/strict';
import {
  buildPlainText,
  buildSrt,
  formatClock,
  formatSrtTime,
  transcriptFileName,
} from './transcriptFormats.ts';

function testFormatsSrtTime() {
  assert.equal(formatSrtTime(0), '00:00:00,000');
  assert.equal(formatSrtTime(62.345), '00:01:02,345');
  assert.equal(formatSrtTime(3723.0004), '01:02:03,000');
  assert.equal(formatSrtTime(-3), '00:00:00,000');
}

function testFormatsClock() {
  assert.equal(formatClock(5), '0:05');
  assert.equal(formatClock(62.9), '1:02');
  assert.equal(formatClock(3723), '1:02:03');
}

function testBuildsNumberedSrtSkippingEmptyLines() {
  assert.equal(
    buildSrt([
      { start: 0, end: 1.5, text: ' Oi, gente.' },
      { start: 1.5, end: 1.5, text: '  ' },
      { start: 1.5, end: 4.25, text: 'Hoje é dia de livro.' },
    ]),
    '1\n00:00:00,000 --> 00:00:01,500\nOi, gente.\n\n2\n00:00:01,500 --> 00:00:04,250\nHoje é dia de livro.\n',
  );
}

function testSrtNeverEndsBeforeItStarts() {
  assert.match(buildSrt([{ start: 3, end: 2, text: 'a' }]), /00:00:03,000 --> 00:00:03,000/);
}

function testPlainTextUsesOneLinePerSegment() {
  assert.equal(
    buildPlainText({ text: 'ignorado', segments: [{ start: 0, end: 1, text: ' Um.' }, { start: 1, end: 2, text: 'Dois. ' }] }),
    'Um.\nDois.',
  );
  assert.equal(buildPlainText({ text: ' Só texto. ', segments: [] }), 'Só texto.');
}

function testNamesDownloadAfterSourceFile() {
  assert.equal(transcriptFileName('meu vídeo.final.mp4', 'txt'), 'meu vídeo.final.txt');
  assert.equal(transcriptFileName('reels', 'srt'), 'reels.srt');
  assert.equal(transcriptFileName('.mp4', 'txt'), 'transcricao.txt');
}

const tests = [
  ['formats SRT timestamps', testFormatsSrtTime],
  ['formats short clock times', testFormatsClock],
  ['builds a numbered SRT and skips empty segments', testBuildsNumberedSrtSkippingEmptyLines],
  ['keeps SRT end at or after start', testSrtNeverEndsBeforeItStarts],
  ['builds plain text one segment per line', testPlainTextUsesOneLinePerSegment],
  ['names downloads after the source file', testNamesDownloadAfterSourceFile],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
