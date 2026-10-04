import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countScriptWords,
  formatSpokenDuration,
  spokenDurationSeconds,
  SPOKEN_WORDS_PER_MINUTE,
} from './spokenDuration.ts';

function readingSecondsAtTwoAndAHalfWordsPerSecond(wordCount: number) {
  return Math.round(wordCount / 2.5);
}

describe('spoken duration', () => {
  it('counts words in script html', () => {
    assert.equal(countScriptWords(''), 0);
    assert.equal(countScriptWords('<p></p>'), 0);
    assert.equal(countScriptWords('<p>um dois&nbsp;três</p>'), 3);
  });

  it('estimates speech at the teleprompter pace, not a 2.5 words-per-second read', () => {
    assert.equal(SPOKEN_WORDS_PER_MINUTE / 60, 2);
    assert.notEqual(SPOKEN_WORDS_PER_MINUTE / 60, 2.5);

    assert.equal(spokenDurationSeconds(0), 0);
    assert.equal(spokenDurationSeconds(120), 60);
    assert.notEqual(
      spokenDurationSeconds(120),
      readingSecondsAtTwoAndAHalfWordsPerSecond(120),
    );
    assert.equal(spokenDurationSeconds(150), 75);
    assert.notEqual(spokenDurationSeconds(150), readingSecondsAtTwoAndAHalfWordsPerSecond(150));
  });

  it('labels the footer as spoken time', () => {
    assert.equal(formatSpokenDuration(0), '0 segundos de fala');
    assert.equal(formatSpokenDuration(1), '1 segundo de fala');
    assert.equal(formatSpokenDuration(40), '20 segundos de fala');
    assert.equal(formatSpokenDuration(120), '1 minuto de fala');
    assert.equal(formatSpokenDuration(121), '1 minuto e 1 segundo de fala');
    assert.equal(formatSpokenDuration(180), '1 minuto e 30 segundos de fala');
    assert.equal(formatSpokenDuration(240), '2 minutos de fala');
    assert.equal(formatSpokenDuration(150), '1 minuto e 15 segundos de fala');
    assert.doesNotMatch(formatSpokenDuration(120), /leitura/);
  });
});
