import type { ReactNode } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clapperboard,
  Clock,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';

export type AlertaCardTone = 'erro' | 'aviso' | 'neutro';

export interface AlertaCardItem {
  id: string;
  categoria: string;
  metaDireita?: string;
  titulo: string;
  descricao: string;
  tone: AlertaCardTone;
  destaqueAcao?: boolean;
  acaoRotulo: string;
  acaoIcone?: 'calendario' | 'gravacao' | 'reserva' | 'editorial' | 'localizar';
  onAcao: () => void;
}

function iconeCategoria(tone: AlertaCardTone, acaoIcone?: AlertaCardItem['acaoIcone']): ReactNode {
  if (acaoIcone === 'gravacao') return <Clapperboard className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  if (acaoIcone === 'reserva') return <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  if (acaoIcone === 'editorial') return <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  if (tone === 'erro') return <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  if (tone === 'aviso') return <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  return <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />;
}

const categoriaCorClasses: Record<AlertaCardTone, string> = {
  erro: 'text-[var(--danger)]',
  aviso: 'text-[var(--warning)]',
  neutro: 'text-[var(--text-secondary)]',
};

export function SaudeFaltaAlgoSection({
  cards,
  resumoProducao,
  textoExcesso,
}: {
  cards: readonly AlertaCardItem[];
  resumoProducao: string;
  textoExcesso?: string | null;
}) {
  return (
    <Surface
      id="saude-falta-algo"
      as="section"
      variant="outlined"
      padding="md"
      className="scroll-mt-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] stack-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            aria-hidden
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)] text-[var(--brand-accent-text)]"
          >
            <Text variant="label" as="span" className="text-current">
              2
            </Text>
          </span>
          <div className="min-w-0">
            <Text variant="itemTitle" as="h3" className="text-[var(--text-primary)] leading-tight">
              Falta algo?
            </Text>
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              Pendências de data, gravação e ajustes operacionais do período
            </Text>
          </div>
        </div>

        <Badge variant={cards.length > 0 ? 'warning' : 'success'}>
          {cards.length > 0
            ? `${cards.length} ${cards.length === 1 ? 'ponto ativo' : 'pontos ativos'}`
            : 'Tudo em dia'}
        </Badge>
      </div>

      {cards.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-3.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" aria-hidden />
          <div className="min-w-0">
            <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)]">
              Nenhuma pendência aberta neste período
            </Text>
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              {resumoProducao}
            </Text>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {cards.map(card => (
            <div
              key={card.id}
              className="flex flex-col justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-3.5 transition-colors hover:border-[var(--border-strong)]"
            >
              <div className="stack-xs">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1',
                      categoriaCorClasses[card.tone],
                    )}
                  >
                    {iconeCategoria(card.tone, card.acaoIcone)}
                    <Text variant="eyebrow" as="span" className="text-current">
                      {card.categoria}
                    </Text>
                  </span>
                  {card.metaDireita ? (
                    <Text variant="meta" as="span" className="shrink-0 text-[var(--text-tertiary)] tabular-nums">
                      {card.metaDireita}
                    </Text>
                  ) : null}
                </div>

                <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)] leading-snug">
                  {card.titulo}
                </Text>
                <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                  {card.descricao}
                </Text>
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-2.5">
                <AppButton
                  variant="secondary"
                  size="xs"
                  fullWidth
                  onClick={card.onAcao}
                  className={cn(
                    card.destaqueAcao &&
                      'border-[color-mix(in_srgb,var(--brand-accent-strong)_45%,var(--border-input))] text-[var(--brand-accent-text)] hover:bg-[color-mix(in_srgb,var(--brand-accent)_8%,var(--bg-elevated))]',
                  )}
                >
                  {card.acaoRotulo}
                </AppButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {textoExcesso ? (
        <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
          {textoExcesso}
        </Text>
      ) : null}
    </Surface>
  );
}
