// Design lint. `patterns` and `tsxErrorPatterns` fail the run; every *WarnPatterns list only warns.
//
// Warn-only rules added in phase 8 (IMPLEMENTATION_PLAN_2026-10-03.md, 8.1):
// - classWarnPatterns (.ts/.tsx): a text color token mixed with opacity-10..60 in the same
//   class string (disabled:, hover: and group-hover: variants are allowed), and wide tracking
//   (tracking-widest, tracking-[0.2em] up to tracking-[0.5em]).
// - nativeControlWarnPatterns (.ts/.tsx under src/features and src/mobile only): native
//   <select> and window.prompt( / window.confirm(.
// Exceptions for these rules: visualWarnExceptions (BurstMode teleprompter, see DESIGN.md › Exceptions).
// The older exception sets below are unchanged.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, basename, relative, sep } from 'path';

const root = join(import.meta.dirname, '..', 'src');

const patterns = [
  { name: 'font-black', regex: /font-black/g },
  { name: 'text arbitrary px sizes', regex: /text-\[(1[2-8]|9|10|11)px\]/g },
  { name: 'rounded arbitrary large', regex: /rounded-\[(1\.5rem|1\.75rem|1\.25rem|1\.1rem|2rem|28px)\]/g },
  { name: 'shadow-2xl', regex: /shadow-2xl/g },
  { name: 'legacy uppercase tracking', regex: /uppercase tracking-\[0\.(1|12|16|2|24)em\]/g },
  { name: 'hard-coded gray/white surfaces', regex: /(?:bg-white|bg-black\/|text-gray-|border-gray-|from-yellow-|to-amber-|border-orange-200|bg-orange-50)/g },
  { name: 'utf-8 mojibake', regex: /Ã[§©¡­³ºª£µƒ]|â€|â€™/g },
];

const tsxErrorPatterns = [
  { name: 'button-primary class (use AppButton variant="primary")', regex: /\bbutton-primary\b/g },
];

const tsxWarnPatterns = [
  { name: 'raw heading tag (use Text component)', regex: /<(h1|h2|h3)\b/g },
  { name: 'notion-title class (use Text variant="spotlightTitle")', regex: /\bnotion-title\b/g },
  { name: 'raw t-section-title (use Text variant="sectionTitle")', regex: /className="[^"]*\bt-section-title\b/g },
  { name: 'raw t-page-title (use Text variant="pageTitle")', regex: /className="[^"]*\bt-page-title\b/g },
  { name: 'orphan 20px spacing (use stack-xl or --space-xl / p-6)', regex: /\b(?:p-5|px-5|py-5|pt-5|pb-5|pl-5|pr-5|gap-5|space-y-5|space-x-5|m-5|mx-5|my-5)\b/g },
  { name: 'legacy space-y (use stack-sm/md/lg/xl/2xl)', regex: /\bspace-y-[23468]\b/g },
  { name: 'orphan gap-10 (use --space-2xl or --space-3xl)', regex: /\bgap-10\b/g },
];

const classWarnPatterns = [
  { name: 'text token with opacity (use --text-secondary/--text-tertiary em vez de opacidade)', count: countTextOpacityStrings },
  { name: 'legacy wide tracking (tracking-widest / tracking-[0.2em–0.5em]; use Text variant="eyebrow")', regex: /\btracking-widest\b|tracking-\[0\.(?:[2-4]\d*|50*)em\]/g },
];

