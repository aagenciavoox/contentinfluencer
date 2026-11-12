import { Badge } from '../../../../components/ui/Badge';
import { MoreMenu } from '../../../../components/ui/MoreMenu';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import {
  TIPO_AGRUPAMENTO_LABEL,
  textoRoteirosIdeias,
} from '../../lib/serieAgrupamento';
import { textoTipoEOnde, type ItemLista } from '../../lib/seriesListaView';
import type { StatusSerie } from '../../lib/statusSerie';
import { itensDoMenuDaSerie } from './SerieCard';

type AcoesDaSerie = {
  onOpen: (serieId: string) => void;
  onEdit: (serieId: string) => void;
  onToggleAtiva: (serieId: string) => void;
  onMudarStatus?: (serieId: string, status: StatusSerie) => void;
  onCriarFilho?: (item: Pick<ItemLista, 'serie' | 'tipo'>) => void;
  onMoverParaFamilia?: (serieId: string) => void;
};

/** Linha da vista em lista: nome, tipo e onde está, números, pilar e menu. */
export function SerieLinha({
  item,
  pilarNome,
  recuo,
  emAberto = false,
  acoes,
}: {
  item: ItemLista;
  pilarNome: string | null;
  /** Mostra a árvore com recuo; na busca, a linha diz onde está. */
  recuo: boolean;
  emAberto?: boolean;
  acoes: AcoesDaSerie;
}) {
  const nome = item.serie.name.trim() || 'Sem nome';
  const tipo = recuo ? TIPO_AGRUPAMENTO_LABEL[item.tipo] : textoTipoEOnde(item, TIPO_AGRUPAMENTO_LABEL);
  return (
    <li
      className={cn(
        'relative flex min-h-14 items-center gap-3 border-b border-[var(--border-color)] px-3 py-2.5 last:border-b-0',
        !item.serie.ativa && 'bg-[var(--surface-subtle)]',
      )}
    >
      <button
        type="button"
        onClick={() => acoes.onOpen(item.serie.id)}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] hover:bg-[var(--bg-hover)]"
        aria-label={`Abrir ${nome}`}
      />
      <span
        className="pointer-events-none relative z-[1] flex min-w-0 flex-1 items-center gap-2.5"
        style={recuo && item.profundidade > 0 ? { paddingLeft: Math.min(item.profundidade, 3) * 20 } : undefined}
      >
        <span
          aria-hidden
          className="entity-color-dot h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: item.serie.cor || 'var(--text-tertiary)' }}
        />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <Text variant="itemTitle" as="span" className="min-w-0 break-words">{nome}</Text>
            {!item.serie.ativa ? <Badge variant="neutral">Inativa</Badge> : null}
            {emAberto ? <Badge variant="neutral">Em aberto</Badge> : null}
          </span>
          <Text variant="meta" as="span" className="block truncate md:hidden">
            {[tipo, textoRoteirosIdeias(item.contagem)].join(' · ')}
          </Text>
        </span>
      </span>
      <Text variant="meta" as="span" className="pointer-events-none relative z-[1] hidden w-48 shrink-0 truncate md:block">{tipo}</Text>
      <Text variant="meta" as="span" className="pointer-events-none relative z-[1] hidden w-40 shrink-0 truncate md:block">
        {textoRoteirosIdeias(item.contagem)}
      </Text>
      <Text variant="meta" as="span" className="pointer-events-none relative z-[1] hidden w-28 shrink-0 truncate lg:block">
        {pilarNome ?? '—'}
      </Text>
      <span className="relative z-[2] shrink-0">
        <MoreMenu size="sm" items={itensDoMenuDaSerie(item, acoes)} label={`Mais opções de ${nome}`} />
      </span>
    </li>
  );
}
