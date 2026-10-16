import { TagPill } from '../../../components/ui/TagSelect';
import { useAppContext } from '../../../context/AppContext';
import { cn } from '../../../lib/utils';

interface ContentTemaChipsProps {
  temaIds?: readonly string[] | null;
  /** Quantos mostrar antes do "+N". */
  max?: number;
  className?: string;
}

/** Temas do roteiro em chips compactos. */
export function ContentTemaChips({ temaIds, max = 4, className }: ContentTemaChipsProps) {
  const { state } = useAppContext();
  const nomes = (temaIds ?? []).flatMap(id => {
    const nome = state.temas.find(tema => tema.id === id)?.nome?.trim();
    return nome ? [nome] : [];
  });
  if (nomes.length === 0) return null;
  const shown = nomes.slice(0, max);
  const rest = nomes.length - shown.length;
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-1', className)} aria-label={`Temas: ${nomes.join(', ')}`}>
      {shown.map(nome => (
        <TagPill key={nome} label={nome} className="!px-1.5 !py-0.5" />
      ))}
      {rest > 0 ? (
        <span className="text-xs text-[var(--text-tertiary)]" title={nomes.slice(max).join(', ')}>
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
