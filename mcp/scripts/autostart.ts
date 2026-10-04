// Liga/desliga o início automático do scripts/public.ts no login do Windows.
// Uso: node scripts/autostart.ts install | uninstall
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mcpRoot } from '../src/supabase.ts';

if (process.platform !== 'win32') {
  console.error('O autostart só está implementado para Windows.');
  process.exit(1);
}

const startupDir = join(process.env.APPDATA ?? '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const launcher = join(startupDir, 'content-os-mcp.vbs');
const action = process.argv[2];

if (action === 'install') {
  const command = `"${process.execPath}" "${join(mcpRoot, 'scripts', 'public.ts')}"`;
  // VBS roda o Node sem abrir janela de terminal.
  const vbs = [
    'Set shell = CreateObject("WScript.Shell")',
    `shell.CurrentDirectory = "${mcpRoot}"`,
    `shell.Run "${command.replaceAll('"', '""')}", 0, False`,
    '',
  ].join('\r\n');
  writeFileSync(launcher, vbs, 'utf8');
  console.log(`Autostart instalado: ${launcher}`);
} else if (action === 'uninstall') {
  if (existsSync(launcher)) rmSync(launcher);
  console.log('Autostart removido.');
} else {
  console.error('Uso: node scripts/autostart.ts install | uninstall');
  process.exit(1);
}
