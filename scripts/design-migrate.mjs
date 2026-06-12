import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const root = join(import.meta.dirname, '..', 'src');

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else if (['.tsx', '.ts', '.css'].includes(extname(entry))) files.push(full);
  }
  return files;
}

const replacements = [
  [/font-black/g, 'font-semibold'],
  [/text-\[9px\]/g, 'text-xs'],
  [/text-\[10px\]/g, 'text-xs'],
  [/text-\[11px\]/g, 'text-xs'],
  [/text-\[22px\]/g, 'text-2xl'],
  [/rounded-\[1\.5rem\]/g, 'rounded-[var(--radius-card-mobile)]'],
  [/rounded-\[2rem\]/g, 'rounded-[var(--radius-card-mobile)]'],
  [/rounded-\[28px\]/g, 'rounded-[var(--radius-card-mobile)]'],
  [/rounded-3xl/g, 'rounded-[var(--radius-overlay)]'],
  [/rounded-2xl/g, 'rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)]'],
  [/shadow-2xl/g, 'shadow-none'],
  [/backdrop-blur-sm/g, ''],
  [/uppercase tracking-\[0\.35em\]/g, ''],
  [/uppercase tracking-\[0\.22em\]/g, ''],
  [/uppercase tracking-\[0\.18em\]/g, ''],
  [/uppercase tracking-widest/g, ''],
  [/active:scale-\[0\.99\]/g, ''],
];

let changed = 0;
for (const file of walk(root)) {
  let content = readFileSync(file, 'utf8');
  const original = content;
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  if (content !== original) {
    writeFileSync(file, content);
    changed++;
  }
}

console.log(`Updated ${changed} files`);
