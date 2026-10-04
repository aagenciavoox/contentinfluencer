import {createHash, createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
import type {IncomingMessage, ServerResponse} from 'node:http';

/**
 * OAuth 2.1 mínimo (PKCE, sem banco) para clientes como o Grok, que exigem OAuth em conectores remotos.
 * Só existe uma pessoa usuária: quem conhece a chave CONTENT_OS_MCP_TOKEN aprova o acesso.
 * Tokens são assinados com a própria chave, então sobrevivem a reinícios; trocar a chave revoga todos.
 */

const ACCESS_TTL_S = 30 * 24 * 60 * 60;
const CODE_TTL_MS = 5 * 60 * 1000;

interface PendingCode {
  clientId: string;
  redirectUri: string;
  challenge: string;
  expiresAt: number;
}

const codes = new Map<string, PendingCode>();

export function baseUrl(req: IncomingMessage): string {
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost');
  const forwarded = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim();
  const proto = forwarded || (/^(localhost|127\.)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function sign(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function issue(secret: string, kind: 'at' | 'rt', expiresAt: number): string {
  const payload = `${kind}.${expiresAt}.${randomBytes(12).toString('base64url')}`;
  return `${payload}.${sign(secret, payload)}`;
}

function verify(secret: string, token: string, kind: 'at' | 'rt'): boolean {
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== kind) return false;
  const payload = parts.slice(0, 3).join('.');
  if (!safeEqual(parts[3], sign(secret, payload))) return false;
  const expiresAt = Number(parts[1]);
  return expiresAt === 0 || expiresAt > Date.now() / 1000;
}

export function isValidAccessToken(secret: string, token: string): boolean {
  return safeEqual(token, secret) || verify(secret, token, 'at');
}

function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, {'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*', ...headers});
  res.end(JSON.stringify(body));
}

async function readForm(req: IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (String(req.headers['content-type']).includes('application/json')) {
    return raw ? JSON.parse(raw) : {};
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}[ch]!));
}

function authorizePage(params: URLSearchParams, error?: string): string {
  const hidden = [...params.entries()]
    .map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`)
    .join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Content OS · autorizar acesso</title>
<style>body{font-family:system-ui,sans-serif;background:#111;color:#eee;display:grid;place-items:center;min-height:100vh;margin:0}
form{background:#1c1c1c;padding:28px;border-radius:14px;max-width:360px;width:90%}h1{font-size:18px;margin:0 0 8px}
p{color:#aaa;font-size:14px;line-height:1.5}input[type=password]{width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid #333;background:#0d0d0d;color:#eee;margin:8px 0 14px}
button{width:100%;padding:10px;border:0;border-radius:8px;background:#e8e8e8;color:#111;font-weight:600;cursor:pointer}.erro{color:#ff8a8a}</style></head>
<body><form method="post" action="/authorize">${hidden}
<h1>Conectar ao Content OS</h1>
<p><b>${escapeHtml(params.get('client_id') ?? 'Um aplicativo')}</b> quer ler e editar seus conteúdos. Cole a chave <code>CONTENT_OS_MCP_TOKEN</code> do arquivo mcp/.env para autorizar.</p>
${error ? `<p class="erro">${escapeHtml(error)}</p>` : ''}
<input type="password" name="chave" placeholder="Chave de acesso" autofocus required>
<button type="submit">Autorizar</button></form></body></html>`;
}

