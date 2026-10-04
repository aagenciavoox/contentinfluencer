import { Instagram, Youtube } from 'lucide-react';
import { cn } from '../../lib/utils';
import { platformDisplayName, platformKey } from './platformName';

export { platformDisplayName, platformKey };

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
}

/** Ícone da plataforma; para plataformas sem ícone, mostra as 2 primeiras letras. */
export function PlatformIcon({ platform, className }: PlatformIconProps) {
  const key = platformKey(platform);
  if (key === 'instagram') return <Instagram className={className} aria-hidden />;
  if (key === 'youtube') return <Youtube className={className} aria-hidden />;
  if (key === 'tiktok') return <TikTokIcon className={className} />;
  return (
    <span className={cn('text-xs font-semibold', className)} aria-hidden>
      {platform.trim().slice(0, 2)}
    </span>
  );
}
