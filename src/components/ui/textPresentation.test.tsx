import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Text } from './Text';
import { TextCount } from './TextCount';
import { ValorVazio } from './ValorVazio';

test('missing value is decorative visually and announced once', () => {
  const html = renderToStaticMarkup(<ValorVazio />);
  assert.match(html, /aria-hidden="true">—<\/span>/);
  assert.match(html, /class="sr-only">sem valor<\/span>/);
  assert.equal(html.match(/sem valor/g)?.length, 1);
});

test('Text forwards labels, descriptions and tooltips with the requested semantic element', () => {
  const html = renderToStaticMarkup(<Text as="span" variant="meta" id="label" title="Nome completo" aria-label="Tema" aria-describedby="help">Leitura</Text>);
  assert.match(html, /^<span /);
  for (const attribute of ['id="label"', 'title="Nome completo"', 'aria-label="Tema"', 'aria-describedby="help"']) assert.ok(html.includes(attribute));
});

test('counters render below fields or inline without nested paragraphs and preserve described-by ids', () => {
  const field = renderToStaticMarkup(<TextCount id="counter" value={'a'.repeat(120)} limit={2200} />);
  assert.match(field, /^<p id="counter"/);
  assert.match(field, /text-right/);
  assert.match(field, /120 \/ 2\.200/);
  const inline = renderToStaticMarkup(<TextCount as="span" count={1234} mode="words" />);
  assert.match(inline, /^<span /);
  assert.match(inline, /1\.234 palavras/);
  assert.doesNotMatch(inline, /<p/);
});

test('counters indicate near and exceeded limits', () => {
  assert.match(renderToStaticMarkup(<TextCount value={'x'.repeat(90)} limit={100} />), /text-primary/);
  assert.match(renderToStaticMarkup(<TextCount value={'x'.repeat(101)} limit={100} />), /accent-red/);
});