/** Responde às rotas de OAuth. Retorna false quando a rota não é dela. */
export async function handleOAuth(req: IncomingMessage, res: ServerResponse, path: string, secret: string): Promise<boolean> {
  const base = baseUrl(req);

  if (req.method === 'OPTIONS' && (path.startsWith('/.well-known') || ['/token', '/register'].includes(path))) {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type, mcp-protocol-version',
    }).end();
    return true;
  }

  if (path.startsWith('/.well-known/oauth-protected-resource')) {
    json(res, 200, {resource: `${base}/mcp`, authorization_servers: [base], bearer_methods_supported: ['header'], scopes_supported: ['content-os']});
    return true;
  }

  if (path.startsWith('/.well-known/oauth-authorization-server') || path.startsWith('/.well-known/openid-configuration')) {
    json(res, 200, {
      issuer: base,
      authorization_endpoint: `${base}/authorize`,
      token_endpoint: `${base}/token`,
      registration_endpoint: `${base}/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
      scopes_supported: ['content-os'],
    });
    return true;
  }

  if (path === '/register' && req.method === 'POST') {
    const body = await readForm(req);
    json(res, 201, {
      client_id: `cos_${randomBytes(9).toString('base64url')}`,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: Array.isArray(body.redirect_uris) ? body.redirect_uris : [],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    });
    return true;
  }

  if (path === '/authorize') {
    const params = req.method === 'POST'
      ? new URLSearchParams(await readForm(req))
      : new URL(req.url ?? '/', base).searchParams;
    const redirectUri = params.get('redirect_uri');
    const challenge = params.get('code_challenge');

    if (!redirectUri || !/^https?:\/\//.test(redirectUri) || params.get('response_type') !== 'code') {
      res.writeHead(400, {'content-type': 'text/plain; charset=utf-8'}).end('Pedido de autorização inválido (redirect_uri ou response_type).');
      return true;
    }
    if (!challenge || (params.get('code_challenge_method') ?? 'S256') !== 'S256') {
      res.writeHead(400, {'content-type': 'text/plain; charset=utf-8'}).end('PKCE S256 é obrigatório.');
      return true;
    }

    if (req.method !== 'POST') {
      res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}).end(authorizePage(params));
      return true;
    }

    const chave = params.get('chave') ?? '';
    params.delete('chave');
    if (!safeEqual(chave.trim(), secret)) {
      res.writeHead(401, {'content-type': 'text/html; charset=utf-8'}).end(authorizePage(params, 'Chave incorreta.'));
      return true;
    }

    const code = randomBytes(24).toString('base64url');
    codes.set(code, {clientId: params.get('client_id') ?? '', redirectUri, challenge, expiresAt: Date.now() + CODE_TTL_MS});
    const target = new URL(redirectUri);
    target.searchParams.set('code', code);
    const state = params.get('state');
    if (state) target.searchParams.set('state', state);
    res.writeHead(302, {location: target.toString()}).end();
    return true;
  }

  if (path === '/token' && req.method === 'POST') {
    const body = await readForm(req);
    const tokens = () => ({
      access_token: issue(secret, 'at', Math.floor(Date.now() / 1000) + ACCESS_TTL_S),
      token_type: 'Bearer',
      expires_in: ACCESS_TTL_S,
      refresh_token: issue(secret, 'rt', 0),
      scope: 'content-os',
    });

    if (body.grant_type === 'authorization_code') {
      const pending = codes.get(body.code ?? '');
      codes.delete(body.code ?? '');
      if (!pending || pending.expiresAt < Date.now()) {
        json(res, 400, {error: 'invalid_grant', error_description: 'Código inválido ou expirado'});
        return true;
      }
      const verifier = body.code_verifier ?? '';
      const computed = createHash('sha256').update(verifier).digest('base64url');
      if (!safeEqual(computed, pending.challenge) || (body.redirect_uri && body.redirect_uri !== pending.redirectUri)) {
        json(res, 400, {error: 'invalid_grant', error_description: 'PKCE ou redirect_uri não conferem'});
        return true;
      }
      json(res, 200, tokens());
      return true;
    }

    if (body.grant_type === 'refresh_token') {
      if (!verify(secret, body.refresh_token ?? '', 'rt')) {
        json(res, 400, {error: 'invalid_grant', error_description: 'Refresh token inválido'});
        return true;
      }
      json(res, 200, tokens());
      return true;
    }

    json(res, 400, {error: 'unsupported_grant_type'});
    return true;
  }

  return false;
}
