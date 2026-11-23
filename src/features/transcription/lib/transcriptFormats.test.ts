import assert from 'node:assert/strict';
import {
  buildParagraphs,
  buildPlainText,
  buildSrt,
  buildTimedSegments,
  CAPTION_MAX_CHARS,
  CAPTION_MAX_WORDS,
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

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function captionRows(text: string) {
  return text.split('\n');
}

function testKeepsAShortCaptionOnOneLine() {
  assert.deepEqual(
    buildTimedSegments([{ start: 0, end: 1.5, text: ' Oi, gente. ' }]),
    [{ start: 0, end: 1.5, text: 'Oi, gente.' }],
  );
}

function testBreaksACaptionIntoTwoShortLines() {
  assert.deepEqual(
    buildTimedSegments([{ start: 1, end: 4, text: ' Virar vampiro parecia muito melhor quando eu era nova. ' }]),
    [{ start: 1, end: 4, text: 'Virar vampiro parecia muito melhor\nquando eu era nova.' }],
  );
}

function testSplitsALongCaptionAndSharesItsTimeByWordCount() {
  const [first, second] = buildTimedSegments([{
    start: 1.5,
    end: 18.5,
    text: 'Quando eu terminei o livro inteiro numa noite só, eu fiquei olhando para o teto até amanhecer.',
  }]);
  assert.equal(first.text, 'Quando eu terminei o livro inteiro\nnuma noite só,');
  assert.equal(second.text, 'eu fiquei olhando para o teto\naté amanhecer.');
  assert.equal(first.start, 1.5);
  assert.equal(first.end, 10.5);
  assert.equal(second.start, 10.5);
  assert.equal(second.end, 18.5);
}

function testPutsTwoShortSentencesOnSeparateCaptionLines() {
  assert.deepEqual(
    buildTimedSegments([{ start: 0, end: 7, text: 'Oi, gente. Hoje é dia de livro.' }]),
    [{ start: 0, end: 7, text: 'Oi, gente.\nHoje é dia de livro.' }],
  );
}

function testDoesNotEndACaptionLineOnALooseWord() {
  assert.deepEqual(
    buildTimedSegments([{ start: 0, end: 2, text: 'palavraa palavrab palavrac de palavrad' }]),
    [{ start: 0, end: 2, text: 'palavraa palavrab palavrac\nde palavrad' }],
  );
}

function testTimedCuesStayWithinTheCaptionLimit() {
  const words = Array.from({ length: 28 }, (_, index) => `palavra${index}`).join(' ');
  const cues = buildTimedSegments([{ start: 0, end: 28, text: words }]);
  assert.equal(cues.map(cue => cue.text.replaceAll('\n', ' ')).join(' '), words);
  assert.ok(cues.some(cue => cue.text.includes('\n')));
  cues.forEach(cue => {
    const rows = captionRows(cue.text);
    assert.ok(rows.length <= 2, cue.text);
    rows.forEach(row => {
      assert.ok(row.length <= CAPTION_MAX_CHARS, row);
      assert.ok(wordCount(row) <= CAPTION_MAX_WORDS, row);
    });
  });
  assert.equal(cues[0].start, 0);
  assert.equal(cues.at(-1)?.end, 28);
  for (let index = 1; index < cues.length; index++) {
    assert.equal(cues[index].start, cues[index - 1].end);
  }
}

function testSrtKeepsTheCaptionLineBreak() {
  assert.equal(
    buildSrt(buildTimedSegments([{ start: 0, end: 7, text: 'Oi, gente. Hoje é dia de livro.' }])),
    '1\n00:00:00,000 --> 00:00:07,000\nOi, gente.\nHoje é dia de livro.\n',
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
  ['keeps a short caption on one line', testKeepsAShortCaptionOnOneLine],
  ['breaks a caption into two short lines', testBreaksACaptionIntoTwoShortLines],
  ['splits a long caption and shares its time by word count', testSplitsALongCaptionAndSharesItsTimeByWordCount],
  ['puts two short sentences on separate caption lines', testPutsTwoShortSentencesOnSeparateCaptionLines],
  ['does not end a caption line on a loose word', testDoesNotEndACaptionLineOnALooseWord],
  ['keeps timed cues within the caption limit', testTimedCuesStayWithinTheCaptionLimit],
  ['keeps the caption line break in the SRT', testSrtKeepsTheCaptionLineBreak],
  ['names downloads after the source file', testNamesDownloadAfterSourceFile],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
