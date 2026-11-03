import type {ComponentType} from 'react';
import {CheckCircle2, Clapperboard, FileText, Lightbulb, Scissors} from 'lucide-react';
import {Badge} from '../../../components/ui/Badge';
import {cn} from '../../../lib/utils';
import type {PostItKind} from '../lib/postIt';

export type EtapaDoCard = Exclude<PostItKind, 'vazio'>;

const ETAPA: Record<EtapaDoCard, {label: string; Icon: ComponentType<{className?: string}>}> = {
  ideia: {label: 'Ideia', Icon: Lightbulb},
  roteiro: {label: 'Roteiro', Icon: FileText},
  producao: {label: 'Produção', Icon: Clapperboard},
  edicao: {label: 'Edição', Icon: Scissors},
  postado: {label: 'Publicado', Icon: CheckCircle2},
};

/**
 * Selo da etapa (ideia, roteiro, produção...). A cor é sempre a da etapa:
 * o card herda a cor da série ou do pilar, e o selo é o que diferencia uma etapa da outra.
 */
export function EtapaBadge({etapa, compact = false, cor, className}: {etapa: EtapaDoCard; compact?: boolean; cor?: string | null; className?: string}) {
  const {label, Icon} = ETAPA[etapa];
  // Com cor (série ou pilar), o selo acompanha a cor do card.
  if (cor) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-1.5 py-0 text-2xs font-medium', className)}
        style={{
          borderColor: `color-mix(in srgb, ${cor} 45%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${cor} 10%, var(--bg-elevated))`,
          color: `color-mix(in srgb, ${cor} 75%, var(--text-primary))`,
        }}
      >
        <Icon className="h-2.5 w-2.5 shrink-0" aria-hidden />
        {label}
      </span>
    );
  }
  return (
    <Badge variant="status" status={label} className={cn('inline-flex items-center gap-1', compact && 'px-1.5 py-0 text-2xs', className)}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </Badge>
  );
}

/** Só o ícone da etapa, na cor do card. Vai na linha de baixo, junto da rede e do horário. */
export function EtapaIcon({etapa, cor, className}: {etapa: EtapaDoCard; cor?: string | null; className?: string}) {
  const {label, Icon} = ETAPA[etapa];
  return (
    <span title={label} aria-label={label} role="img" className={cn('inline-flex shrink-0', className)} style={{color: cor ? `color-mix(in srgb, ${cor} 80%, var(--text-primary))` : 'var(--text-secondary)'}}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}