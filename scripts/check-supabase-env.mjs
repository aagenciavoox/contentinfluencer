import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');

if (!existsSync(envPath)) {
  console.error('\n❌ Arquivo .env.local não encontrado na raiz do projeto.\n');
  process.exit(1);
}

const raw = readFileSync(envPath, 'utf8');
const url = raw.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
const anonKey = raw.match(/^VITE_SUPABASE_ANON_KEY=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');

const errors = [];

if (!url) errors.push('VITE_SUPABASE_URL está vazio');
if (!anonKey) errors.push('VITE_SUPABASE_ANON_KEY está vazio (a linha existe mas sem valor após o =)');

if (url && !url.includes('aftffcaychrfffefkeoj')) {
  errors.push(`URL aponta para outro projeto: ${url}`);
}

if (anonKey) {
  try {
    const payload = anonKey.split('.')[1];
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(Buffer.from(padded, 'base64url').toString('utf8'));
    if (json.ref && json.ref !== 'aftffcaychrfffefkeoj') {
      errors.push(`A anon key é do projeto "${json.ref}", não de aftffcaychrfffefkeoj`);
    }
  } catch {
    errors.push('A anon key não parece um JWT válido');
  }
}

if (errors.length) {
  console.error('\n❌ Supabase (.env.local) incompleto ou incorreto:\n');
  for (const e of errors) console.error(`   • ${e}`);
  console.error('\n   Arquivo:', envPath);
  console.error('   Chave: https://supabase.com/dashboard/project/aftffcaychrfffefkeoj/settings/api\n');
  process.exit(1);
}

console.log('✓ Supabase .env.local OK');
