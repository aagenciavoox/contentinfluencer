import assert from 'node:assert/strict';
import {
  GROQ_TRANSCRIPTION_URL,
  MAX_AUDIO_BYTES,
  handleTranscriptionRequest,
} from './handler.ts';

const ENV: Record<string, string> = {
  SUPABASE_URL: 'https://projeto.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  GROQ_API_KEY: 'gsk_test',
};

function env(overrides: Record<string, string | undefined> = {}) {
  const values = { ...ENV, ...overrides };
  return (name: string) => values[name];
}

type FakeCall = { url: string; init?: RequestInit };

function fakeFetch(groqResponse: () => Response, signedIn = true) {
  const calls: FakeCall[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith('/auth/v1/user')) {
      return new Response('{}', { status: signedIn ? 200 : 401 });
    }
    if (url === GROQ_TRANSCRIPTION_URL) return groqResponse();
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  return { impl, calls };
}

function audioRequest(size = 1024, language = 'pt') {
  const form = new FormData();
  form.append('file', new File([new Uint8Array(size)], 'video.ogg', { type: 'audio/ogg' }));
  form.append('language', language);
  return new Request('https://fn/transcrever', {
    method: 'POST',
    headers: { Authorization: 'Bearer user-jwt' },
    body: form,
  });
}

const groqOk = () => new Response(JSON.stringify({
  text: ' Oi, gente. Hoje eu vou falar de livros. ',
  language: 'portuguese',
  duration: 4.2,
  segments: [
    { start: 0, end: 1.5, text: ' Oi, gente.' },
    { start: 1.5, end: 4.2, text: ' Hoje eu vou falar de livros.' },
    { start: 4.2, end: 4.2, text: '   ' },
  ],
}), { status: 200 });

async function testAnswersPreflight() {
  const response = await handleTranscriptionRequest(
    new Request('https://fn/transcrever', { method: 'OPTIONS' }),
    env(),
    fakeFetch(groqOk).impl,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
}

async function testRejectsSignedOutUser() {
  const { impl, calls } = fakeFetch(groqOk, false);
  const response = await handleTranscriptionRequest(audioRequest(), env(), impl);
  assert.equal(response.status, 401);
  assert.equal(calls.some(call => call.url === GROQ_TRANSCRIPTION_URL), false);
}

async function testExplainsMissingKey() {
  const response = await handleTranscriptionRequest(
    audioRequest(),
    env({ GROQ_API_KEY: undefined }),
    fakeFetch(groqOk).impl,
  );
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /GROQ_API_KEY/);
}

async function testRejectsAudioOverFreeLimit() {
  const { impl, calls } = fakeFetch(groqOk);
  const response = await handleTranscriptionRequest(audioRequest(MAX_AUDIO_BYTES + 1), env(), impl);
  assert.equal(response.status, 413);
  assert.equal(calls.some(call => call.url === GROQ_TRANSCRIPTION_URL), false);
}

async function testForwardsAudioAndReturnsSegments() {
  const { impl, calls } = fakeFetch(groqOk);
  const response = await handleTranscriptionRequest(audioRequest(), env(), impl);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    text: 'Oi, gente. Hoje eu vou falar de livros.',
    language: 'portuguese',
    duration: 4.2,
    segments: [
      { start: 0, end: 1.5, text: 'Oi, gente.' },
      { start: 1.5, end: 4.2, text: 'Hoje eu vou falar de livros.' },
    ],
  });

  const groqCall = calls.find(call => call.url === GROQ_TRANSCRIPTION_URL);
  assert.ok(groqCall);
  assert.equal((groqCall.init?.headers as Record<string, string>).Authorization, 'Bearer gsk_test');
  const sent = groqCall.init?.body as FormData;
  assert.equal(sent.get('model'), 'whisper-large-v3-turbo');
  assert.equal(sent.get('response_format'), 'verbose_json');
  assert.equal(sent.get('language'), 'pt');
  assert.equal((sent.get('file') as File).name, 'video.ogg');
}

async function testAutoLanguageIsNotSent() {
  const { impl, calls } = fakeFetch(groqOk);
  await handleTranscriptionRequest(audioRequest(1024, 'auto'), env(), impl);
  const sent = calls.find(call => call.url === GROQ_TRANSCRIPTION_URL)?.init?.body as FormData;
  assert.equal(sent.get('language'), null);
}

async function testMapsRateLimit() {
  const { impl } = fakeFetch(() => new Response('{}', { status: 429, headers: { 'retry-after': '120' } }));
  const response = await handleTranscriptionRequest(audioRequest(), env(), impl);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '120');
  assert.match((await response.json()).error, /limite gratuito/);
}

const tests = [
  ['transcrever answers the CORS preflight', testAnswersPreflight],
  ['transcrever rejects a signed-out user before calling Groq', testRejectsSignedOutUser],
  ['transcrever explains a missing GROQ_API_KEY', testExplainsMissingKey],
  ['transcrever rejects audio over the 25 MB free limit', testRejectsAudioOverFreeLimit],
  ['transcrever forwards the audio and returns clean segments', testForwardsAudioAndReturnsSegments],
  ['transcrever lets Whisper detect the language on auto', testAutoLanguageIsNotSent],
  ['transcrever maps the Groq rate limit to 429', testMapsRateLimit],
] as const;

for (const [name, test] of tests) {
  await test();
  console.log(`ok - ${name}`);
}
