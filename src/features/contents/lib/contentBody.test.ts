import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isContentBodyLoaded, resolveScriptBodyStatus, scriptBodyStatusLabel } from './contentBody.ts';
import type { Content } from '../../../lib/database.ts';
import { sanitizeDomainPayload } from '../../../lib/persistentDataCache.ts';

function content(partial: Partial<Content>): Content {
  return partial as Content;
}

describe('isContentBodyLoaded', () => {
  it('returns false for schedule rows without body fields', () => {
    assert.equal(isContentBodyLoaded(content({})), false);
  });

  it('returns true when script was loaded even if empty', () => {
    assert.equal(isContentBodyLoaded(content({ script: null })), true);
  });

  it('returns true when notes or referencias were loaded', () => {
    assert.equal(isContentBodyLoaded(content({ notes: null })), true);
    assert.equal(isContentBodyLoaded(content({ referencias: '' })), true);
  });

  it('keeps cached summaries marked as body not loaded', () => {
    const cached = sanitizeDomainPayload({
      contents: [content({
        script: '<p>Roteiro completo</p>',
        notes: 'Notas',
        referencias: 'Referências',
        scriptNotes: [],
      })],
    });
    const cachedContent = cached.contents?.[0];

    assert.ok(cachedContent);
    assert.equal(cachedContent.script, undefined);
    assert.equal(cachedContent.notes, undefined);
    assert.equal(cachedContent.referencias, undefined);
    assert.equal(isContentBodyLoaded(cachedContent), false);
  });
});

describe('resolveScriptBodyStatus', () => {
  it('shows loading only while body is missing and hydrating', () => {
    assert.equal(resolveScriptBodyStatus(content({}), { hydrating: true }), 'loading');
    assert.equal(resolveScriptBodyStatus(content({}), { hydrating: false }), 'error');
  });

  it('never stays loading after error', () => {
    assert.equal(resolveScriptBodyStatus(content({}), { error: true }), 'error');
    assert.equal(
      resolveScriptBodyStatus(content({ script: '<p>ok</p>' }), { error: true }),
      'error',
    );
  });

  it('maps loaded empty script to empty and text to ready', () => {
    assert.equal(resolveScriptBodyStatus(content({ script: null })), 'empty');
    assert.equal(resolveScriptBodyStatus(content({ script: '   ' })), 'empty');
    assert.equal(resolveScriptBodyStatus(content({ script: '<p>Texto</p>' })), 'ready');
  });

  it('exposes stable labels', () => {
    assert.equal(scriptBodyStatusLabel('loading'), 'Carregando roteiro...');
    assert.equal(scriptBodyStatusLabel('error'), 'Não foi possível carregar o roteiro');
    assert.equal(scriptBodyStatusLabel('empty'), 'Sem roteiro escrito');
    assert.equal(scriptBodyStatusLabel('ready', 42), '42 palavras no roteiro');
  });
});
