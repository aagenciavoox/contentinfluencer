/**
 * Abre o SQL Editor do projeto content-os e copia a migration para o clipboard (quando possível).
 * Use quando `supabase db push --linked` falhar por 403 de privilégio.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sqlPath = join(root, 'supabase', 'migrations', '20261028240000_serie_agrupamento.sql');
const sql = readFileSync(sqlPath, 'utf8');
const dashboard =
  'https://supabase.com/dashboard/project/aftffcaychrfffefkeoj/sql/new';

try {
  spawnSync('clip', [], { input: sql, shell: true, stdio: ['pipe', 'ignore', 'ignore'] });
  console.log('SQL copiado para a área de transferência.');
} catch {
  console.log('Não foi possível copiar automaticamente. Abra o arquivo:');
  console.log(sqlPath);
}

console.log('');
console.log('1. Abra o SQL Editor:');
console.log(`   ${dashboard}`);
console.log('2. Cole o SQL e execute (Run).');
console.log('3. Recarregue o app.');

try {
  spawnSync('cmd', ['/c', 'start', '', dashboard], { stdio: 'ignore' });
} catch {
  // ignore
}
