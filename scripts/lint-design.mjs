import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

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
]);

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
}

if (failed) {
  console.error('\nDesign lint failed. Use Text, Surface, Badge, AppButton and design tokens instead.');
  process.exit(1);
}

if (warned) {
  console.warn('\nDesign lint passed with heading warnings.');
} else {
  console.log('Design lint passed.');
}
