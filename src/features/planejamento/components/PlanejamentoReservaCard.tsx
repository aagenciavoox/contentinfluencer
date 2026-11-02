import { ArrowRight, Calendar as CalendarIcon, MoreVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import { RedeIcon } from '../../../components/ui/PlatformIcons';
import { Text } from '../../../components/ui/Text';
import type { PlanejamentoPostIt } from '../lib/postIt';
import type { Content, Pilar, Serie } from '../../../lib/database';
import { cn } from '../../../lib/utils';

export interface PlanejamentoReservaCardProps {
  postIt: PlanejamentoPostIt;
  content: Content | null;
  serie?: Serie | null;
  pilar?: Pilar | null;
  onOpen: () => void;
  onDesenvolver: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  className?: string;
}

export function PlanejamentoReservaCard({
  postIt,
  content,
  serie,
  pilar,
  onOpen,
  onDesenvolver,
  onMove,
  onDelete,
  draggable = false,
  onDragStart,
  className,
}: PlanejamentoReservaCardProps) {
  // Cor editorial: vem da série/quadro (ou herda do pilar)
  const cor = serie?.cor || pilar?.cor || null;
  const nomeAgrupamento = serie?.name || pilar?.nome || (pilar as any)?.name || 'Sem série';

  const menuItems: MoreMenuItem[] = [
    {
      id: 'develop',
      label: 'Desenvolver roteiro',
      onClick: onDesenvolver,
    },
    {
      id: 'edit',
      label: 'Editar reserva',
      onClick: onOpen,
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

  // Data formatada para o rodapé (ex: 11/12)
  const dataFormatada = (() => {
    if (!postIt.date) return null;
    try {
      return format(parseISO(postIt.date), 'dd/MM');
    } catch {
      return postIt.date.slice(5).replace('-', '/');
    }
  })();

  const linhas = postIt.texto ? postIt.texto.split('\n').map(l => l.trim()).filter(Boolean) : [];
  const titulo = (linhas.length > 0 ? linhas[0] : null) || content?.title?.trim() || 'Reserva de Espaço';
  const descricao = linhas.length > 1 ? linhas.slice(1).join(' ') : null;
  const redes = postIt.redes && postIt.redes.length > 0 ? postIt.redes : [];

  const styleCustom = cor
    ? {
        backgroundColor: `color-mix(in srgb, ${cor} 8%, var(--bg-elevated))`,
        borderColor: `color-mix(in srgb, ${cor} 26%, var(--border-subtle))`,
      }
    : undefined;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      style={styleCustom}
      className={cn(
        'group flex flex-col justify-between rounded-[var(--radius-card)] border p-2.5 shadow-sm transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
        !cor && 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
        className,
      )}
    >
      <div>
        {/* Header: Tag RESERVA + Redes + Menu ⋮ */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-[var(--radius-pill)] border t-label uppercase tracking-wider shrink-0"
              style={
                cor
                  ? {
                      backgroundColor: `color-mix(in srgb, ${cor} 15%, transparent)`,
                      color: `color-mix(in srgb, ${cor} 85%, var(--text-primary))`,
                      borderColor: `color-mix(in srgb, ${cor} 30%, transparent)`,
                    }
                  : {
                      backgroundColor: 'var(--surface-subtle)',
                      color: 'var(--text-secondary)',
                      borderColor: 'var(--border-subtle)',
                    }
              }
            >
              Reserva
            </span>
            {redes.length > 0 ? (
              <span className="flex items-center gap-1 opacity-75">
                {redes.slice(0, 2).map(r => (
                  <RedeIcon key={r} rede={r} className="h-3 w-3 shrink-0" />
                ))}
              </span>
            ) : null}
          </div>

          <div onClick={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()}>
            <MoreMenu
              items={menuItems}
              size="sm"
              label="Opções da reserva"
              trigger={<MoreVertical className="h-3.5 w-3.5 text-current opacity-70" />}
              triggerClassName="h-6 w-6 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            />
          </div>
        </div>

        {/* Título da Reserva */}
        <div className="mt-1.5 leading-snug">
          <Text variant="itemTitle" as="div" className="line-clamp-2 text-[var(--text-primary)]">
            {titulo}
          </Text>
        </div>

        {/* Descrição / Anotação */}
        {descricao ? (
          <div className="mt-1 leading-normal">
            <Text variant="meta" as="div" className="line-clamp-2 text-[var(--text-secondary)]">
              {descricao}
            </Text>
          </div>
        ) : null}

        {/* Tag da Série / Agrupamento com a cor */}
        <div className="mt-2">
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
        </div>
      </div>

      {/* Rodapé: Data + Link Desenvolver → */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-1.5 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-1 tabular-nums text-[var(--text-secondary)]">
          {dataFormatada ? (
            <>
              <CalendarIcon className="h-3 w-3 shrink-0 opacity-70" />
              <Text variant="meta" as="span">{dataFormatada}</Text>
            </>
          ) : null}
        </div>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onDesenvolver();
          }}
          className="inline-flex items-center gap-0.5 hover:underline focus-visible:outline-none transition-colors text-[var(--brand-accent-text)] hover:opacity-80"
        >
          <Text variant="meta" as="span">
            Desenvolver
          </Text>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
