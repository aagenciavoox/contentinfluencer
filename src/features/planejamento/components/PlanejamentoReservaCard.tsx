import { useState, type CSSProperties } from 'react';
import { AlertTriangle, Link2, MoreVertical, Pencil } from 'lucide-react';
import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import { RedeIcon } from '../../../components/ui/PlatformIcons';
import { Badge } from '../../../components/ui/Badge';
import { Text } from '../../../components/ui/Text';
import type { PlanejamentoPostIt } from '../lib/postIt';
import type { Content, Pilar, Serie } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { TEXTO_RESERVA_PENDENTE } from '../../editorial/lib/reservaPendente';

export interface PlanejamentoReservaCardProps {
  postIt: PlanejamentoPostIt;
  content: Content | null;
  serie?: Serie | null;
  pilar?: Pilar | null;
  onOpen: () => void;
  onDesenvolver: () => void;
  /** Abre já no editor. Sem ele, "Editar reserva" só abre o post-it. */
  onEditar?: () => void;
  /** Vira ideia sem abrir o post-it. */
  onVirarIdeia?: () => void;
  /** "Ver o que encaixa": ideias e roteiros sem data que cabem neste espaço. */
  onEncaixar?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  /** "Salvar no calendário…" do item (o mesmo da seleção múltipla do computador). */
  onSalvarNoCalendario?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  /** Ctrl/Cmd + clique entra e sai da seleção (desktop). */
  selected?: boolean;
  onToggleSelect?: () => void;
  /** Selo opcional (ex.: "Só no plano"). A Página calcula com textoSeloSoNoPlano. */
  selo?: string | null;
  /** Sem roteiro e com o dia já passado: alerta amarelo, e não conta mais como previsto. */
  pendente?: boolean;
  /** O dia do card cai numa pausa desta série (ou da família dela). */
  pausada?: boolean;
  className?: string;
}

