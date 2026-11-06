import { Link } from 'react-router-dom';
import { Check, Circle, Minus, Pause } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import { FrequenciaChip } from '../../editorial/components/FrequenciaChip';
import type { Continuidade } from '../lib/saudeIndicadores';
import {
  hrefEditorialDaWave,
  linhasDaRegua,
  rotuloDaMarca,
  type LinhaDaRegua,
  type MarcaDaJanela,
  type MarcaRegua,
} from '../lib/reguaFrequencia';

export type ReguaDeFrequenciaProps = {
  /**
   * Continuidade já calculada no Planejamento (monthHealth.continuidade).
   * Null/undefined ou sem acompanhadas: a faixa não renderiza.
   */
  continuidade: Continuidade<unknown> | null | undefined;
  className?: string;
  /**
   * Depois de gravar o chip (série/quadro). Opcional — a Página pode refrescar
   * o que precisar; o store já atualiza a série.
   */
  onFrequenciaSalva?: (serieId: string) => void;
  /** Celular (faixa "Ritmo"): sem moldura, sem título e sem subtítulo. */
  compacto?: boolean;
};

const MARCA_VISUAL: Record<
  MarcaDaJanela,
  { Icon: typeof Check; className: string }
> = {
  atendida: {
    Icon: Check,
    className: 'bg-[color-mix(in_srgb,var(--accent-green)_18%,transparent)] text-[var(--accent-green)]',
  },
  reservada: {
    Icon: Circle,
    className: 'bg-[color-mix(in_srgb,var(--accent-orange)_16%,transparent)] text-[var(--accent-orange)]',
  },
  buraco: {
    Icon: Minus,
    className: 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]',
  },
  pausada: {
    Icon: Pause,
    className: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)]',
  },
};

function MarcaSlot({ marca }: { marca: MarcaRegua }) {
  const visual = MARCA_VISUAL[marca.marca];
  const Icon = visual.Icon;
  const titulo = `${rotuloDaMarca(marca.marca)} · ${marca.quantidade} de ${marca.meta} · ${marca.inicio}–${marca.fim}`;
  return (
    <span
      title={titulo}
      aria-label={titulo}
      className={cn(
        'inline-flex h-5 w-5 items-center justify-center rounded-[var(--radius-pill)]',
        visual.className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
    </span>
  );
}

function LinhaRegua({
  linha,
  onFrequenciaSalva,
  compacto = false,
}: {
  linha: LinhaDaRegua;
  onFrequenciaSalva?: (serieId: string) => void;
  compacto?: boolean;
}) {
  const ehWave = linha.tipo === 'temporada';
  const subtitulo = compacto ? '' : [linha.paiNome, linha.progressoTexto].filter(Boolean).join(' · ');

  return (
    <div
      className="flex flex-wrap items-center gap-2 sm:gap-3"
      data-regua-chave={linha.chave}
    >
      <div className="min-w-0 flex-1 basis-[10rem]">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Text variant="bodyStrong" as="span" className="min-w-0 truncate">
            {linha.nome}
          </Text>
          {ehWave ? (
            <Badge variant="tag" className="px-1.5 py-0">
              Wave
            </Badge>
          ) : null}
          {linha.seriePausada ? (
            <Badge variant="neutral" className="px-1.5 py-0">
              Em pausa
            </Badge>
          ) : null}
        </div>
        {subtitulo ? (
          <Text variant="meta" as="p" className="truncate text-[var(--text-secondary)]">
            {subtitulo}
          </Text>
        ) : null}
      </div>

      <div
        className="flex flex-wrap items-center gap-1"
        role="list"
        aria-label={`Janelas de ${linha.nome}`}
      >
        {linha.marcas.length === 0 ? (
          <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
            Sem janela neste período
          </Text>
        ) : (
          linha.marcas.map(marca => (
            <span role="listitem" key={`${marca.inicio}:${marca.fim}`}>
              <MarcaSlot marca={marca} />
            </span>
          ))
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Text variant="meta" as="span" className="hidden text-[var(--text-secondary)] sm:inline">
          {linha.frequencia}
        </Text>
        {ehWave && linha.temporadaId ? (
          <Link
            to={hrefEditorialDaWave(linha.temporadaId)}
            className="t-label text-[var(--brand-accent-text)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-pill)]"
          >
            Ajustar no Editorial
          </Link>
        ) : (
          <FrequenciaChip
            serieId={linha.serieId}
            className="w-fit"
            onSalvo={() => onFrequenciaSalva?.(linha.serieId)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Régua de frequência do Planejamento: uma linha por série/quadro/wave
 * acompanhada, com ✓ / só reserva / buraco / pausa por janela da meta.
 *
 * Vive numa faixa própria (acima da grade, abaixo dos avisos). A Página só
 * monta: <ReguaDeFrequencia continuidade={monthHealth.continuidade} />.
 */
export function ReguaDeFrequencia({
  continuidade,
  className,
  onFrequenciaSalva,
  compacto = false,
}: ReguaDeFrequenciaProps) {
  const linhas = linhasDaRegua(continuidade);
  if (linhas.length === 0) return null;

  if (compacto) {
    return (
      <div className={cn('stack-sm', className)} aria-label="Régua de frequência">
        {linhas.map(linha => (
          <LinhaRegua
            key={linha.chave}
            linha={linha}
            compacto
            onFrequenciaSalva={onFrequenciaSalva}
          />
        ))}
      </div>
    );
  }

  return (
    <Surface
      variant="outlined"
      padding="none"
      className={cn(
        'w-full overflow-hidden rounded-[var(--radius-card)] border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 sm:p-4',
        className,
      )}
      aria-label="Régua de frequência"
    >
      <div className="stack-sm">
        <Text variant="eyebrow" as="h2">
          Ritmo no período
        </Text>
        <div className="stack-sm">
          {linhas.map(linha => (
            <LinhaRegua
              key={linha.chave}
              linha={linha}
              onFrequenciaSalva={onFrequenciaSalva}
            />
          ))}
        </div>
      </div>
    </Surface>
  );
}
