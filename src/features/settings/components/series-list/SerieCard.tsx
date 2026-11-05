import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ExternalLink, Layers } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  FLOATING_MENU_HIDDEN_STYLE,
  FLOATING_MENU_Z_INDEX,
  useAnchoredPosition,
} from '../../../../components/ui/anchoredPosition';
import { Badge } from '../../../../components/ui/Badge';
import { type MoreMenuItem } from '../../../../components/ui/MoreMenu';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import {
  TIPO_AGRUPAMENTO_LABEL,
  plural,
} from '../../lib/serieAgrupamento';
import { type ItemLista } from '../../lib/seriesListaView';
import { podeSerRascunho, ROTULO_STATUS, statusDaSerie, type StatusSerie } from '../../lib/statusSerie';

/** Menu do agrupamento, igual no card, na linha e no cabeçalho da família. */
export function itensDoMenuDaSerie(
  item: Pick<ItemLista, 'serie' | 'tipo'>,
  acoes: {
    onEdit: (serieId: string) => void;
    onToggleAtiva: (serieId: string) => void;
    onMudarStatus?: (serieId: string, status: StatusSerie) => void;
    onCriarFilho?: (item: Pick<ItemLista, 'serie' | 'tipo'>) => void;
  },
): MoreMenuItem[] {
  const status = statusDaSerie(item.serie);
  const rotuloAlternar = status === 'ativa' ? 'Arquivar' : status === 'rascunho' ? 'Ativar' : 'Reativar';
  const voltarParaRascunho = acoes.onMudarStatus && status === 'ativa' && podeSerRascunho(item.serie)
    ? [{ label: 'Voltar para rascunho', onClick: () => acoes.onMudarStatus?.(item.serie.id, 'rascunho') }]
    : [];
  const criarFilho = acoes.onCriarFilho && item.tipo !== 'quadro'
    ? [{
      label: item.tipo === 'familia' ? 'Criar série nesta família' : 'Criar quadro',
      onClick: () => acoes.onCriarFilho?.(item),
    }]
    : [];
  return [
    ...criarFilho,
    { label: 'Configurar', onClick: () => acoes.onEdit(item.serie.id) },
    { label: rotuloAlternar, onClick: () => acoes.onToggleAtiva(item.serie.id) },
    ...voltarParaRascunho,
  ];
}

export function rotuloDosFilhos(item: Pick<ItemLista, 'tipo' | 'filhos'>): string {
  return item.tipo === 'familia'
    ? plural(item.filhos, 'série', 'séries')
    : plural(item.filhos, 'quadro', 'quadros');
}

function normalizarCapaUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) return trimmed;
  return null;
}

/**
 * Card de série compacto com popover flutuante estável (sem scroll e sem saltos de animação).
 */
