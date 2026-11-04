import { Text } from './Text';
import { Instagram, Youtube } from 'lucide-react';
import { cn } from '../../lib/utils';
import { platformDisplayName, platformKey } from './platformName';

export { platformDisplayName, platformKey };

/** Shorts: vídeo em pé com o play, para separar do vídeo longo do YouTube. */
export function ShortsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <path d="M10.5 9.5v5l4-2.5z" fill="currentColor" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.5 3.5c.7 1.4 1.8 2.5 3.2 3.1V10c-1.1-.1-2.2-.4-3.2-.9v6.8c0 3.4-2.8 6.2-6.2 6.2S4.1 19.3 4.1 15.9 6.9 9.7 10.3 9.7c.4 0 .8 0 1.2.1v3.4c-.3-.1-.7-.2-1.1-.2-1.6 0-2.9 1.3-2.9 2.9s1.3 2.9 2.9 2.9 2.9-1.3 2.9-2.9V3.5h3.2z" />
    </svg>
  );
}

interface PlatformIconProps {
  platform: string;
  className?: string;
  /** Na cor da marca da rede (`--platform-*`). Sem isso, herda a cor do texto. */
  colored?: boolean;
}

const COR_DA_REDE = {
  instagram: 'text-[var(--platform-instagram)]',
  'instagram-video': 'text-[var(--platform-instagram)]',
  'instagram-carrossel': 'text-[var(--platform-instagram)]',
  youtube: 'text-[var(--platform-youtube)]',
  'youtube-shorts': 'text-[var(--platform-youtube)]',
  tiktok: 'text-[var(--platform-tiktok)]',
  'tiktok-video': 'text-[var(--platform-tiktok)]',
  'tiktok-carrossel': 'text-[var(--platform-tiktok)]',
} as const;

/** A rede pelo começo do texto: "instagram", "Instagram @diza" e "Instagram · Leituras" dão Instagram. */
function redeDoTexto(texto: string): keyof typeof COR_DA_REDE | null {
  const key = platformKey(texto);
  if (key === 'shorts' || key === 'youtubeshorts' || key === 'youtube-shorts' || key.includes('shorts')) return 'youtube-shorts';
  if (key === 'instagram-video' || key === 'instagramvideo' || key.includes('instagram') && key.includes('video')) return 'instagram-video';
  if (key === 'instagram-carrossel' || key === 'instagramcarrossel' || key.includes('instagram') && key.includes('carrossel')) return 'instagram-carrossel';
  if (key === 'tiktok-video' || key === 'tiktokvideo' || key.includes('tiktok') && key.includes('video')) return 'tiktok-video';
  if (key === 'tiktok-carrossel' || key === 'tiktokcarrossel' || key.includes('tiktok') && key.includes('carrossel')) return 'tiktok-carrossel';
  if (key.startsWith('instagram')) return 'instagram';
  if (key.startsWith('tiktok')) return 'tiktok';
  if (key.startsWith('youtube')) return 'youtube';
  return null;
}

/**
 * Ícone da plataforma. Aceita a rede (`instagram`) ou o rótulo da conta
 * (`Instagram @diza`); para plataformas sem ícone, mostra as 2 primeiras letras.
 */
export function PlatformIcon({ platform, className, colored = false }: PlatformIconProps) {
  const rede = redeDoTexto(platform);
  const cor = colored && rede ? COR_DA_REDE[rede] : undefined;
  if (rede === 'instagram' || rede === 'instagram-video' || rede === 'instagram-carrossel') {
    return <Instagram className={cn(cor, className)} aria-hidden />;
  }
  if (rede === 'youtube-shorts') return <ShortsIcon className={cn(cor, className)} />;
  if (rede === 'youtube') return <Youtube className={cn(cor, className)} aria-hidden />;
  if (rede === 'tiktok' || rede === 'tiktok-video' || rede === 'tiktok-carrossel') {
    return <TikTokIcon className={cn(cor, className)} />;
  }
  // Id de conta (uuid) não é rótulo: sem ícone, em vez de duas letras soltas.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(platform.trim())) return null;
  return (
    <Text variant="label" as="span" className={cn('', className)} aria-hidden>
      {platform.trim().slice(0, 2)}
    </Text>
  );
}

const FUNDO_DA_REDE = {
  instagram: 'bg-[var(--platform-instagram)] text-[var(--brand-on-accent)]',
  'instagram-video': 'bg-[var(--platform-instagram)] text-[var(--brand-on-accent)]',
  'instagram-carrossel': 'bg-[var(--platform-instagram)] text-[var(--brand-on-accent)]',
  youtube: 'bg-[var(--platform-youtube)] text-[var(--brand-on-accent)]',
  'youtube-shorts': 'bg-[var(--platform-youtube)] text-[var(--brand-on-accent)]',
  tiktok: 'bg-[var(--platform-tiktok)] text-[var(--bg-elevated)]',
  'tiktok-video': 'bg-[var(--platform-tiktok)] text-[var(--bg-elevated)]',
  'tiktok-carrossel': 'bg-[var(--platform-tiktok)] text-[var(--bg-elevated)]',
} as const;

/** Ícone da rede num quadrado na cor da marca, para listas de contas. */
export function PlatformTile({ platform, className }: { platform: string; className?: string }) {
  const rede = redeDoTexto(platform);
  return (
    <span
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
        rede ? FUNDO_DA_REDE[rede] : 'bg-[var(--surface-subtle)] text-[var(--text-primary)]',
        className,
      )}
      aria-hidden
    >
      <PlatformIcon platform={platform} className="h-5 w-5" />
    </span>
  );
}
