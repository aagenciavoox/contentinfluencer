import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  FLOATING_MENU_HIDDEN_STYLE,
  FLOATING_MENU_Z_INDEX,
  useAnchoredPosition,
} from '../../../../components/ui/anchoredPosition';
import { Badge } from '../../../../components/ui/Badge';
import { MoreMenu, type MoreMenuItem } from '../../../../components/ui/MoreMenu';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import type { Platform } from '../../../../lib/database';
import { cn } from '../../../../lib/utils';
import { REDE_ROTULO, redeBaseDoFiltro, redeDaConta } from '../../../contas/lib/contas';
import { fraseDaFrequencia } from '../../../editorial/lib/metaDaOnda';
import {
  TIPO_AGRUPAMENTO_LABEL,
  plural,
} from '../../lib/serieAgrupamento';
import { etiquetaDoCard, type ItemLista } from '../../lib/seriesListaView';
import { podeSerRascunho, ROTULO_STATUS, statusDaSerie, type StatusSerie } from '../../lib/statusSerie';
import { useAbrirRitmoDaSerie } from '../SerieRitmoDrawer';

export const ARRASTO_SERIE = 'application/x-criaki-serie';

/** Menu do agrupamento, igual no card, na linha e no cabeçalho da família. */
export function itensDoMenuDaSerie(
  item: Pick<ItemLista, 'serie' | 'tipo'>,
  acoes: {
    onEdit: (serieId: string) => void;
    onEditRitmo?: (serieId: string) => void;
    onToggleAtiva: (serieId: string) => void;
    onMudarStatus?: (serieId: string, status: StatusSerie) => void;
    onCriarFilho?: (item: Pick<ItemLista, 'serie' | 'tipo'>) => void;
    onMoverParaFamilia?: (serieId: string) => void;
  },
): MoreMenuItem[] {
  const status = statusDaSerie(item.serie);
  const rotuloAlternar = status === 'ativa' ? 'Arquivar' : status === 'rascunho' ? 'Ativar' : 'Reativar';
  const editarRitmo = acoes.onEditRitmo && item.tipo === 'serie'
    ? [{ label: 'Editar ritmo', onClick: () => acoes.onEditRitmo?.(item.serie.id) }]
    : [];
  const voltarParaRascunho = acoes.onMudarStatus && status === 'ativa' && podeSerRascunho(item.serie)
    ? [{ label: 'Voltar para rascunho', onClick: () => acoes.onMudarStatus?.(item.serie.id, 'rascunho') }]
    : [];
  const criarFilho = acoes.onCriarFilho && item.tipo !== 'quadro'
    ? [{
      label: item.tipo === 'familia' ? 'Criar série nesta família' : 'Criar quadro',
      onClick: () => acoes.onCriarFilho?.(item),
    }]
    : [];
  const mover = acoes.onMoverParaFamilia && item.tipo === 'serie'
    ? [{
      label: item.serie.parentId ? 'Mudar de família' : 'Mover para família',
      onClick: () => acoes.onMoverParaFamilia?.(item.serie.id),
    }]
    : [];
  return [
    ...editarRitmo,
    ...criarFilho,
    ...mover,
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

function resumoDeRitmo(item: Pick<ItemLista, 'tipo' | 'serie'>): string | null {
  if (item.tipo === 'familia') return null;
  if (item.tipo === 'quadro') return 'Sob demanda';
  const recomendada = item.serie.frequenciaRecomendada?.trim();
  if (recomendada && recomendada.toLowerCase() !== 'sob demanda') return recomendada;
  if (item.serie.frequenciaVezes && item.serie.frequenciaVezes > 0 && item.serie.frequenciaUnidade) {
    return fraseDaFrequencia(item.serie.frequenciaVezes, item.serie.frequenciaUnidade) ?? 'Sem ritmo';
  }
  return 'Sem ritmo';
}

function resumoDeRedes(serie: ItemLista['serie'], platforms: readonly Platform[]): string | null {
  const nomes = new Set<string>();
  for (const destino of serie.focoRedes ?? []) {
    const base = redeBaseDoFiltro(destino);
    const label = REDE_ROTULO[base];
    if (label) nomes.add(label);
  }
  if (nomes.size === 0 && serie.plataformas.length > 0) {
    const porId = new Map(platforms.map(platform => [platform.id, platform]));
    for (const item of serie.plataformas) {
      const conta = porId.get(item.platformId);
      if (!conta) continue;
      const rede = redeDaConta(conta);
      nomes.add(rede ? REDE_ROTULO[rede] : conta.nome);
    }
  }
  const lista = [...nomes];
  if (lista.length === 0) return null;
  if (lista.length <= 2) return lista.join(', ');
  return `${lista[0]}, ${lista[1]} +${lista.length - 2}`;
}

type SerieCardProps = {
  item: ItemLista;
  pilarNome?: string | null;
  temporadasCount?: number;
  /** Waves acompanhadas com meta própria: saem da conta da série. */
  ondasComRitmoProprio?: number;
  mostrarOnde?: boolean;
  emAberto?: boolean;
  onOpen: (serieId: string) => void;
  onOpenFilhos: (serieId: string) => void;
  onEdit?: (serieId: string) => void;
  onEditRitmo?: (serieId: string) => void;
  onToggleAtiva?: (serieId: string) => void;
  onMudarStatus?: (serieId: string, status: StatusSerie) => void;
  onCriarFilho?: (item: Pick<ItemLista, 'serie' | 'tipo'>) => void;
  onMoverParaFamilia?: (serieId: string) => void;
  /** No celular o arrasto atrapalha a rolagem; lá a mudança fica no menu. */
  arrastavel?: boolean;
  /** Preserva o card mobile isolado da versão desktop V2. */
  celular?: boolean;
};

const ROTULO_ACAO_DIRETA: Record<ItemLista['tipo'], string> = {
  serie: 'Abrir série',
  familia: 'Abrir família',
  quadro: 'Abrir quadro',
};

/**
 * Card de série, família e quadro.
 * Desktop usa hierarquia limpa em 3 linhas com acesso direto em 1 clique.
 * Mobile mantém o layout atual isolado.
 */
export function SerieCard(props: SerieCardProps) {
  if (props.celular) {
    return <SerieCardMobile {...props} />;
  }
  return <SerieCardDesktop {...props} />;
}

/**
 * Card Desktop enxuto em 3 linhas:
 * 1. Ponto de cor + título + badge de status (só quando inativa/rascunho) + menu ⋯
 * 2. Pilar + resumo de ritmo (`1× por semana` ou `Sem ritmo`)
 * 3. Resumo conciso de redes e roteiros/quadros
 */
function SerieCardDesktop({
  item,
  pilarNome,
  onOpen,
  onOpenFilhos,
  onEdit,
  onEditRitmo,
  onToggleAtiva,
  onMudarStatus,
  onCriarFilho,
  onMoverParaFamilia,
  arrastavel = false,
}: SerieCardProps) {
  const { state } = useAppContext();
  const abrirRitmoContexto = useAbrirRitmoDaSerie();
  const onEditRitmoEfetivo = onEditRitmo ?? abrirRitmoContexto ?? undefined;

  const { serie } = item;
  const nome = serie.name.trim() || 'Sem nome';
  const status = statusDaSerie(serie);
  const ritmo = resumoDeRitmo(item);
  const redes = useMemo(() => resumoDeRedes(serie, state.platforms), [serie, state.platforms]);
  const rotuloAcao = ROTULO_ACAO_DIRETA[item.tipo];

  const [imgError, setImgError] = useState(false);
  const capa = normalizarCapaUrl(serie.capaUrl);
  const temCapa = Boolean(capa && !imgError);

  const corSerie = serie.cor || 'var(--brand-accent)';
  const menuItems = onEdit && onToggleAtiva
    ? itensDoMenuDaSerie(item, {
      onEdit,
      onEditRitmo: onEditRitmoEfetivo,
      onToggleAtiva,
      onMudarStatus,
      onCriarFilho,
      onMoverParaFamilia,
    })
    : [];

  const linha2Partes = [pilarNome || null, ritmo].filter((parte): parte is string => Boolean(parte));
  const linha2Texto = linha2Partes.length > 0 ? linha2Partes.join(' · ') : 'Sem pilar';

  const roteirosTexto = plural(item.contagem.roteiros, 'roteiro', 'roteiros');
  const filhosTexto = item.filhos > 0 ? rotuloDosFilhos(item) : null;
  const resumoLinha3 = [redes, roteirosTexto, item.tipo !== 'serie' ? filhosTexto : null]
    .filter((parte): parte is string => Boolean(parte))
    .join(' · ');

  const ariaLabelAcao = `${rotuloAcao} ${nome}, ${linha2Texto}`;

  return (
    <article
      draggable={arrastavel}
      onDragStart={event => {
        if (!arrastavel) return;
        event.dataTransfer.setData(ARRASTO_SERIE, serie.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      style={{
        '--card-accent': corSerie,
      } as React.CSSProperties}
      className={cn(
        'ds-card group relative flex min-w-0 w-full cursor-pointer flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[color-mix(in_srgb,var(--card-accent)_40%,var(--border-color))]',
        !serie.ativa && 'is-dimmed',
      )}
    >
      {temCapa ? (
        <div className="relative h-[106px] w-full shrink-0 overflow-hidden bg-[var(--bg-subtle)]">
          <img
            src={capa!}
            alt={nome}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-0.5"
            style={{ backgroundColor: corSerie }}
            aria-hidden="true"
          />
        </div>
      ) : (
        <div
          className="h-1 w-full shrink-0"
          style={{ backgroundColor: corSerie }}
          aria-hidden="true"
        />
      )}

      <div className="stack-xs flex min-w-0 flex-1 flex-col p-4">
        {/* Linha 1: ponto de cor + título + badge de status (só quando inativa/rascunho) + menu */}
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: corSerie }}
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => onOpen(serie.id)}
            aria-label={ariaLabelAcao}
            className="min-w-0 flex-1 rounded-[var(--radius-sm)] text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Text
              variant="itemTitle"
              as="h3"
              className="truncate text-[var(--text-primary)] transition-colors group-hover:text-[var(--brand-accent)]"
              title={nome}
            >
              {nome}
            </Text>
          </button>

          {status !== 'ativa' ? (
            <Badge variant={status === 'rascunho' ? 'warning' : 'neutral'} className="shrink-0">
              {status === 'rascunho'
                ? ROTULO_STATUS.rascunho
                : item.tipo === 'quadro'
                  ? 'Arquivado'
                  : ROTULO_STATUS.arquivada}
            </Badge>
          ) : null}

          {menuItems.length > 0 ? (
            <MoreMenu
              size="sm"
              label={`Mais opções de ${nome}`}
              items={menuItems}
              className="relative z-10 shrink-0"
            />
          ) : null}
        </div>

        {/* Linha 2: pilar + resumo de ritmo */}
        <Text
          variant="meta"
          as="p"
          className="truncate text-[var(--text-secondary)]"
          title={linha2Texto}
        >
          {linha2Texto}
        </Text>

        {/* Linha 3: resumo conciso de redes e roteiros/quadros */}
        <div className="mt-auto flex min-w-0 items-center justify-between gap-2 pt-1">
          <Text
            variant="meta"
            as="span"
            className="min-w-0 truncate text-[var(--text-tertiary)]"
            title={resumoLinha3}
          >
            {resumoLinha3}
          </Text>
          {item.tipo === 'serie' && filhosTexto ? (
            <button
              type="button"
              onClick={() => onOpenFilhos(serie.id)}
              className="relative z-10 shrink-0 rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Text variant="meta" as="span" className="text-current">
                {filhosTexto}
              </Text>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/**
 * Card de série mobile (preservado sem alterações de comportamento).
 */
function SerieCardMobile({
  item,
  pilarNome,
  temporadasCount = 0,
  ondasComRitmoProprio = 0,
  emAberto = false,
  onOpen,
  onOpenFilhos,
  onEdit,
  onEditRitmo,
  onToggleAtiva,
  onMudarStatus,
  onCriarFilho,
  onMoverParaFamilia,
  arrastavel = false,
}: SerieCardProps) {
  const abrirRitmoContexto = useAbrirRitmoDaSerie();
  const onEditRitmoEfetivo = onEditRitmo ?? abrirRitmoContexto ?? undefined;
  const { serie } = item;
  const nome = serie.name.trim() || 'Sem nome';
  // "Série · Ativa", "Quadro · Sob demanda": o tipo e o status numa etiqueta só.
  const etiqueta = etiquetaDoCard(item, TIPO_AGRUPAMENTO_LABEL);
  // Quadro não tem meta semanal: aparece quando a série precisa dele.
  const frequencia = item.tipo === 'quadro' ? 'Sob demanda' : serie.frequenciaRecomendada?.trim() || 'Sob demanda';
  const pai = item.pai ? item.pai.name.trim() || 'Sem nome' : null;
  const rotuloDoPai = item.tipo === 'quadro' ? 'Série' : 'Família';
  const textoDoPai = item.tipo === 'familia'
    ? 'É a própria família'
    : pai ?? (item.tipo === 'quadro' ? 'Sem série' : 'Sem família (independente)');

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
        draggable={arrastavel}
        onDragStart={event => {
          if (!arrastavel) return;
          event.dataTransfer.setData(ARRASTO_SERIE, serie.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
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
          {/* Topo do card base: tipo e status na mesma etiqueta */}
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="neutral"
              className="uppercase"
              style={{
                backgroundColor: `${serie.cor || '#e11d48'}18`,
                color: serie.cor || 'var(--text-primary)',
              }}
            >
              {etiqueta.toUpperCase()}
            </Badge>

            <span className="flex items-center gap-1 shrink-0">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  serie.ativa ? 'bg-emerald-500' : statusDaSerie(serie) === 'rascunho' ? 'bg-amber-400' : 'bg-zinc-400',
                )}
                aria-hidden="true"
              />
              {onEdit && onToggleAtiva ? (
                <span
                  className="relative z-10"
                  onClick={event => event.stopPropagation()}
                  onKeyDown={event => event.stopPropagation()}
                >
                  <MoreMenu
                    size="sm"
                    label={`Mais opções de ${nome}`}
                    items={itensDoMenuDaSerie(item, {
                      onEdit,
                      onEditRitmo: onEditRitmoEfetivo,
                      onToggleAtiva,
                      onMudarStatus,
                      onCriarFilho,
                      onMoverParaFamilia,
                    })}
                  />
                </span>
              ) : null}
            </span>
          </div>

          {/* Título da série */}
          <Text variant="itemTitle" as="h3" className="leading-snug line-clamp-2">
            {nome}
          </Text>

          {ondasComRitmoProprio > 0 ? (
            <Badge variant="tag" className="w-fit">
              {ondasComRitmoProprio === 1 ? '1 wave com ritmo próprio' : `${ondasComRitmoProprio} waves com ritmo próprio`}
            </Badge>
          ) : null}

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
                {etiqueta}
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
                  title={frequencia}
                >
                  {frequencia}
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
                <Text variant="meta" as="dt" className="text-[var(--text-tertiary)]">{rotuloDoPai}</Text>
                <Text variant="label" as="dd"
                  className="text-[var(--text-primary)] truncate"
                  title={textoDoPai}
                >
                  {textoDoPai}
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
