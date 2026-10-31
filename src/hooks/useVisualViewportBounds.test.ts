import assert from 'node:assert/strict';
import { test } from 'node:test';
import { observeVisualViewport } from './useVisualViewportBounds.ts';

test('tracks keyboard opening, iOS panning and closing, then stops observing', () => {
  const viewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0 });
  const bounds: Array<{ height: number; offsetTop: number }> = [];
  const stop = observeVisualViewport(viewport as VisualViewport, value => bounds.push(value));

  viewport.height = 460;
  viewport.dispatchEvent(new Event('resize'));
  viewport.offsetTop = 120;
  viewport.dispatchEvent(new Event('scroll'));
  viewport.height = 844;
  viewport.offsetTop = 0;
  viewport.dispatchEvent(new Event('resize'));

  assert.deepEqual(bounds, [
    { height: 844, offsetTop: 0 },
    { height: 460, offsetTop: 0 },
    { height: 460, offsetTop: 120 },
    { height: 844, offsetTop: 0 },
  ]);

  stop();
  viewport.height = 390;
  viewport.dispatchEvent(new Event('resize'));
  viewport.dispatchEvent(new Event('scroll'));
  assert.equal(bounds.length, 4);
});
