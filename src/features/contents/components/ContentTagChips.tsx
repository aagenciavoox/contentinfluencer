import { TagPill } from '../../../components/ui/TagSelect';
import { cn } from '../../../lib/utils';
import { userTags } from '../lib/contentTags';

interface ContentTagChipsProps {
  tags?: readonly string[] | null;
  /** Quantas mostrar antes do "+N". */
  max?: number;
  className?: string;
}

/** Tags do roteiro em chips compactos. Não mostra as tags técnicas de produção. */
export function ContentTagChips({ tags, max = 4, className }: ContentTagChipsProps) {
  const visible = userTags(tags);
  if (visible.length === 0) return null;
  const shown = visible.slice(0, max);
  const rest = visible.length - shown.length;
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-1', className)} aria-label={`Tags: ${visible.join(', ')}`}>
      {shown.map(tag => (
        <TagPill key={tag} label={`#${tag}`} className="!px-1.5 !py-0.5" />
      ))}
      {rest > 0 ? (
        <span className="text-xs text-[var(--text-tertiary)]" title={visible.slice(max).join(', ')}>
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
