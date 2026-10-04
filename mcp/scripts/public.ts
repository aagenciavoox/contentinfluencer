// Mantém o servidor HTTP e o túnel ngrok no ar, religando o que cair.
// Uso: node scripts/public.ts   (o autostart do Windows chama este arquivo)
import { spawn, type ChildProcess } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { loadEnvFiles, mcpRoot } from '../src/supabase.ts';

loadEnvFiles();

const port = process.env.CONTENT_OS_MCP_PORT ?? '3333';
const domain = (process.env.NGROK_DOMAIN ?? '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
const authtoken = (process.env.NGROK_AUTHTOKEN ?? '').trim();
const ngrokExe = join(mcpRoot, 'bin', process.platform === 'win32' ? 'ngrok.exe' : 'ngrok');
const logDir = join(mcpRoot, 'logs');
mkdirSync(logDir, { recursive: true });
const logFile = join(logDir, 'public.log');

function log(line: string) {
  const stamped = `${new Date().toISOString()} ${line}\n`;
  appendFileSync(logFile, stamped);
  process.stdout.write(stamped);
}

if (!domain || !authtoken) {
  log('Faltam NGROK_DOMAIN e/ou NGROK_AUTHTOKEN em mcp/.env');
  process.exit(1);
}
if (!existsSync(ngrokExe)) {
  log(`ngrok não encontrado em ${ngrokExe}`);
  process.exit(1);
}

// Porta de trava: impede duas cópias do supervisor rodando ao mesmo tempo.
const lock = createServer();
lock.once('error', () => {
  log('Supervisor já está rodando; saindo.');
  process.exit(0);
});
lock.listen(Number(port) + 1, '127.0.0.1', start);

function supervise(name: string, command: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  let failures = 0;
  let child: ChildProcess | undefined;

  const run = () => {
    const startedAt = Date.now();
    child = spawn(command, args, { cwd: mcpRoot, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const forward = (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) log(`[${name}] ${line}`);
    };
    child.stdout?.on('data', forward);
    child.stderr?.on('data', forward);
    child.on('exit', (code) => {
      failures = Date.now() - startedAt > 60_000 ? 0 : failures + 1;
      const delay = Math.min(60_000, 2_000 * 2 ** Math.min(failures, 5));
      log(`[${name}] saiu (código ${code}); religando em ${delay / 1000}s`);
      setTimeout(run, delay);
    });
  };

  run();
  return () => child?.kill();
}

function start() {
  log(`Iniciando: https://${domain}/mcp`);
  const stops = [
    supervise('server', process.execPath, ['src/http.ts']),
    supervise('ngrok', ngrokExe, ['http', `--url=https://${domain}`, port, '--log=stdout', '--log-level=warn'], {
      ...process.env,
      NGROK_AUTHTOKEN: authtoken,
    }),
  ];
  const shutdown = () => {
    for (const stop of stops) stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
