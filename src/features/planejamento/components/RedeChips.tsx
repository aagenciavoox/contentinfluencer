import {RedeIcon} from '../../../components/ui/PlatformIcons';
import type {RedeSocial} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {REDE_ROTULO} from '../../contas/lib/contas';
import {normalizarRedesPostIt, REDES_DO_POSTIT} from '../lib/redesPostIt';

/** Chips de rede com ícone, várias escolhas. Mesmo visual de `MultiFilterChips`. */
export function RedeChips({value, onChange}: {value: readonly RedeSocial[]; onChange: (redes: RedeSocial[]) => void}) {
  return (
    <div role="group" aria-label="Rede onde vai sair" className="flex flex-wrap gap-2">
      {REDES_DO_POSTIT.map(rede => {
        const active = value.includes(rede);
        return (
          <button
            key={rede}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(normalizarRedesPostIt(active ? value.filter(item => item !== rede) : [...value, rede]))}
            className={cn('filter-chip min-h-9 pointer-coarse:min-h-11', active && 'filter-chip-active')}
          >
            <RedeIcon rede={rede} className="h-3.5 w-3.5 shrink-0" />
            {REDE_ROTULO[rede]}
          </button>
        );
      })}
    </div>
  );
}
