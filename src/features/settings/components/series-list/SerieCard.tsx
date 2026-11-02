import { Layers } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { MoreMenu, type MoreMenuItem } from '../../../../components/ui/MoreMenu';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import {
  TIPO_AGRUPAMENTO_LABEL,
  plural,
} from '../../lib/serieAgrupamento';
import { type ItemLista } from '../../lib/seriesListaView';

/** Menu do agrupamento, igual no card, na linha e no cabeçalho da família. */
export function itensDoMenuDaSerie(
  item: Pick<ItemLista, 'serie' | 'tipo'>,
  acoes: {
    onEdit: (serieId: string) => void;
    onToggleAtiva: (serieId: string) => void;
    onCriarFilho?: (item: Pick<ItemLista, 'serie' | 'tipo'>) => void;
  },
): MoreMenuItem[] {
  const criarFilho = acoes.onCriarFilho && item.tipo !== 'quadro'
    ? [{
      label: item.tipo === 'familia' ? 'Criar série nesta família' : 'Criar quadro',
      onClick: () => acoes.onCriarFilho?.(item),
    }]
    : [];
  return [
    ...criarFilho,
    { label: 'Configurar', onClick: () => acoes.onEdit(item.serie.id) },
    { label: item.serie.ativa ? 'Arquivar' : 'Reativar', onClick: () => acoes.onToggleAtiva(item.serie.id) },
  ];
}

export function rotuloDosFilhos(item: Pick<ItemLista, 'tipo' | 'filhos'>): string {
  return item.tipo === 'familia'
    ? plural(item.filhos, 'série', 'séries')
    : plural(item.filhos, 'quadro', 'quadros');
}

/**
 * Card de série com barra de cor, jargão e navegação ao clicar em qualquer lugar.
 */
export function SerieCard({
  item,
  temporadasCount = 0,
  emAberto = false,
  onOpen,
  onOpenFilhos,
}: {
  item: ItemLista;
  pilarNome?: string | null;
  temporadasCount?: number;
  mostrarOnde?: boolean;
  emAberto?: boolean;
  onOpen: (serieId: string) => void;
  onOpenFilhos: (serieId: string) => void;
  onEdit?: (serieId: string) => void;
  onToggleAtiva?: (serieId: string) => void;
  onCriarFilho?: (item: Pick<ItemLista, 'serie' | 'tipo'>) => void;
}) {
  const { serie } = item;
  const nome = serie.name.trim() || 'Sem nome';
  const descricao = serie.notes?.trim() || '';
  const tipoLabel = TIPO_AGRUPAMENTO_LABEL[item.tipo] || 'Série';

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(serie.id)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(serie.id);
        }
      }}
      aria-label={`Abrir ${nome}`}
      style={{
        '--card-accent': serie.cor || 'var(--brand-accent)',
      } as React.CSSProperties}
      className={cn(
        'ds-card ds-card-interactive group relative flex min-w-0 flex-col text-left overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[color-mix(in_srgb,var(--card-accent)_40%,var(--border-color))] cursor-pointer select-none focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        !serie.ativa && 'is-dimmed',
      )}
    >
      {/* Faixa superior com a cor da série */}
      <div
        className="h-1.5 w-full shrink-0"
        style={{ backgroundColor: serie.cor || 'var(--brand-accent)' }}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 sm:p-6">
        {/* Topo do card: badge do tipo e contagem de conteúdos */}
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="neutral"
            className="uppercase"
            style={{
              backgroundColor: `${serie.cor || '#e11d48'}18`,
              color: serie.cor || 'var(--text-primary)',
            }}
          >
            {tipoLabel.toUpperCase()}
          </Badge>
          <Text variant="meta" as="span">
            {item.contagem.conteudos} conteúdo(s)
          </Text>
        </div>

        {/* Título da série */}
        <Text variant="itemTitle" as="h3" className="leading-snug">
          {nome}
        </Text>

        {/* Jargão / Bordão entre aspas e com a cor da série */}
        {serie.bordao ? (
          <Text
            variant="body"
            as="p"
            className="italic -mt-1"
            style={{ color: serie.cor || 'var(--brand-accent)' }}
          >
            "{serie.bordao}"
          </Text>
        ) : null}

        {/* Descrição */}
        {descricao ? (
          <Text variant="secondary" as="p" className="line-clamp-2 leading-relaxed">
            {descricao}
          </Text>
        ) : null}

        {/* Badges de metadados (temporadas e frequência) */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {temporadasCount > 0 ? (
            <Badge variant="neutral">
              {temporadasCount} temporada(s)
            </Badge>
          ) : null}
          {serie.frequenciaRecomendada ? (
            <Badge variant="neutral">
              {serie.frequenciaRecomendada}
            </Badge>
          ) : null}
          {emAberto ? <Badge variant="neutral">Em aberto</Badge> : null}
        </div>

        {/* Linha divisória sutil */}
        <div className="my-1 border-t border-[var(--border-color)]" />

        {/* Rodapé com status */}
        <div className="flex items-center justify-between pt-1">
          <Text variant="meta" as="span" className="flex items-center gap-1.5">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                serie.ativa ? 'bg-emerald-500' : 'bg-zinc-400',
              )}
            />
            {serie.ativa ? 'Ativa' : 'Inativa'}
          </Text>

          {item.filhos > 0 ? (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onOpenFilhos(serie.id);
              }}
              className="rounded-[var(--radius-sm)] p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              title={rotuloDosFilhos(item)}
              aria-label={rotuloDosFilhos(item)}
            >
              <Layers className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
