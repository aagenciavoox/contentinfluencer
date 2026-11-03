import type { CSSProperties } from 'react';
import { MoreVertical } from 'lucide-react';
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
  const nomeAgrupamento = serie?.name || pilar?.nome || (pilar as any)?.name || null;

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

  const linhas = postIt.texto ? postIt.texto.split('\n').map(l => l.trim()).filter(Boolean) : [];
  const titulo = (linhas.length > 0 ? linhas[0] : null) || content?.title?.trim() || 'Reserva de Espaço';
  const descricao = linhas.length > 1 ? linhas.slice(1).join(' ') : null;
  const redes = postIt.redes && postIt.redes.length > 0 ? postIt.redes : [];

  // Quadrada, com a ponta dobrada (`.post-it-card`). Sem série nem pilar o papel é âmbar claro;
  // com série o papel continua claro e só a borda e a dobra levam a cor.
  const styleCustom = cor ? ({'--card-accent': cor} as CSSProperties) : undefined;

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
        'post-it-card group relative flex flex-col justify-between p-2.5 pb-3.5 text-left cursor-pointer',
        cor && 'post-it-card--serie',
        draggable && 'cursor-grab active:cursor-grabbing',
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

        <div className="line-clamp-2 pr-5 text-xs font-semibold leading-snug text-[var(--text-primary)]">
          {titulo}
        </div>

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
