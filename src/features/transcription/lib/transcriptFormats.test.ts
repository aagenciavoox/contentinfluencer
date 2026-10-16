import assert from 'node:assert/strict';
import {
  buildParagraphs,
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

function testPlainTextJoinsSegmentsIntoAParagraph() {
  assert.equal(
    buildPlainText({ text: 'ignorado', segments: [{ start: 0, end: 1, text: ' Um.' }, { start: 1, end: 2, text: 'Dois. ' }] }),
    'Um. Dois.',
  );
  assert.equal(buildPlainText({ text: ' Só texto. ', segments: [] }), 'Só texto.');
}

function lines(texts: string[], gap = 0) {
  let clock = 0;
  return texts.map(text => {
    const segment = { start: clock, end: clock + 2, text };
    clock += 2 + gap;
    return segment;
  });
}

function testBreaksParagraphOnLongPause() {
  const segments = [
    { start: 0, end: 2, text: 'Coisas que ninguém fala.' },
    { start: 2, end: 4, text: 'Você não precisa' },
    { start: 5.5, end: 7, text: 'E eu digo isso,' },
  ];
  assert.deepEqual(
    buildParagraphs({ text: '', segments }).map(paragraph => paragraph.map(line => line.text)),
    [['Coisas que ninguém fala.', 'Você não precisa'], ['E eu digo isso,']],
  );
}

function testBreaksParagraphOnSentenceEndAfterSomeLines() {
  const paragraphs = buildParagraphs({ text: '', segments: lines(['Um,', 'dois.', 'três,', 'quatro.', 'Cinco']) });
  assert.deepEqual(paragraphs.map(paragraph => paragraph.length), [4, 1]);
}

function testCapsParagraphLength() {
  const paragraphs = buildParagraphs({ text: '', segments: lines(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) });
  assert.deepEqual(paragraphs.map(paragraph => paragraph.length), [6, 2]);
}

function testKeepsSegmentStartAndSkipsEmptySegments() {
  const paragraphs = buildParagraphs({ text: '', segments: [{ start: 0, end: 1, text: ' ' }, { start: 1, end: 2, text: ' Oi.' }] });
  assert.deepEqual(paragraphs, [[{ text: 'Oi.', start: 1 }]]);
}

function testSplitsTextWithoutTimesIntoSentences() {
  assert.equal(
    buildPlainText({ text: 'Um. Dois! Três? Quatro.', segments: [] }),
    'Um. Dois! Três?\n\nQuatro.',
  );
  assert.equal(buildPlainText({ text: 'Linha um\nlinha dois\n\nOutro bloco', segments: [] }), 'Linha um linha dois\n\nOutro bloco');
}

function testPlainTextSeparatesParagraphsWithBlankLine() {
  assert.equal(
    buildPlainText({ text: '', segments: [{ start: 0, end: 1, text: 'Antes.' }, { start: 3, end: 4, text: 'Depois.' }] }),
    'Antes.\n\nDepois.',
  );
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
  ['joins segments of a paragraph into one line', testPlainTextJoinsSegmentsIntoAParagraph],
  ['breaks a paragraph on a long pause', testBreaksParagraphOnLongPause],
  ['breaks a paragraph on a sentence end after some lines', testBreaksParagraphOnSentenceEndAfterSomeLines],
  ['caps paragraph length', testCapsParagraphLength],
  ['keeps segment start and skips empty segments', testKeepsSegmentStartAndSkipsEmptySegments],
  ['splits text without times into sentences', testSplitsTextWithoutTimesIntoSentences],
  ['separates paragraphs with a blank line', testPlainTextSeparatesParagraphsWithBlankLine],
  ['names downloads after the source file', testNamesDownloadAfterSourceFile],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
