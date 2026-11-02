import type {RedeSocial} from '../../../lib/database';
import {RedeIcon} from '../../../components/ui/PlatformIcons';
import {Tooltip} from '../../../components/ui/Tooltip';
import {cn} from '../../../lib/utils';
import {REDE_ROTULO} from '../../contas/lib/contas';
import {alternarRedeNoFiltro} from '../lib/creationRedeFilter';

interface CreationRedeQuickFilterProps {
  /** Redes com conta cadastrada, na ordem do app. */
  redes: readonly RedeSocial[];
  value: readonly RedeSocial[];
  onChange: (redes: RedeSocial[]) => void;
  className?: string;
}

/**
 * Filtro rápido por rede, só com o ícone de cada plataforma cadastrada. Marca uma ou
 * várias; aparecem os itens que saem em qualquer uma das marcadas.
 */
export function CreationRedeQuickFilter({redes, value, onChange, className}: CreationRedeQuickFilterProps) {
  return (
    <div role="group" aria-label="Filtrar por rede" className={cn('inline-flex shrink-0 items-center gap-1', className)}>
      {redes.map(rede => {
        const marcada = value.includes(rede);
        const nome = REDE_ROTULO[rede];
        return (
          <Tooltip key={rede} label={nome} side="top">
            <button
              type="button"
              aria-pressed={marcada}
              aria-label={`Filtrar por ${nome}`}
              onClick={() => onChange(alternarRedeNoFiltro(value, rede))}
              className={cn(
                'inline-flex h-[var(--control-height)] w-[var(--control-height)] items-center justify-center rounded-[var(--radius-input)] border transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] pointer-coarse:h-11 pointer-coarse:w-11',
                marcada
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-secondary)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
              )}
            >
              <RedeIcon rede={rede} className="h-4 w-4" />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
