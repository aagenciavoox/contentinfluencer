import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';

export type PlacarStatusTone = 'ok' | 'aviso' | 'erro' | 'neutro';

export interface PlacarSinal {
  id: string;
  numero: string;
  etiqueta: string;
  statusTexto: string;
  tone: PlacarStatusTone;
  titulo: string;
  subtitulo: string;
  rodapeChave: string;
  rodapeValor: string;
  alvoId: string;
}

const pillToneClasses: Record<PlacarStatusTone, string> = {
  ok: 'bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--text-primary)]',
  aviso: 'bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--text-primary)] border border-[color-mix(in_srgb,var(--warning)_35%,transparent)]',
  erro: 'bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--text-primary)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)]',
  neutro: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
};

const dotToneClasses: Record<PlacarStatusTone, string> = {
  ok: 'bg-[var(--success)]',
  aviso: 'bg-[var(--warning)]',
  erro: 'bg-[var(--danger)]',
  neutro: 'bg-[var(--text-tertiary)]',
};

const cardBorderToneClasses: Record<PlacarStatusTone, string> = {
  ok: 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]',
  aviso: 'border-[color-mix(in_srgb,var(--warning)_45%,var(--border-color))] bg-[color-mix(in_srgb,var(--warning)_4%,var(--bg-elevated))] hover:border-[var(--warning)]',
  erro: 'border-[color-mix(in_srgb,var(--danger)_40%,var(--border-color))] bg-[color-mix(in_srgb,var(--danger)_4%,var(--bg-elevated))] hover:border-[var(--danger)]',
  neutro: 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]',
};

export function SaudePlacar({
  sinais,
  escopoRotulo,
  onSelecionarSecao,
}: {
  sinais: readonly PlacarSinal[];
  escopoRotulo?: string;
  onSelecionarSecao: (alvoId: string) => void;
}) {
  return (
    <section aria-labelledby="saude-placar-titulo" className="stack-sm">
      <div className="flex items-center justify-between gap-2">
        <Text id="saude-placar-titulo" variant="eyebrow" as="h3" className="text-[var(--text-tertiary)]">
          Placar de diagnóstico rápido
        </Text>
        {escopoRotulo ? (
          <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
            {escopoRotulo}
          </Text>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {sinais.map(sinal => (
          <Surface
            key={sinal.id}
            variant="outlined"
            padding="none"
            onClick={() => onSelecionarSecao(sinal.alvoId)}
            className={cn(
              'flex flex-col justify-between gap-3 rounded-[var(--radius-card)] border p-3.5 text-left transition-colors',
              cardBorderToneClasses[sinal.tone],
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <Text variant="eyebrow" as="span" className="text-[var(--text-secondary)]">
                {sinal.numero}. {sinal.etiqueta}
              </Text>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5',
                  pillToneClasses[sinal.tone],
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', dotToneClasses[sinal.tone])} aria-hidden />
                <Text variant="label" as="span" className="text-current">
                  {sinal.statusTexto}
                </Text>
              </span>
            </div>

            <div className="stack-xs">
              <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)] leading-tight">
                {sinal.titulo}
              </Text>
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                {sinal.subtitulo}
              </Text>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2">
              <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
                {sinal.rodapeChave}
              </Text>
              <Text
                variant="label"
                as="span"
                className={cn(
                  'tabular-nums text-right',
                  sinal.tone === 'aviso'
                    ? 'text-[var(--warning)]'
                    : sinal.tone === 'erro'
                      ? 'text-[var(--danger)]'
                      : 'text-[var(--text-primary)]',
                )}
              >
                {sinal.rodapeValor}
              </Text>
            </div>
          </Surface>
        ))}
      </div>
    </section>
  );
}
