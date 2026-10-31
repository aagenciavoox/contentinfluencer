import { Text } from '../../../components/ui/Text';
import { Badge } from '../../../components/ui/Badge';
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
    <div className={cn('flex min-w-0 flex-wrap items-center gap-1', className)} role="group" aria-label="Temas">
      {shown.map((nome, index) => (
        <Badge key={`${index}-${nome}`} variant="tag" className="px-1.5">{nome}</Badge>
      ))}
      {rest > 0 ? (
        <Text variant="meta" as="span" className="text-[var(--text-tertiary)]" title={nomes.slice(max).join(', ')}>
          <span aria-hidden>+{rest}</span>
          <span className="sr-only">{nomes.slice(max).join(', ')}</span>
        </Text>
      ) : null}
    </div>
  );
}
