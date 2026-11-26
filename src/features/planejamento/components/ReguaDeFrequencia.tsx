import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isValid, parseISO } from 'date-fns';
import { Check, ChevronDown, Circle, Minus, Pause, Pencil } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import { FrequenciaChip } from '../../editorial/components/FrequenciaChip';
import type { Continuidade } from '../lib/saudeIndicadores';
import {
  celulasDaLinha,
  colunasDaRegua,
  hrefEditorialDaWave,
  linhasDaRegua,
  ordemDaRegua,
  resumoDaRegua,
  rotuloDaMarca,
  type ColunaDaRegua,
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
    className: 'text-[var(--accent-orange)]',
  },
  'no-prazo': {
    Icon: Circle,
    className: 'text-[var(--text-tertiary)]',
  },
  abaixo: {
    Icon: Minus,
    className: 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]',
  },
  pausada: {
    Icon: Pause,
    className: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)]',
  },
};

const LEGENDA: { marca: MarcaDaJanela; rotulo: string }[] = [
  { marca: 'atendida', rotulo: 'No ritmo' },
  { marca: 'reservada', rotulo: 'Só com post-it' },
  { marca: 'no-prazo', rotulo: 'No prazo' },
  { marca: 'abaixo', rotulo: 'Abaixo' },
  { marca: 'pausada', rotulo: 'Em pausa' },
];

function tituloDaMarca(marca: MarcaRegua): string {
  const nome = LEGENDA.find(item => item.marca === marca.marca)?.rotulo ?? rotuloDaMarca(marca.marca);
  return `${nome} · ${marca.quantidade} de ${marca.meta} · ${marca.inicio}–${marca.fim}`;
}

function MarcaSlot({ marca }: { marca: MarcaRegua }) {
  const visual = MARCA_VISUAL[marca.marca];
  const Icon = visual.Icon;
  const titulo = tituloDaMarca(marca);
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

function MarcaPequena({ marca }: { marca: MarcaRegua }) {
  const titulo = tituloDaMarca(marca);
  if (marca.marca === 'reservada' || marca.marca === 'no-prazo') {
    return (
      <span title={titulo} aria-label={titulo} className="inline-flex h-6 w-6 items-center justify-center">
        <span
          className={cn(
            'h-4 w-4 rounded-full border-2',
            marca.marca === 'reservada' ? 'border-[var(--accent-orange)]' : 'border-[var(--text-tertiary)]',
          )}
          aria-hidden
        />
      </span>
    );
  }
  const visual = MARCA_VISUAL[marca.marca];
  const Icon = visual.Icon;
  return (
    <span
      title={titulo}
      aria-label={titulo}
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-input)]',
        visual.className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
    </span>
  );
}

function rotuloSemana(isoDate: string): string {
  const parsed = parseISO(isoDate);
  if (!isValid(parsed)) return isoDate;
  return format(parsed, 'dd/MM');
}

function temPendencia(linha: LinhaDaRegua): boolean {
  return linha.marcas.some(marca => marca.marca === 'abaixo' || marca.marca === 'reservada');
}

function trilhaDasSemanas(total: number): string {
  if (total <= 0) return 'minmax(0,1fr)';
  return `minmax(9rem,1fr) repeat(${total}, 2.75rem)`;
}

