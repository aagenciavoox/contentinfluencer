import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'src');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const DOC_FILES = ['README.md', 'SPEC.md', 'SYSTEM_GUIDE.md'];

const BLOCKED_PATTERNS = [
  /\batrasad[oa]s?\b/i,
  /\bfalhou\b/i,
  /\burgente\b/i,
  /\bvoce precisa\b/i,
  /\bmeta nao batida\b/i,
  /\bperformance ruim\b/i,
  /\bprecisa ser refeito\b/i,
  /\bprecisa de acao\b/i,
  /\bped(e|em) checkpoint\b/i,
  /\bpedindo atencao\b/i,
  /\bimpedir agendamento\b/i,
  /\bviolacoes? da semana\b/i,
  /\balertas? de desvio\b/i,
  /\bnovo alerta\b/i,
  /\bleitura automatica comeca\b/i,
  /\brola automaticamente\b/i,
  /\bprioridades imediatas\b/i,
  /\bproximas acoes\b/i,
  /\bfoco do dia\b/i,
  /\btem certeza que deseja\b/i,
  /\bdeletar\b/i,
  /\bpermanentemente\b/i,
  /\birreversivel\b/i,
  /\bcertifique-se\b/i,
  /\bcolunas obrigatorias\b/i,
  /\barquivo deve ser\b/i,
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split('\n').length;
}

const findings = [];
const files = [
  ...await walk(SOURCE_DIR),
  ...DOC_FILES.map(file => path.join(ROOT, file)),
];

for (const file of files) {
  const text = await readFile(file, 'utf8');
  const normalized = normalizeText(text);

  for (const pattern of BLOCKED_PATTERNS) {
    const match = pattern.exec(normalized);
    if (!match) continue;

    findings.push({
      file: path.relative(ROOT, file),
      line: lineNumberForIndex(text, match.index),
      phrase: match[0],
    });
  }
}

if (findings.length > 0) {
  console.error('Product voice audit found pressure-oriented copy:');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} -> "${finding.phrase}"`);
  }
  console.error('Prefer calm, optional language. See PRODUCT_VOICE.md.');
  process.exit(1);
}

console.log('ok - product voice audit');
