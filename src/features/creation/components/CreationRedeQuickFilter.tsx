import {RedeIcon} from '../../../components/ui/PlatformIcons';
import {Tooltip} from '../../../components/ui/Tooltip';
import {cn} from '../../../lib/utils';
import {ROTULO_REDE_DO_FILTRO, type RedeDoFiltro} from '../../contas/lib/contas';
import {agruparPorBlocoVisual} from '../../planejamento/lib/redesPostIt';
import {alternarRedeNoFiltro} from '../lib/creationRedeFilter';

interface CreationRedeQuickFilterProps {
  /** Redes com conta cadastrada, na ordem do app. */
  redes: readonly RedeDoFiltro[];
  value: readonly RedeDoFiltro[];
  onChange: (redes: RedeDoFiltro[]) => void;
  className?: string;
}

/**
 * Filtro rápido por rede, só com o ícone de cada plataforma cadastrada. Marca uma ou
 * várias; aparecem os itens que saem em qualquer uma das marcadas.
 * A fileira segue os blocos: curtos, YouTube longo e carrossel.
 */
export function CreationRedeQuickFilter({redes, value, onChange, className}: CreationRedeQuickFilterProps) {
  const grupos = agruparPorBlocoVisual(redes.map(rede => ({rede})), item => item.rede);
  return (
    <div role="group" aria-label="Filtrar por rede" className={cn('inline-flex shrink-0 flex-wrap items-center gap-4', className)}>
      {grupos.map(grupo => (
        <div key={grupo[0].rede} className="inline-flex items-center gap-1">
          {grupo.map(({rede}) => {
            const marcada = value.includes(rede);
            const nome = ROTULO_REDE_DO_FILTRO[rede];
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
      ))}
    </div>
  );
}
