import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Circle, Info, Minus, Pause, Pencil } from 'lucide-react';
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
  type CelulaDaRegua,
  type ColunaDaRegua,
  type LinhaDaRegua,
  type LinhaNaRegua,
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
  buraco: {
    Icon: Minus,
    className: 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]',
  },
  pausada: {
    Icon: Pause,
    className: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)]',
  },
};

const LEGENDA: { marca: MarcaDaJanela; rotulo: string }[] = [
  { marca: 'atendida', rotulo: 'Meta atingida' },
  { marca: 'reservada', rotulo: 'Atenção' },
  { marca: 'buraco', rotulo: 'Sem registro' },
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

function MarcaPequena({ marca }: { marca: MarcaRegua | null }) {
  const titulo = marca ? tituloDaMarca(marca) : 'Sem registro';
  if (marca?.marca === 'reservada') {
    return (
      <span title={titulo} aria-label={titulo} className="inline-flex h-6 w-6 items-center justify-center">
        <span className="h-4 w-4 rounded-full border-2 border-[var(--accent-orange)]" aria-hidden />
      </span>
    );
  }
  const visual = marca ? MARCA_VISUAL[marca.marca] : MARCA_VISUAL.buraco;
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

type MarcaNaColuna = {
  key: string;
  marca: MarcaRegua | null;
  ciclo: number | null;
  /** Semana sem ciclo: fica em branco, para C1 e C2 não virarem traço. */
  emBranco: boolean;
};

/** Uma marca por semana. Ciclo de 14 dias ocupa só a coluna em que começa, com o rótulo C1, C2. */
function marcasNasColunas(celulas: CelulaDaRegua[], total: number): MarcaNaColuna[] {
  const emCiclos = celulas.some(celula => celula.tipo === 'marca' && celula.ciclo != null);
  const colunas: MarcaNaColuna[] = Array.from({ length: total }, (_, indice) => ({
    key: `semana-${indice}`,
    marca: null,
    ciclo: null,
    emBranco: emCiclos,
  }));
  for (const celula of celulas) {
    if (celula.tipo !== 'marca') continue;
    const slot = colunas[celula.coluna];
    if (!slot) continue;
    slot.key = `${celula.marca.inicio}:${celula.marca.fim}`;
    slot.marca = celula.marca;
    slot.ciclo = celula.ciclo;
    slot.emBranco = false;
  }
  return colunas;
}

/** Mantém o quadro debaixo da série ao partir a lista em duas colunas. */
function colunasDaLista(ordem: readonly LinhaNaRegua[]): LinhaNaRegua[][] {
  const grupos: LinhaNaRegua[][] = [];
  for (const item of ordem) {
    if (!item.filha || grupos.length === 0) grupos.push([item]);
    else grupos[grupos.length - 1].push(item);
  }
  const alvo = Math.ceil(ordem.length / 2);
  const esquerda: LinhaNaRegua[] = [];
  const direita: LinhaNaRegua[] = [];
  for (const grupo of grupos) {
    if (direita.length === 0 && esquerda.length < alvo) esquerda.push(...grupo);
    else direita.push(...grupo);
  }
  return direita.length > 0 ? [esquerda, direita] : [esquerda];
}

function trilhaDasSemanas(total: number): string {
  if (total <= 0) return 'minmax(0,1fr)';
  return `minmax(0,1fr) repeat(${total}, 1.75rem)`;
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
  const marcas = marcasNasColunas(celulas, semanas.length);

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
      ) : marcas.map(item => (
        <div key={item.key} className="flex items-end justify-center">
          {item.emBranco ? null : item.ciclo != null ? (
            <span className="inline-flex flex-col items-center">
              <span className="t-meta leading-none">C{item.ciclo}</span>
              <MarcaPequena marca={item.marca} />
            </span>
          ) : (
            <MarcaPequena marca={item.marca} />
          )}
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
          {semanas.map((semana, indice) => (
            <span key={semana.inicio} className="t-meta text-center">{indice + 1}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Régua de frequência do Planejamento: uma linha por série/quadro/wave
 * acompanhada, com meta atingida, atenção, sem registro ou pausa.
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

  const semanas = colunasDaRegua(linhas);
  const listas = colunasDaLista(ordemDaRegua(linhas));

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
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
        <button
          type="button"
          className="flex min-w-0 items-start gap-2 rounded-[var(--radius-input)] text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          aria-expanded={aberto}
          aria-controls={aberto ? painelId : undefined}
          onClick={() => setAberto(atual => !atual)}
        >
          <ChevronDown
            className={cn(
              'mt-1 h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform',
              !aberto && '-rotate-90',
            )}
            aria-hidden
          />
          <span className="stack-xs">
            <Text variant="sectionTitle" as="span">Ritmo no período</Text>
            <Text variant="meta" as="span">
              {aberto
                ? 'Acompanhe as semanas e ajuste a frequência das suas séries.'
                : resumoDaRegua(linhas)}
            </Text>
          </span>
        </button>

        {aberto ? (
          <ul className="flex flex-wrap items-center gap-3">
            {LEGENDA.map(item => {
              const visual = MARCA_VISUAL[item.marca];
              const Icon = visual.Icon;
              return (
                <li key={item.marca} className="inline-flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-[var(--radius-input)]',
                      visual.className,
                    )}
                    aria-hidden
                  >
                    {item.marca === 'reservada' ? (
                      <span className="h-3 w-3 rounded-full border-2 border-current" />
                    ) : (
                      <Icon className="h-3 w-3" />
                    )}
                  </span>
                  <Text variant="meta" as="span">{item.rotulo}</Text>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {aberto ? (
        <div id={painelId}>
          <div className={cn('grid items-start gap-4 px-3', listas.length > 1 && 'lg:grid-cols-2')}>
            {listas.map((lista, indice) => (
              <div key={lista[0]?.linha.chave ?? indice} className="min-w-0">
                <CabecalhoDaColuna semanas={semanas} />
                {lista.map(({ linha, filha }) => (
                  <LinhaDaColuna
                    key={linha.chave}
                    linha={linha}
                    filha={filha}
                    semanas={semanas}
                    onFrequenciaSalva={onFrequenciaSalva}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 py-3">
            <Info className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
            <Text variant="meta" as="p">
              Cada semana é avaliada separadamente. Metas de 14 dias são acompanhadas por ciclo.
            </Text>
          </div>
        </div>
      ) : null}
    </Surface>
  );
}
