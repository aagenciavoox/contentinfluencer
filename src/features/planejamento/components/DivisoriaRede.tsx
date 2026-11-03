import type {ReactNode} from 'react';
import type {RedeSocial} from '../../../lib/database';
import {PlatformIcon} from '../../../components/ui/PlatformIcon';
import {REDE_ROTULO} from '../../contas/lib/contas';

/**
 * Linha fina no dia de postagem de uma rede. Abaixo dela, numa área levemente tingida,
 * ficam os cartões só daquela rede.
 */
export function DivisoriaRede({rede, children}: {rede: RedeSocial; children?: ReactNode}) {
  const rotulo = REDE_ROTULO[rede];
  return (
    <div className="mt-2 min-w-0 pt-1">
      <div
        role="separator"
        aria-label={`Abaixo, só ${rotulo}`}
        title={`Dia de ${rotulo}: abaixo da linha, só ${rotulo}`}
        className="flex min-w-0 items-center gap-1 py-0.5 text-[var(--text-tertiary)]"
      >
        <span className="h-px min-w-0 flex-1 bg-[var(--border-color)]" aria-hidden />
        <PlatformIcon platform={rede} className="h-3 w-3 shrink-0" />
        <span className="h-px min-w-0 flex-1 bg-[var(--border-color)]" aria-hidden />
      </div>
      <div className="stack-sm mt-1 min-w-0 rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)] p-1 empty:hidden">
        {children}
      </div>
    </div>
  );
}