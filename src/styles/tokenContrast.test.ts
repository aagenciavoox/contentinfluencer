import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, it} from 'node:test';

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function extractBlock(selector: RegExp): string {
  const match = selector.exec(css);
  assert.ok(match, `index.css must contain ${selector}`);
  const start = match.index + match[0].length;
  let depth = 1;
  for (let index = start; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) return css.slice(start, index);
  }
  throw new Error(`unclosed block for ${selector}`);
}

function parseDeclarations(block: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const [, name, value] of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    declarations.set(name, value.trim());
  }
  return declarations;
}

const lightTokens = parseDeclarations(extractBlock(/^:root\s*\{/m));
// The dark block only overrides; anything it leaves out comes from :root.
const darkTokens = new Map([...lightTokens, ...parseDeclarations(extractBlock(/^\[data-theme=['"]dark['"]\]\s*\{/m))]);

function resolveHex(tokens: Map<string, string>, name: string, seen: string[] = []): string {
  assert.ok(!seen.includes(name), `circular var() chain: ${[...seen, name].join(' -> ')}`);
  const value = tokens.get(name);
  assert.ok(value, `${name} is not defined`);
  const reference = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (reference) return resolveHex(tokens, reference[1], [...seen, name]);
  assert.match(value, /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, `${name} must resolve to a hex color, got "${value}"`);
  return value;
}

function relativeLuminance(hex: string): number {
  const digits = hex.slice(1);
  const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join('') : digits;
  const [red, green, blue] = [0, 2, 4].map((offset) => {
    const channel = parseInt(full.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const MIN_TEXT_CONTRAST = 4.5;
const textTokens = ['--text-primary', '--text-secondary', '--text-tertiary'];
const backgroundTokens = ['--bg-primary', '--bg-secondary', '--bg-elevated'];

describe('WCAG contrast math', () => {
  it('matches the reference values', () => {
    assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
    assert.equal(contrastRatio('#FFF', '#FFFFFF'), 1);
    assert.ok(contrastRatio('#767676', '#FFFFFF') >= MIN_TEXT_CONTRAST);
    assert.ok(contrastRatio('#777777', '#FFFFFF') < MIN_TEXT_CONTRAST);
  });
});

for (const [theme, tokens] of [['light (:root)', lightTokens], ["dark ([data-theme='dark'])", darkTokens]] as const) {
  describe(`text tokens on surfaces, ${theme}`, () => {
    for (const text of textTokens) {
      for (const background of backgroundTokens) {
        it(`${text} on ${background} >= ${MIN_TEXT_CONTRAST}:1`, () => {
          const foregroundHex = resolveHex(tokens, text);
          const backgroundHex = resolveHex(tokens, background);
          const ratio = contrastRatio(foregroundHex, backgroundHex);
          assert.ok(
            ratio >= MIN_TEXT_CONTRAST,
            `${text} ${foregroundHex} on ${background} ${backgroundHex} is ${ratio.toFixed(2)}:1`,
          );
        });
      }
    }
  });

  describe(`brand tokens, ${theme}`, () => {
    it(`--brand-on-accent on --brand-accent-strong >= ${MIN_TEXT_CONTRAST}:1`, () => {
      const foregroundHex = resolveHex(tokens, '--brand-on-accent');
      const backgroundHex = resolveHex(tokens, '--brand-accent-strong');
      const ratio = contrastRatio(foregroundHex, backgroundHex);
      assert.ok(
        ratio >= MIN_TEXT_CONTRAST,
        `--brand-on-accent ${foregroundHex} on --brand-accent-strong ${backgroundHex} is ${ratio.toFixed(2)}:1`,
      );
    });
  });
}
