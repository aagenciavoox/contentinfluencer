import { Text } from './Text';
import {Globe, LayoutGrid, Newspaper, Video} from 'lucide-react';
import type {RedeSocial} from '../../lib/database';
import {cn} from '../../lib/utils';
import {REDE_ROTULO, ROTULO_REDE_DO_FILTRO, redeBaseDoFiltro, type RedeDoFiltro} from '../../features/contas/lib/contas';
import {PlatformIcon, ShortsIcon} from './PlatformIcon';

export {ShortsIcon};

/** Ícone de uma rede, herdando a cor do texto. Blog/site usa um jornal; `outra`, um globo; Shorts, o vídeo em pé. */
export function RedeIcon({rede, className}: {rede: RedeDoFiltro; className?: string}) {
  if (rede === 'youtube-shorts') return <ShortsIcon className={className} />;
  // Vídeo do Instagram usa o ícone da rede; carrossel mantém o grid.
  if (rede === 'instagram-video') return <PlatformIcon platform="instagram" className={className} />;
  if (rede === 'tiktok-video') return <Video className={className} aria-hidden />;
  if (rede === 'instagram-carrossel' || rede === 'tiktok-carrossel') return <LayoutGrid className={className} aria-hidden />;
  if (rede === 'blog') return <Newspaper className={className} aria-hidden />;
  if (rede === 'outra') return <Globe className={className} aria-hidden />;
  return <PlatformIcon platform={rede} className={className} />;
}

/**
 * Fileira compacta de ícones de rede, em tom apagado. Passou de `max`, mostra +N.
 * Cada ícone tem dica e rótulo acessível.
 */
export function PlatformIcons({
  redes,
  max = 3,
  size = 'sm',
  className,
}: {
  /** Shorts aparece com o ícone e o nome dele; as outras redes, como antes. */
  redes: readonly RedeDoFiltro[];
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  if (redes.length === 0) return null;
  const visiveis = redes.length > max ? redes.slice(0, max) : redes;
  const resto = redes.length - visiveis.length;
  const icone = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const rotulo = (rede: RedeDoFiltro) => (
    rede === redeBaseDoFiltro(rede) ? (REDE_ROTULO[rede] ?? ROTULO_REDE_DO_FILTRO[rede]) : ROTULO_REDE_DO_FILTRO[rede]
  );
  const nomes = redes.map(rotulo).join(', ');
  return (
    <span role="list" aria-label={`Redes: ${nomes}`} className={cn('inline-flex items-center gap-1 text-[var(--text-tertiary)]', className)}>
      {visiveis.map(rede => (
        <span key={rede} role="listitem" title={rotulo(rede)} aria-label={rotulo(rede)} className="inline-flex">
          <RedeIcon rede={rede} className={cn(icone, 'shrink-0')} />
        </span>
      ))}
      {resto > 0 ? (
        <Text variant="meta" as="span" role="listitem" title={nomes} aria-label={`mais ${resto}`} className="tabular-nums text-inherit">+{resto}</Text>
      ) : null}
    </span>
  );
}
