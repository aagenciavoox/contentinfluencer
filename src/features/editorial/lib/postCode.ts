/** Código do post a partir da URL. Links curtos do TikTok não têm código. */
export function parsePostCode(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  const path = parsed.pathname;

  if (host === 'vm.tiktok.com') return null;

  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    const match = path.match(/\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
    return match?.[1] ?? null;
  }

  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    const match = path.match(/\/@[^/]+\/video\/(\d+)/);
    return match?.[1] ?? null;
  }

  return null;
}