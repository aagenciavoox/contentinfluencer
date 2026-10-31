import { ChevronRight } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { MoreMenu, type MoreMenuItem } from '../../../../components/ui/MoreMenu';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import {
  TIPO_AGRUPAMENTO_LABEL,
  plural,
  textoRoteirosIdeias,
} from '../../lib/serieAgrupamento';
import { textoTipoEOnde, type ItemLista } from '../../lib/seriesListaView';

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
    { label: 'Editar', onClick: () => acoes.onEdit(item.serie.id) },
    { label: item.serie.ativa ? 'Desativar' : 'Ativar', onClick: () => acoes.onToggleAtiva(item.serie.id) },
  ];
}

export function rotuloDosFilhos(item: Pick<ItemLista, 'tipo' | 'filhos'>): string {
  return item.tipo === 'familia'
    ? plural(item.filhos, 'série', 'séries')
    : plural(item.filhos, 'quadro', 'quadros');
}

/**
 * Card compacto de família, série ou quadro. A primeira linha tem cor, nome e menu;
 * descrição e números vêm abaixo; o rodapé diz o tipo e leva aos quadros.
 */
export function SerieCard({
  item,
  pilarNome,
  mostrarOnde = false,
  emAberto = false,
  onOpen,
  onOpenFilhos,
  onEdit,
  onToggleAtiva,
  onCriarFilho,
}: {
  item: ItemLista;
  pilarNome: string | null;
  /** Lista plana: diz de qual agrupamento o card faz parte. */
  mostrarOnde?: boolean;
  emAberto?: boolean;
  onOpen: (serieId: string) => void;
  onOpenFilhos: (serieId: string) => void;
  onEdit: (serieId: string) => void;
  onToggleAtiva: (serieId: string) => void;
  /** Criar o próximo nível dentro deste: série na família, quadro na série. */
  onCriarFilho?: (item: Pick<ItemLista, 'serie' | 'tipo'>) => void;
}) {
  const { serie } = item;
  const nome = serie.name.trim() || 'Sem nome';
  const descricao = serie.notes?.trim() || '';
  const tipo = mostrarOnde ? textoTipoEOnde(item, TIPO_AGRUPAMENTO_LABEL) : TIPO_AGRUPAMENTO_LABEL[item.tipo];

  return (
    <article
      className={cn(
        'ds-card ds-card-interactive group relative flex min-w-0 flex-col text-left',
        !serie.ativa && 'is-dimmed',
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(serie.id)}
        className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        aria-label={`Abrir ${nome}`}
      />
      <div className="pointer-events-none relative z-[1] flex min-w-0 flex-1 flex-col gap-2 p-4 pr-12">
        <span className="flex min-w-0 items-start gap-2.5">
          <span
            aria-hidden
            className="entity-color-dot mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: serie.cor || 'var(--text-tertiary)' }}
          />
          <Text variant="itemTitle" as="span" className="min-w-0 break-words leading-snug">{nome}</Text>
        </span>
        {!serie.ativa || emAberto ? (
          <span className="flex flex-wrap items-center gap-1">
            {!serie.ativa ? <Badge variant="neutral">Inativa</Badge> : null}
            {emAberto ? <Badge variant="neutral">Em aberto</Badge> : null}
          </span>
        ) : null}
        {descricao ? <Text variant="secondary" className="line-clamp-2">{descricao}</Text> : null}
        <Text variant="meta" as="p">{textoRoteirosIdeias(item.contagem)}</Text>
      </div>
      <div className="absolute right-2 top-2 z-[2]">
        <MoreMenu
          size="sm"
          items={itensDoMenuDaSerie(item, { onEdit, onToggleAtiva, onCriarFilho })}
          label={`Mais opções de ${nome}`}
        />
      </div>
      <div className="pointer-events-none relative z-[1] flex min-h-11 items-center justify-between gap-3 border-t border-[var(--border-color)] px-4 py-2">
        <span className="flex min-w-0 items-center gap-2">
          <Text variant="meta" as="span" className="truncate text-[var(--text-secondary)]">{tipo}</Text>
          {item.filhos > 0 ? (
            <button
              type="button"
              onClick={() => onOpenFilhos(serie.id)}
              className="pointer-events-auto relative z-[2] inline-flex min-h-8 shrink-0 items-center gap-0.5 rounded-[var(--radius-sm)] t-button text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11"
            >
              {rotuloDosFilhos(item)}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </span>
        {pilarNome ? <Text variant="meta" as="span" className="min-w-0 truncate">{pilarNome}</Text> : null}
      </div>
    </article>
  );
}
