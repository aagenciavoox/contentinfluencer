import type { CSSProperties } from 'react';
import { AlertTriangle, MoreVertical } from 'lucide-react';
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

  // Quadrada, com a ponta dobrada. Sem pilar o papel é branco; com pilar, a borda e a dobra levam a cor.
  const styleCustom = cor ? ({'--card-accent': cor} as CSSProperties) : undefined;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={onToggleSelect ? selected : undefined}
      draggable={draggable}
      onDragStart={event => {
        // Ctrl/Cmd + arrastar não existe: o gesto é de seleção.
        if ((event.ctrlKey || event.metaKey) && onToggleSelect) {
          event.preventDefault();
          return;
        }
        onDragStart?.(event);
      }}
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
      style={{
        ...styleCustom,
        ...(selected ? ({ '--card-edge': 'var(--text-primary)' } as CSSProperties) : {}),
      }}
      className={cn(
        'post-it-card group relative flex flex-col justify-between p-2.5 pb-3.5 text-left cursor-pointer',
        cor && 'post-it-card--pilar',
        draggable && 'cursor-grab active:cursor-grabbing',
        selected && 'ring-2 ring-[var(--text-primary)]',
        className,
      )}
    >
      <div>
        {/* Selo da reserva + menu ⋮ na mesma linha */}
        <div className="absolute right-1 top-1 z-20 flex items-center justify-end gap-1 rounded-[var(--radius-pill)] opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:static [@media(hover:none)]:opacity-100">

          <div className="-mr-1 shrink-0" onClick={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()}>
            <MoreMenu
              items={menuItems}
              size="sm"
              label="Opções da reserva"
              trigger={<MoreVertical className="h-3.5 w-3.5 text-current opacity-70" />}
              triggerClassName="h-6 w-6 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            />
          </div>
        </div>

        {pendente ? (
          <Badge
            variant="tag"
            className="mb-1 inline-flex items-center gap-1 px-1.5 py-0"
            style={{
              backgroundColor: 'var(--warning-bg-hover)',
              color: 'var(--warning)',
              border: '1px solid color-mix(in srgb, var(--warning) 45%, transparent)',
            }}
          >
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
            {TEXTO_RESERVA_PENDENTE}
          </Badge>
        ) : selo ? (
          <Badge variant="tag" className="mb-1 px-1.5 py-0">
            {selo}
          </Badge>
        ) : null}
        <Text variant="bodyStrong" as="p" className="planner-card-title line-clamp-2 pr-6 leading-snug text-[var(--text-primary)]">
          {titulo}
        </Text>

        {/* Descrição / Anotação */}
        {descricao ? (
          <div className="mt-1 leading-normal">
            <Text variant="meta" as="div" className="line-clamp-2 text-[var(--text-secondary)]">
              {descricao}
            </Text>
          </div>
        ) : null}

        {/* Série (com a cor) e redes. Sem série nem pilar, só as redes. */}
        {nomeAgrupamento || redes.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {nomeAgrupamento ? (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-pill)] max-w-full truncate"
                style={
                  cor
                    ? {
                        backgroundColor: `color-mix(in srgb, ${cor} 12%, var(--bg-elevated))`,
                        color: `color-mix(in srgb, ${cor} 80%, var(--text-primary))`,
                      }
                    : {
                        backgroundColor: 'var(--surface-subtle)',
                        color: 'var(--text-secondary)',
                      }
                }
              >
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: cor || 'var(--text-tertiary)' }}
                  aria-hidden
                />
                <Text variant="meta" as="span" className="truncate max-w-[140px]">
                  {nomeAgrupamento}
                </Text>
              </span>
            ) : null}
            {redes.length > 0 ? (
              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                {redes.slice(0, 3).map(r => (
                  <RedeIcon key={r} rede={r} className="h-3.5 w-3.5 shrink-0" />
                ))}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
