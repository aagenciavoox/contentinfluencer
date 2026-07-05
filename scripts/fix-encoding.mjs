import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const root = join(import.meta.dirname, '..', 'src');

/** Fix mojibake from UTF-8 misinterpreted as Latin-1 (apply longer patterns first). */
const replacements = [
  [/ÃƒÆ'Ã‚Â©/g, 'é'],
  [/ÃƒÆ'Ã‚Â§/g, 'ç'],
  [/ÃƒÆ'Ã‚Â£/g, 'ã'],
  [/ÃƒÆ'Ã‚Â­/g, 'í'],
  [/ÃƒÆ'Ã‚Âº/g, 'ú'],
  [/ÃƒÆ'Ã‚Âµ/g, 'õ'],
  [/ÃƒÆ'Ã‚Â¡/g, 'á'],
  [/ÃƒÆ'Ã‚Â³/g, 'ó'],
  [/ÃƒÆ'Ã‚Âª/g, 'ê'],
  [/ÃƒÆ'Ã‚Â§ÃƒÆ'Ã‚Â£/g, 'ção'],
  [/ÃƒÆ'Ã‚Â§ÃƒÆ'Ã‚Âµ/g, 'ções'],
  [/ÃƒÂ§/g, 'ç'],
  [/ÃƒÂ£/g, 'ã'],
  [/ÃƒÂ©/g, 'é'],
  [/ÃƒÂ¡/g, 'á'],
  [/ÃƒÂ­/g, 'í'],
  [/ÃƒÂº/g, 'ú'],
  [/ÃƒÂµ/g, 'õ'],
  [/ÃƒÂ³/g, 'ó'],
  [/ÃƒÂª/g, 'ê'],
  [/Ã§/g, 'ç'],
  [/Ã£/g, 'ã'],
  [/Ã©/g, 'é'],
  [/Ã¡/g, 'á'],
  [/Ã­/g, 'í'],
  [/Ã³/g, 'ó'],
  [/Ãº/g, 'ú'],
  [/Ãª/g, 'ê'],
  [/Ãµ/g, 'õ'],
  [/Ã‡/g, 'Ç'],
  [/â€"/g, '—'],
  [/â€“/g, '–'],
  [/â€™/g, "'"],
  [/â€œ/g, '"'],
  [/â€/g, '"'],
  [/â†'/g, '→'],
  [/â€¦/g, '…'],
  [/Â·/g, '·'],
  [/Ã¢" "˜/g, '↑'],
  [/Ã¢" Âµ/g, '↵'],
  [/Ã¢" "/g, '↑'],
];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (['.tsx', '.ts'].includes(extname(entry))) files.push(full);
  }
  return files;
}

let fixed = 0;
for (const file of walk(root)) {
  const content = readFileSync(file, 'utf8');
  let next = content;
  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, replacement);
  }
  if (next !== content) {
    writeFileSync(file, next, 'utf8');
    fixed += 1;
    console.log(`fixed ${file}`);
  }
}

console.log(`Done. ${fixed} file(s) updated.`);
