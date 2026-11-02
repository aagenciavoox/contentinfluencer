import {RedeIcon} from '../../../components/ui/PlatformIcons';
import type {Platform, RedeSocial} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {REDE_ROTULO} from '../../contas/lib/contas';
import {normalizarRedesPostIt, REDES_DO_POSTIT} from '../lib/redesPostIt';

export interface RedeChipsProps {
  value: readonly RedeSocial[];
  onChange: (redes: RedeSocial[]) => void;
  platforms?: readonly Platform[];
}

/**
 * Chips de seleção de contas de publicação.
 * Prioriza exclusivamente as plataformas/contas ativas cadastradas pelo usuário.
 */
export function RedeChips({value, onChange, platforms = []}: RedeChipsProps) {
  const ativas = platforms.filter(p => p.ativo);

  // Se o usuário possui contas cadastradas, usa estritamente as redes dessas contas
  if (ativas.length > 0) {
    const redesDisponiveis = Array.from(
      new Set(
        ativas
          .map(p => p.rede || (p.nome.toLowerCase().includes('instagram') ? 'instagram' : p.nome.toLowerCase().includes('tiktok') ? 'tiktok' : p.nome.toLowerCase().includes('youtube') ? 'youtube' : null))
          .filter((r): r is RedeSocial => Boolean(r)),
      ),
    );

    return (
      <div role="group" aria-label="Contas de publicação cadastradas" className="flex flex-wrap gap-2">
        {ativas.map(conta => {
          const rede = conta.rede || (conta.nome.toLowerCase().includes('instagram') ? 'instagram' : conta.nome.toLowerCase().includes('tiktok') ? 'tiktok' : 'youtube') as RedeSocial;
          const active = value.includes(rede);
          const handleText = conta.handle ? (conta.handle.startsWith('@') ? conta.handle : `@${conta.handle}`) : conta.nome;

          return (
            <button
              key={conta.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                const next = active ? value.filter(r => r !== rede) : [...value, rede];
                onChange(normalizarRedesPostIt(next));
              }}
              className={cn(
                'filter-chip min-h-9 pointer-coarse:min-h-11 flex items-center gap-1.5 px-2.5 py-1 t-secondary',
                active && 'filter-chip-active',
              )}
            >
              <RedeIcon rede={rede} className="h-4 w-4 shrink-0" />
              <span>{handleText}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Fallback seguro: apenas as redes sociais principais, sem redes fantasmas
  const redesPadrao: RedeSocial[] = ['instagram', 'tiktok', 'youtube'];
  return (
    <div role="group" aria-label="Redes sociais" className="flex flex-wrap gap-2">
      {redesPadrao.map(rede => {
        const active = value.includes(rede);
        return (
          <button
            key={rede}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(normalizarRedesPostIt(active ? value.filter(item => item !== rede) : [...value, rede]))}
            className={cn('filter-chip min-h-9 pointer-coarse:min-h-11 flex items-center gap-1.5 px-2.5 py-1 t-secondary', active && 'filter-chip-active')}
          >
            <RedeIcon rede={rede} className="h-3.5 w-3.5 shrink-0" />
            <span>{REDE_ROTULO[rede]}</span>
          </button>
        );
      })}
    </div>
  );
}
