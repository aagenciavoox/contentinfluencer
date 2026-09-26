import assert from 'node:assert/strict';
import { validateLibraryCoverFile } from './libraryCoverFile.ts';

const ok = new File([new Uint8Array([1, 2, 3])], 'capa.png', { type: 'image/png' });
assert.equal(validateLibraryCoverFile(ok), null);

const badType = new File([new Uint8Array([1])], 'capa.pdf', { type: 'application/pdf' });
assert.match(validateLibraryCoverFile(badType) ?? '', /JPG|PNG|WEBP|GIF/i);

const tooBig = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'capa.jpg', { type: 'image/jpeg' });
assert.match(validateLibraryCoverFile(tooBig) ?? '', /5 MB/i);

console.log('libraryCoverFile.test.ts: ok');