const nativeControlWarnPatterns = [
  { name: 'native <select> (use TagSelect)', regex: /<select\b/g },
  { name: 'window.prompt/window.confirm (use ConfirmModal)', regex: /\bwindow\.(?:prompt|confirm)\s*\(/g },
];

const spacingExceptions = new Set([
  'BurstModeExperience.tsx',
  'BurstModeMobileScreen.tsx',
]);

const headingExceptions = new Set([
  'Text.tsx',
  'Section.tsx',
  'EmptyState.tsx',
  'App.tsx',
]);

const notionTitleExceptions = new Set([
  'Text.tsx',
  'ContentDetailHeader.tsx',
  'ContentOperationalPanel.tsx',
]);

const typographyClassExceptions = new Set([
  'Text.tsx',
  'ContentDetailHeader.tsx',
  'ContentOperationalPanel.tsx',
  'RoteiroSection.tsx',
]);

const visualWarnExceptions = new Set([
  'BurstModeExperience.tsx',
  'BurstModeMobileScreen.tsx',
]);

const nativeControlDirs = ['features', 'mobile'];

const stringLiteralRegex = /"[^"\n]*"|'[^'\n]*'|`[^`]*`/g;
const textColorTokenRegex = /text-\[var\(--text-/;
const opacityClassRegex = /^(?:(.+):)?opacity-(?:10|20|30|40|50|60)$/;
const allowedOpacityVariants = new Set(['disabled', 'hover', 'group-hover']);

function hasBareOpacityClass(literal) {
  return literal.split(/[\s'"`{}()?,]+/).some((token) => {
    const match = token.match(opacityClassRegex);
    if (!match) return false;
    const variants = match[1] ? match[1].split(':') : [];
    return !variants.some((variant) => allowedOpacityVariants.has(variant));
  });
}

function countTextOpacityStrings(content) {
  let count = 0;
  for (const literal of content.match(stringLiteralRegex) ?? []) {
    if (textColorTokenRegex.test(literal) && hasBareOpacityClass(literal)) count += 1;
  }
  return count;
}

function countMatches({ regex, count }, content) {
  return count ? count(content) : content.match(regex)?.length ?? 0;
}

function isNativeControlScope(file) {
  return nativeControlDirs.includes(relative(root, file).split(sep)[0]);
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (['.tsx', '.ts', '.css'].includes(extname(entry))) files.push(full);
  }
  return files;
}

function isHeadingException(file) {
  return headingExceptions.has(basename(file));
}

let failed = false;
let warned = false;

for (const file of walk(root)) {
  const content = readFileSync(file, 'utf8');
  const isTsx = extname(file) === '.tsx';

  for (const { name, regex } of patterns) {
    const matches = content.match(regex);
    if (matches?.length) {
      console.error(`${file}: found ${matches.length} × ${name}`);
      failed = true;
    }
  }

  if (isTsx) {
    for (const { name, regex } of tsxErrorPatterns) {
      const matches = content.match(regex);
      if (matches?.length) {
        console.error(`${file}: found ${matches.length} × ${name}`);
        failed = true;
      }
    }

    if (!isHeadingException(file)) {
      const { name, regex } = tsxWarnPatterns[0];
      const matches = content.match(regex);
      if (matches?.length) {
        console.warn(`${file}: found ${matches.length} × ${name}`);
        warned = true;
      }
    }

    if (!notionTitleExceptions.has(basename(file))) {
      const { name, regex } = tsxWarnPatterns[1];
      const matches = content.match(regex);
      if (matches?.length) {
        console.warn(`${file}: found ${matches.length} × ${name}`);
        warned = true;
      }
    }

    if (!typographyClassExceptions.has(basename(file))) {
      for (const { name, regex } of tsxWarnPatterns.slice(2, 4)) {
        const matches = content.match(regex);
        if (matches?.length) {
          console.warn(`${file}: found ${matches.length} × ${name}`);
          warned = true;
        }
      }
    }

    if (!spacingExceptions.has(basename(file))) {
      for (const { name, regex } of tsxWarnPatterns.slice(4)) {
        const matches = content.match(regex);
        if (matches?.length) {
          console.warn(`${file}: found ${matches.length} × ${name}`);
          warned = true;
        }
      }
    }
  }

  if ((isTsx || extname(file) === '.ts') && !visualWarnExceptions.has(basename(file))) {
    const warnRules = isNativeControlScope(file)
      ? [...classWarnPatterns, ...nativeControlWarnPatterns]
      : classWarnPatterns;
    for (const rule of warnRules) {
      const count = countMatches(rule, content);
      if (count) {
        console.warn(`${file}: found ${count} × ${rule.name}`);
        warned = true;
      }
    }
  }
}

if (failed) {
  console.error('\nDesign lint failed. Use Text, Surface, Badge, AppButton and design tokens instead.');
  process.exit(1);
}

if (warned) {
  console.warn('\nDesign lint passed with warnings.');
} else {
  console.log('Design lint passed.');
}