export function PlanejamentoReservaCard({
  postIt,
  content,
  serie,
  pilar,
  onOpen,
  onDesenvolver,
  onEditar,
  onVirarIdeia,
  onEncaixar,
  onMove,
  onDelete,
  onSalvarNoCalendario,
  draggable = false,
  onDragStart,
  selected = false,
  onToggleSelect,
  selo = null,
  pendente = false,
  pausada = false,
  className,
}: PlanejamentoReservaCardProps) {
  // A cor do post-it é a do pilar. Sem pilar, o papel fica branco.
  const cor = pilar?.cor?.trim() || null;
  const nomeAgrupamento = serie?.name || pilar?.nome || (pilar as any)?.name || null;

  const menuItems: MoreMenuItem[] = [
    {
      id: 'develop',
      label: 'Desenvolver roteiro',
      onClick: onDesenvolver,
    },
    ...(onVirarIdeia
      ? [{ id: 'ideia', label: 'Transformar em ideia', onClick: onVirarIdeia }]
      : []),
    ...(onEncaixar
      ? [{ id: 'encaixar', label: 'Ver o que encaixa…', onClick: onEncaixar }]
      : []),
    {
      id: 'edit',
      label: 'Editar reserva',
      onClick: onEditar ?? onOpen,
    },
    ...(onMove
      ? [
          {
            id: 'move',
            label: 'Mover para outro dia…',
            onClick: onMove,
          },
        ]
      : []),
    ...(onSalvarNoCalendario
      ? [{ id: 'salvar-calendario', label: 'Salvar no calendário…', onClick: onSalvarNoCalendario }]
      : []),
    ...(onDelete
      ? [
          {
            id: 'delete',
            label: 'Excluir reserva',
            onClick: onDelete,
            tone: 'danger' as const,
          },
        ]
      : []),
  ];

  const linhas = postIt.texto ? postIt.texto.split('\n').map(l => l.trim()).filter(Boolean) : [];
  const titulo = (linhas.length > 0 ? linhas[0] : null) || content?.title?.trim() || 'Reserva de Espaço';
  const descricao = linhas.length > 1 ? linhas.slice(1).join(' ') : null;
  const redes = postIt.redes && postIt.redes.length > 0 ? postIt.redes : [];
  const [dragging, setDragging] = useState(false);

  const usarVincular = !nomeAgrupamento && Boolean(onEncaixar);
  const styleCustom = cor && !pausada ? ({ '--card-accent': cor } as CSSProperties) : undefined;
  const ariaLabel = [
    `Reserva de espaço: ${titulo}`,
    nomeAgrupamento ? `Série: ${nomeAgrupamento}` : null,
    pendente ? TEXTO_RESERVA_PENDENTE : pausada ? 'Série em pausa' : selo || 'Livre',
  ].filter(Boolean).join(', ');

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={onToggleSelect ? selected : undefined}
      draggable={draggable}
      onDragStart={event => {
        // Ctrl/Cmd + arrastar não existe: o gesto é de seleção.
        if ((event.ctrlKey || event.metaKey) && onToggleSelect) {
          event.preventDefault();
          return;
        }
        setDragging(true);
        onDragStart?.(event);
      }}
      onDragEnd={() => setDragging(false)}
      onClick={event => {
        if ((event.ctrlKey || event.metaKey) && onToggleSelect) {
          event.preventDefault();
          onToggleSelect();
          return;
        }
        onOpen();
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      style={styleCustom}
      className={cn(
        'post-it-card group relative flex flex-col justify-between gap-1.5 p-2 text-left cursor-pointer select-none',
        pausada ? 'post-it-card--pausada' : cor && 'post-it-card--pilar',
        draggable && 'cursor-grab active:cursor-grabbing',
        selected && 'post-it-card--selected',
        dragging && 'post-it-card--dragging',
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        {/* Topo: pílula de status + menu ⋮ sempre acessível */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {pendente ? (
              <Badge variant="warning" className="inline-flex items-center gap-1 px-1.5 py-0">
                <AlertTriangle className="h-2.5 w-2.5 shrink-0" aria-hidden />
                {TEXTO_RESERVA_PENDENTE}
              </Badge>
            ) : pausada ? (
              <Badge variant="neutral" className="px-1.5 py-0">
                Pausa
              </Badge>
            ) : selo ? (
              <Badge variant="neutral" className="inline-flex items-center gap-1 px-1.5 py-0">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]" aria-hidden />
                {selo}
              </Badge>
            ) : (
              <Badge variant="neutral" className="px-1.5 py-0">
                Livre
              </Badge>
            )}
            {pendente && pausada ? (
              <Badge variant="neutral" className="px-1.5 py-0">
                Pausa
              </Badge>
            ) : null}
          </div>

          <div
            className="-mr-1 -mt-1 shrink-0"
            onClick={e => e.stopPropagation()}
            onDragStart={e => e.stopPropagation()}
          >
            <MoreMenu
              items={menuItems}
              size="sm"
              label="Opções da reserva"
              trigger={<MoreVertical className="h-3.5 w-3.5 text-current" />}
              triggerClassName="h-6 w-6 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            />
          </div>
        </div>

        {/* Série / Pilar */}
        <div className="flex min-w-0 items-center gap-1.5">
          {nomeAgrupamento ? (
            <>
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: pausada ? 'var(--text-tertiary)' : (cor || 'var(--text-tertiary)') }}
                aria-hidden
              />
              <Text
                variant="meta"
                as="span"
                title={nomeAgrupamento}
                className={cn(
                  'min-w-0 flex-1 truncate',
                  pausada ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]',
                )}
              >
                {nomeAgrupamento}
              </Text>
            </>
          ) : (
            <Text variant="meta" as="span" className="truncate text-[var(--text-tertiary)]">
              Sem série vinculada
            </Text>
          )}
        </div>

        {/* Título da reserva (até 2 linhas) */}
        <Text
          variant="bodyStrong"
          as="p"
          className={cn(
            'planner-card-title line-clamp-2 leading-snug',
            pausada ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]',
          )}
        >
          {titulo}
        </Text>

        {/* Descrição / Anotação */}
        {descricao ? (
          <Text
            variant="meta"
            as="p"
            className={cn(
              'line-clamp-2',
              pausada ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]',
            )}
          >
            {descricao}
          </Text>
        ) : null}

        {/* Redes previstas */}
        {redes.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[var(--text-secondary)]">
            {redes.slice(0, 3).map(r => (
              <RedeIcon key={r} rede={r} className="h-3.5 w-3.5 shrink-0" />
            ))}
          </div>
        ) : null}
      </div>

      {/* Ação direta: reduz 1 clique para desenvolver ou vincular */}
      {pausada ? (
        <div className="mt-1 w-full rounded-[var(--radius-sm)] bg-[var(--bg-hover)] px-1.5 py-1 text-center">
          <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
            Série em pausa
          </Text>
        </div>
      ) : (
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            if (usarVincular && onEncaixar) {
              onEncaixar();
            } else {
              onDesenvolver();
            }
          }}
          onDragStart={event => event.stopPropagation()}
          className="mt-1 flex w-full items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-1.5 py-1 text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
        >
          {usarVincular ? (
            <Link2 className="h-3 w-3 shrink-0 text-[var(--text-secondary)]" aria-hidden />
          ) : (
            <Pencil
              className="h-3 w-3 shrink-0"
              style={{ color: cor || 'var(--brand-accent-strong)' }}
              aria-hidden
            />
          )}
          <Text variant="meta" as="span" className="truncate text-[var(--text-primary)]">
            {usarVincular ? 'Vincular' : 'Desenvolver'}
          </Text>
        </button>
      )}
    </div>
  );
}
