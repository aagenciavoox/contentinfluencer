import {existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';

export const mcpRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function loadEnvFiles() {
  for (const file of [resolve(mcpRoot, '.env'), resolve(mcpRoot, '..', '.env.local')]) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
}

function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, '');
    if (value) return value;
  }
  return undefined;
}

export interface Session {
  client: SupabaseClient;
  userId: string;
  email: string;
}

let sessionPromise: Promise<Session> | null = null;

async function signIn(): Promise<Session> {
  loadEnvFiles();
  const url = readEnv('CONTENT_OS_SUPABASE_URL', 'VITE_SUPABASE_URL');
  const anonKey = readEnv('CONTENT_OS_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');
  const email = readEnv('CONTENT_OS_EMAIL');
  const password = readEnv('CONTENT_OS_PASSWORD');

  const missing = [
    !url && 'CONTENT_OS_SUPABASE_URL',
    !anonKey && 'CONTENT_OS_SUPABASE_ANON_KEY',
    !email && 'CONTENT_OS_EMAIL',
    !password && 'CONTENT_OS_PASSWORD',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Configuração incompleta no mcp/.env: ${missing.join(', ')}`);
  }

  const client = createClient(url!, anonKey!, {
    auth: {persistSession: false, autoRefreshToken: true, detectSessionInUrl: false},
  });
  const {data, error} = await client.auth.signInWithPassword({email: email!, password: password!});
  if (error || !data.user) {
    throw new Error(`Não foi possível entrar no Content OS: ${error?.message ?? 'usuário não encontrado'}`);
  }
  return {client, userId: data.user.id, email: data.user.email ?? email!};
}

/** Login preguiçoso: só acontece na primeira ferramenta chamada e é reaproveitado depois. */
export function getSession(): Promise<Session> {
  if (!sessionPromise) {
    sessionPromise = signIn().catch(error => {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}