function LinhaRegua({
  linha,
  onFrequenciaSalva,
}: {
  linha: LinhaDaRegua;
  onFrequenciaSalva?: (serieId: string) => void;
}) {
  const ehWave = linha.tipo === 'temporada';
  const subtitulo = [linha.paiNome, linha.progressoTexto].filter(Boolean).join(' · ');

  return (
    <div
      className="flex flex-wrap items-center gap-2 sm:gap-3"
      data-regua-chave={linha.chave}
    >
      <div className="min-w-0 flex-1 basis-[10rem]">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Text variant="bodyStrong" as="span" className="min-w-0 truncate">
            {linha.nome}
          </Text>
          {ehWave ? (
            <Badge variant="tag" className="px-2 py-0">
              Wave
            </Badge>
          ) : null}
          {linha.seriePausada ? (
            <Badge variant="neutral" className="px-2 py-0">
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
        className="flex flex-wrap items-center gap-2"
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

function FrequenciaDaLinha({
  linha,
  onFrequenciaSalva,
}: {
  linha: LinhaDaRegua;
  onFrequenciaSalva?: (serieId: string) => void;
}) {
  if (linha.tipo === 'temporada' && linha.temporadaId) {
    return (
      <Link
        to={hrefEditorialDaWave(linha.temporadaId)}
        className="t-meta inline-flex max-w-full items-center gap-1 rounded-[var(--radius-input)] py-1 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <span className="truncate">{linha.frequencia}</span>
        <Pencil className="h-3 w-3 shrink-0" aria-hidden />
      </Link>
    );
  }

  return (
    <FrequenciaChip
      serieId={linha.serieId}
      aparencia="linha"
      onSalvo={() => onFrequenciaSalva?.(linha.serieId)}
    />
  );
}

function LinhaDaColuna({
  linha,
  filha,
  semanas,
  onFrequenciaSalva,
}: {
  linha: LinhaDaRegua;
  filha: boolean;
  semanas: ColunaDaRegua[];
  onFrequenciaSalva?: (serieId: string) => void;
}) {
  const celulas = linha.marcas.length === 0 ? [] : celulasDaLinha(linha.marcas, semanas);

  return (
    <div
      className="grid items-center gap-2 border-t border-[var(--border-subtle)] px-3 py-2"
      style={{ gridTemplateColumns: trilhaDasSemanas(semanas.length) }}
      data-regua-chave={linha.chave}
      aria-label={`Acompanhamento de ${linha.nome}`}
    >
      <div className={cn('flex min-w-0 items-start gap-2', filha && 'pl-2')}>
        {filha ? (
          <span
            aria-hidden
            className="mt-1 inline-block h-3 w-3 shrink-0 border-b border-l border-[var(--border-color)]"
          />
        ) : null}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Text variant="bodyStrong" as="span" className="min-w-0 truncate" title={linha.nome}>
              {linha.nome}
            </Text>
            {linha.seriePausada ? (
              <Badge variant="neutral" className="shrink-0 px-2 py-0">Em pausa</Badge>
            ) : null}
          </div>
          {linha.progressoTexto ? (
            <Text variant="meta" as="p" className="truncate">{linha.progressoTexto}</Text>
          ) : null}
          <FrequenciaDaLinha linha={linha} onFrequenciaSalva={onFrequenciaSalva} />
        </div>
      </div>
      {semanas.length === 0 ? (
        <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">Sem janela neste período</Text>
      ) : celulas.map(celula => (
        <div
          key={celula.tipo === 'marca' ? `${celula.marca.inicio}:${celula.marca.fim}` : `vazia-${celula.coluna}`}
          className="flex items-center justify-center gap-1"
          style={{ gridColumn: `${celula.coluna + 2} / span ${celula.tipo === 'marca' ? celula.span : 1}` }}
        >
          {celula.tipo === 'marca' ? (
            <>
              {celula.ciclo != null ? (
                <Text variant="meta" as="span" className="tabular-nums text-[var(--text-tertiary)]">
                  {`C${celula.ciclo}`}
                </Text>
              ) : null}
              <MarcaPequena marca={celula.marca} />
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CabecalhoDaColuna({ semanas }: { semanas: ColunaDaRegua[] }) {
  return (
    <div className="stack-xs px-3 pb-2">
      <div
        className="grid items-end gap-2"
        style={{ gridTemplateColumns: trilhaDasSemanas(semanas.length) }}
      >
        <span className="t-label t-label-uppercase text-[var(--text-tertiary)]">Série / quadro</span>
        {semanas.length > 0 ? (
          <span
            className="t-label t-label-uppercase text-center text-[var(--text-tertiary)]"
            style={{ gridColumn: `2 / span ${semanas.length}` }}
          >
            Semanas
          </span>
        ) : null}
      </div>
      {semanas.length > 0 ? (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: trilhaDasSemanas(semanas.length) }}
        >
          <span />
          {semanas.map(semana => {
            const inicioCurto = rotuloSemana(semana.inicio);
            const fimCurto = rotuloSemana(semana.fim);
            return (
              <span
                key={semana.inicio}
                title={`${inicioCurto} – ${fimCurto}`}
                className="t-meta whitespace-nowrap text-center tabular-nums text-[var(--text-secondary)]"
              >
                {inicioCurto}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function LegendaDaRegua() {
  return (
    <ul className="flex flex-wrap items-center gap-3">
      {LEGENDA.map(item => {
        const visual = MARCA_VISUAL[item.marca];
        const Icon = visual.Icon;
        return (
          <li key={item.marca} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex h-4 w-4 items-center justify-center rounded-[var(--radius-sm)]',
                visual.className,
              )}
              aria-hidden
            >
              {item.marca === 'reservada' || item.marca === 'no-prazo' ? (
                <span className="h-2.5 w-2.5 rounded-full border-2 border-current" />
              ) : (
                <Icon className="h-2.5 w-2.5" />
              )}
            </span>
            <Text variant="meta" as="span">{item.rotulo}</Text>
          </li>
        );
      })}
    </ul>
  );
}

type FiltroRegua = 'todas' | 'pendencias';

/** Conteúdo da régua em coluna única (sem moldura externa), usado no drawer de saúde e no disclosure. */
export function ReguaDeFrequenciaPainel({
  id,
  continuidade,
  onFrequenciaSalva,
}: {
  id?: string;
  continuidade: Continuidade<unknown> | null | undefined;
  onFrequenciaSalva?: (serieId: string) => void;
}) {
  const [filtro, setFiltro] = useState<FiltroRegua>('todas');
  const linhas = linhasDaRegua(continuidade);
  if (linhas.length === 0) return null;

  const semanas = colunasDaRegua(linhas);
  const pendentesCount = linhas.filter(temPendencia).length;
  const linhasVisiveis = filtro === 'pendencias' ? linhas.filter(temPendencia) : linhas;
  const listaOrdenada = ordemDaRegua(linhasVisiveis);

  return (
    <div id={id} className="stack-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filtrar séries por situação"
          className="inline-flex items-center gap-1 rounded-[var(--radius-input)] bg-[var(--surface-subtle)] p-1"
        >
          <button
            type="button"
            aria-pressed={filtro === 'todas'}
            onClick={() => setFiltro('todas')}
            className={cn(
              'inline-flex min-h-7 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              filtro === 'todas'
                ? 'border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            <Text variant="label" as="span" className="text-current">
              Todas
            </Text>
          </button>
          <button
            type="button"
            aria-pressed={filtro === 'pendencias'}
            onClick={() => setFiltro('pendencias')}
            className={cn(
              'inline-flex min-h-7 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              filtro === 'pendencias'
                ? 'border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            <Text variant="label" as="span" className="text-current">
              Só pendências
            </Text>
            {pendentesCount > 0 ? (
              <Badge variant="warning" className="px-1.5 py-0 tabular-nums">
                {pendentesCount}
              </Badge>
            ) : null}
          </button>
        </div>

        <LegendaDaRegua />
      </div>

      {listaOrdenada.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-[var(--surface-subtle)] px-4 py-6 text-center">
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            Nenhuma série com pendências neste período.
          </Text>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-0">
            <CabecalhoDaColuna semanas={semanas} />
            {listaOrdenada.map(({ linha, filha }) => (
              <LinhaDaColuna
                key={linha.chave}
                linha={linha}
                filha={filha}
                semanas={semanas}
                onFrequenciaSalva={onFrequenciaSalva}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Régua de frequência do Planejamento: uma linha por série/quadro/wave
 * acompanhada, com no ritmo, só com post-it, no prazo, abaixo ou pausa.
 *
 * No desktop o painel é a lista "Ritmo no período", em duas colunas.
 * Começa fechado e só abre no clique do título (ou em "Ajustar ritmo").
 * No celular (`compacto`) continua a faixa simples, dentro do disclosure da página.
 */
export function ReguaDeFrequencia({
  continuidade,
  className,
  onFrequenciaSalva,
  compacto = false,
}: ReguaDeFrequenciaProps) {
  const linhas = linhasDaRegua(continuidade);
  const [aberto, setAberto] = useState(false);
  const painelId = useId();

  useEffect(() => {
    if (compacto) return;
    const abrir = () => setAberto(true);
    window.addEventListener('criaki:abrir-ritmo', abrir);
    return () => window.removeEventListener('criaki:abrir-ritmo', abrir);
  }, [compacto]);

  if (linhas.length === 0) return null;

  if (compacto) {
    return (
      <div className={cn('stack-sm', className)} aria-label="Régua de frequência">
        {linhas.map(linha => (
          <LinhaRegua
            key={linha.chave}
            linha={linha}
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
        'w-full overflow-hidden rounded-[var(--radius-card)] border-[var(--border-subtle)] bg-[var(--bg-elevated)]',
        className,
      )}
      aria-label="Ritmo no período"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 rounded-[var(--radius-input)] text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          aria-expanded={aberto}
          aria-controls={aberto ? painelId : undefined}
          onClick={() => setAberto(atual => !atual)}
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform',
              !aberto && '-rotate-90',
            )}
            aria-hidden
          />
          <Text variant="sectionTitle" as="span">Ritmo no período</Text>
          {!aberto ? (
            <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
              {resumoDaRegua(linhas)}
            </Text>
          ) : null}
        </button>
      </div>

      {aberto ? (
        <div className="border-t border-[var(--border-subtle)] p-4">
          <ReguaDeFrequenciaPainel
            id={painelId}
            continuidade={continuidade}
            onFrequenciaSalva={onFrequenciaSalva}
          />
        </div>
      ) : null}
    </Surface>
  );
}