export function SerieCard({
  item,
  pilarNome,
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
  const tipoLabel = TIPO_AGRUPAMENTO_LABEL[item.tipo] || 'Série';

  const [expandido, setExpandido] = useState(false);
  const [imgError, setImgError] = useState(false);

  const cardRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  // Popover ancorado ao card, sem forçar matchWidth para manter tamanho fixo e confortável
  const position = useAnchoredPosition(expandido, cardRef, popoverRef, {
    align: 'start',
    matchWidth: false,
  });

  // Fecha o popover ao clicar fora ou apertar Escape
  useEffect(() => {
    if (!expandido) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && (cardRef.current?.contains(target) || popoverRef.current?.contains(target))) {
        return;
      }
      setExpandido(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandido(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandido]);

  const capa = normalizarCapaUrl(serie.capaUrl);
  const temCapa = Boolean(capa && !imgError);

  return (
    <>
      <article
        ref={cardRef}
        role="button"
        tabIndex={0}
        onClick={() => onOpen(serie.id)}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
            e.preventDefault();
            onOpen(serie.id);
          }
        }}
        aria-label={`Abrir ${nome}`}
        style={{
          '--card-accent': serie.cor || 'var(--brand-accent)',
        } as React.CSSProperties}
        className={cn(
          'ds-card ds-card-interactive group relative flex min-w-0 flex-col text-left overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[color-mix(in_srgb,var(--card-accent)_40%,var(--border-color))] cursor-pointer select-none focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] w-full',
          !serie.ativa && 'is-dimmed',
          expandido && 'ring-2 ring-[var(--focus-ring-color,var(--brand-accent))]',
        )}
      >
        {/* Imagem de capa (se houver) ou faixa superior com a cor da série */}
        {temCapa ? (
          <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-[var(--bg-subtle)] shrink-0">
            <img
              src={capa!}
              alt={nome}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div
              className="absolute inset-x-0 bottom-0 h-1"
              style={{ backgroundColor: serie.cor || 'var(--brand-accent)' }}
            />
          </div>
        ) : (
          <div
            className="h-1.5 w-full shrink-0"
            style={{ backgroundColor: serie.cor || 'var(--brand-accent)' }}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3.5 sm:p-4">
          {/* Topo do card base: tipo e status ativo */}
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

            <Text variant="meta" as="span" className="flex items-center gap-1.5 shrink-0">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  serie.ativa ? 'bg-emerald-500' : statusDaSerie(serie) === 'rascunho' ? 'bg-amber-400' : 'bg-zinc-400',
                )}
                aria-hidden="true"
              />
              <span>{ROTULO_STATUS[statusDaSerie(serie)]}</span>
            </Text>
          </div>

          {/* Título da série */}
          <Text variant="itemTitle" as="h3" className="leading-snug line-clamp-2">
            {nome}
          </Text>

          {/* Seção com a setinha de detalhes (não abre o card, abre o popover de detalhes) */}
          <div className="mt-auto pt-2 border-t border-[var(--border-color)]">
            <button
              ref={triggerRef}
              type="button"
              onClick={e => {
                e.stopPropagation();
                setExpandido(prev => !prev);
              }}
              aria-expanded={expandido}
              aria-controls={popoverId}
              aria-haspopup="dialog"
              aria-label={expandido ? `Recolher detalhes de ${nome}` : `Ver detalhes de ${nome}`}
              className={cn(
                'flex w-full items-center justify-between rounded-[var(--radius-sm)] py-1 px-1 -mx-1 t-label transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                expandido
                  ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
              )}
            >
              <Text variant="label" as="span">Detalhes</Text>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200 text-[var(--text-tertiary)]',
                  expandido && 'rotate-180 text-[var(--text-primary)]',
                )}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </article>

      {/* Popover flutuante via portal (tamanho fixo, sem scroll e sem saltos de animação) */}
      {expandido && typeof document !== 'undefined'
        ? createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            aria-label={`Detalhes de ${nome}`}
            data-placement={position?.placement}
            style={{
              ...(position?.style ?? FLOATING_MENU_HIDDEN_STYLE),
              maxHeight: 'none',
            }}
            onClick={e => e.stopPropagation()}
            className={cn(
              'fixed w-[300px] sm:w-[330px] max-w-[calc(100vw-24px)] rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3.5 shadow-xl select-text',
              FLOATING_MENU_Z_INDEX,
            )}
          >
            {/* Cabeçalho do popover com nome e tipo */}
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: serie.cor || 'var(--brand-accent)' }}
                  aria-hidden="true"
                />
                <Text variant="itemTitle" as="h4" className="truncate">
                  {nome}
                </Text>
              </div>

              <Badge
                variant="neutral"
                className="uppercase shrink-0"
                style={{
                  backgroundColor: `${serie.cor || '#e11d48'}18`,
                  color: serie.cor || 'var(--text-primary)',
                }}
              >
                {tipoLabel}
              </Badge>
            </div>

            {/* Metadados detalhados: conteúdos, frequência, quadros, temporadas, família e pilar */}
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
              <div>
                <Text variant="meta" as="dt" className="text-[var(--text-tertiary)]">Conteúdos</Text>
                <Text variant="label" as="dd" className="text-[var(--text-primary)]">
                  {item.contagem.conteudos > 0 ? (
                    <span>
                      {item.contagem.conteudos}{' '}
                      <span className="text-[var(--text-tertiary)] font-normal">
                        ({item.contagem.roteiros} rot. · {item.contagem.ideias} id.)
                      </span>
                    </span>
                  ) : (
                    'Nenhum'
                  )}
                </Text>
              </div>

              <div>
                <Text variant="meta" as="dt" className="text-[var(--text-tertiary)]">Frequência</Text>
                <Text variant="label" as="dd"
                  className="text-[var(--text-primary)] truncate"
                  title={serie.frequenciaRecomendada?.trim() || 'Sob demanda'}
                >
                  {serie.frequenciaRecomendada?.trim() || 'Sob demanda'}
                </Text>
              </div>

              <div>
                <Text variant="meta" as="dt" className="text-[var(--text-tertiary)]">Quadros</Text>
                <Text variant="label" as="dd" className="text-[var(--text-primary)]">
                  {item.tipo === 'quadro'
                    ? '—'
                    : item.tipo === 'familia'
                      ? plural(item.filhos, 'série', 'séries')
                      : item.filhos > 0
                        ? plural(item.filhos, 'quadro', 'quadros')
                        : 'Nenhum'}
                </Text>
              </div>

              <div>
                <Text variant="meta" as="dt" className="text-[var(--text-tertiary)]">Temporadas</Text>
                <Text variant="label" as="dd" className="text-[var(--text-primary)]">
                  {temporadasCount > 0
                    ? plural(temporadasCount, 'temporada', 'temporadas')
                    : serie.usaTemporadas
                      ? 'Habilitadas (0)'
                      : 'Nenhuma'}
                  {emAberto ? (
                    <span className="ml-1 text-[var(--text-tertiary)] font-normal">
                      (em aberto)
                    </span>
                  ) : null}
                </Text>
              </div>

              <div className="col-span-2">
                <Text variant="meta" as="dt" className="text-[var(--text-tertiary)]">Família</Text>
                <Text variant="label" as="dd"
                  className="text-[var(--text-primary)] truncate"
                  title={
                    item.tipo === 'familia'
                      ? 'É a própria família'
                      : item.pai
                        ? item.pai.name.trim() || 'Sem nome'
                        : 'Sem família (independente)'
                  }
                >
                  {item.tipo === 'familia'
                    ? 'É a própria família'
                    : item.pai
                      ? item.pai.name.trim() || 'Sem nome'
                      : 'Sem família (independente)'}
                </Text>
              </div>

              {pilarNome ? (
                <div className="col-span-2">
                  <Text variant="meta" as="dt" className="text-[var(--text-tertiary)]">Pilar</Text>
                  <Text variant="label" as="dd" className="text-[var(--text-primary)] truncate" title={pilarNome}>
                    {pilarNome}
                  </Text>
                </div>
              ) : null}
            </dl>

            {/* Rodapé do popover com ações rápidas */}
            <div className="mt-2.5 pt-2 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
              {item.filhos > 0 ? (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setExpandido(false);
                    onOpenFilhos(serie.id);
                  }}
                  className="flex items-center gap-1.5 t-label text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Abrir {rotuloDosFilhos(item)}</span>
                </button>
              ) : <span />}

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setExpandido(false);
                  onOpen(serie.id);
                }}
                className="flex items-center gap-1 t-label text-[var(--brand-accent)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)] ml-auto"
              >
                <span>Ver página</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
