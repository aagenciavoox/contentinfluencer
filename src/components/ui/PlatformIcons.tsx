import {Globe, Newspaper} from 'lucide-react';
import type {RedeSocial} from '../../lib/database';
import {cn} from '../../lib/utils';
import {REDE_ROTULO} from '../../features/contas/lib/contas';
import {PlatformIcon} from './PlatformIcon';

/** Ícone de uma rede, herdando a cor do texto. Blog/site usa um jornal; `outra`, um globo. */
export function RedeIcon({rede, className}: {rede: RedeSocial; className?: string}) {
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
  redes: readonly RedeSocial[];
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  if (redes.length === 0) return null;
  const visiveis = redes.length > max ? redes.slice(0, max) : redes;
  const resto = redes.length - visiveis.length;
  const icone = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const nomes = redes.map(rede => REDE_ROTULO[rede]).join(', ');
  return (
    <span role="list" aria-label={`Redes: ${nomes}`} className={cn('inline-flex items-center gap-1 text-[var(--text-tertiary)]', className)}>
      {visiveis.map(rede => (
        <span key={rede} role="listitem" title={REDE_ROTULO[rede]} aria-label={REDE_ROTULO[rede]} className="inline-flex">
          <RedeIcon rede={rede} className={cn(icone, 'shrink-0')} />
        </span>
      ))}
      {resto > 0 ? (
        <span role="listitem" title={nomes} aria-label={`mais ${resto}`} className="text-2xs tabular-nums">+{resto}</span>
      ) : null}
    </span>
  );
}
