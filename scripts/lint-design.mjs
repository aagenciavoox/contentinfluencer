import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const root = join(import.meta.dirname, '..', 'src');
const patterns = [
  { name: 'font-black', regex: /font-black/g },
  { name: 'text-[9px|10px|11px]', regex: /text-\[(9|10|11)px\]/g },
  { name: 'rounded arbitrary large', regex: /rounded-\[(1\.5rem|2rem|28px)\]/g },
  { name: 'shadow-2xl', regex: /shadow-2xl/g },
];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (['.tsx', '.ts', '.css'].includes(extname(entry))) files.push(full);
  }
  return files;
}

let failed = false;
for (const file of walk(root)) {
  const content = readFileSync(file, 'utf8');
  for (const { name, regex } of patterns) {
    const matches = content.match(regex);
    if (matches?.length) {
      console.error(`${file}: found ${matches.length} × ${name}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('\nDesign lint failed. Use Text, Surface, Badge and design tokens instead.');
  process.exit(1);
}

console.log('Design lint passed.');
