import { useId, useState, type ReactNode } from 'react';
import { Badge } from '../ui/Badge';
import { Text } from '../ui/Text';
import { MoreMenu, type MoreMenuItem } from '../ui/MoreMenu';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { cn } from '../../lib/utils';

export const SETTINGS_ENTITY_GRID_CLASS = 'grid-content';

interface SettingsGridCardProps {
  title: string;
  description?: string;
  color?: string;
  leading?: ReactNode;
  badges?: ReactNode;
  /** Compact meta line (e.g. "Semanal · 12 roteiros"). */
  meta?: ReactNode;
  /** Cover shown at the top of the card when the value is an image URL. */
  imageUrl?: string | null;
  active?: boolean;
  onToggle?: () => void;
  /** Só vale sem `onOpen`: com `onOpen`, abrir o card já edita, e "Editar" repetiria a ação. */
  onEdit?: () => void;
  onDelete?: () => void;
  /** O card inteiro abre o destino principal. */
  onOpen?: () => void;
  dimmed?: boolean;
  /** Sem a chave à vista: ativar e desativar ficam no menu ⋯. */
  compact?: boolean;
  className?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

function buildMoreItems({
  active,
  onToggle,
  onEdit,
  onDelete,
  includeToggle,
}: {
  active: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  includeToggle: boolean;
}): MoreMenuItem[] {
  const items: MoreMenuItem[] = [];
  if (onEdit) items.push({ id: 'edit', label: 'Editar', onClick: onEdit });
  if (onToggle && includeToggle) {
    items.push({
      id: 'toggle',
      label: active ? 'Desativar' : 'Ativar',
      tone: active ? 'default' : 'success',
      onClick: onToggle,
    });
  }
  if (onDelete) {
    items.push({
      id: 'delete',
      label: 'Excluir',
      tone: 'danger',
      onClick: onDelete,
    });
  }
  return items;
}

function httpImageUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function CardCover({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className="mb-3 aspect-[16/9] w-full rounded-[var(--radius-input)] object-cover"
    />
  );
}

/**
 * Card de pilar e de série. Segue o card clicável do app (o da Criação): um botão cobre
 * o card todo e a chave e o menu ⋯ ficam por cima, sempre visíveis.
 */
export function SettingsGridCard({
  title,
  description,
  color,
  leading,
  badges,
  meta,
  imageUrl,
  active = true,
  onToggle,
  onEdit,
  onDelete,
  onOpen,
  dimmed = false,
  compact = false,
  className,
  children,
  footer,
}: SettingsGridCardProps) {
  const switchId = useId();
  const coverSrc = httpImageUrl(imageUrl);
  const showSwitch = !compact && Boolean(onToggle);
  const moreItems = buildMoreItems({
    active,
    onToggle,
    onEdit: onOpen ? undefined : onEdit,
    onDelete,
    includeToggle: !showSwitch,
  });
  // No modo compacto não há chave: o ⋯ fica no canto, por cima do card, sem abrir uma faixa vazia.
  const hasTopRow = !compact && Boolean(leading || showSwitch || moreItems.length > 0);
  const cornerMenu = compact && moreItems.length > 0;
  // Ordem de leitura: nome (com a cor) primeiro, descrição, e os números no rodapé.
  // "Ativa" não vira selo: só o estado fora do normal aparece.
  const statusBadge = compact && !active ? <Badge variant="neutral">Inativa</Badge> : null;
  const colorDot = color ? (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--border-color)]"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  ) : null;

  return (
    <div
      className={cn(
        'ds-card group relative flex flex-col gap-3 p-4 text-left',
        onOpen && 'ds-card-interactive',
        // Inativo: fundo rebaixado em vez de texto apagado, para a leitura continuar boa.
        dimmed && 'is-dimmed',
        className,
      )}
    >
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          aria-label={`Abrir ${title}`}
        />
      ) : null}

      {cornerMenu ? (
        <div className="absolute right-2 top-2 z-[2]">
          <MoreMenu size="sm" items={moreItems} label={`Mais opções de ${title}`} />
        </div>
      ) : null}

      {hasTopRow ? (
        <div className="relative z-[2] -mb-1 flex items-center justify-between gap-2">
          <div className="pointer-events-none min-w-0">{leading ?? statusBadge}</div>
          <div className="flex items-center gap-1">
            {showSwitch && onToggle ? (
              <>
                <label
                  htmlFor={switchId}
                  className="cursor-pointer text-xs font-medium text-[var(--text-secondary)]"
                >
                  {active ? 'Ativo' : 'Inativo'}
                </label>
                <ToggleSwitch
                  id={switchId}
                  size="sm"
                  enabled={active}
                  onToggle={onToggle}
                  label={`${title}: ${active ? 'ativo' : 'inativo'}`}
                  className="min-h-8 min-w-8 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                />
              </>
            ) : null}
            {moreItems.length > 0 ? <MoreMenu size="sm" items={moreItems} label={`Mais opções de ${title}`} /> : null}
          </div>
        </div>
      ) : null}

      <div className={cn('pointer-events-none relative z-[1] min-w-0 flex-1', cornerMenu && 'pr-8')}>
        {coverSrc ? <CardCover src={coverSrc} alt="" /> : null}
        {!hasTopRow && statusBadge ? <div className="mb-2 flex flex-wrap items-center gap-1">{statusBadge}</div> : null}

        <span className="flex min-w-0 items-center gap-2">
          {compact || !leading ? colorDot : null}
          <Text variant="itemTitle" as="span" className="min-w-0 leading-snug">
            {title}
          </Text>
        </span>

        {children ?? (
          description ? (
            <Text variant="secondary" className="mt-1 line-clamp-2">
              {description}
            </Text>
          ) : null
        )}

        {badges ? <div className="mt-3 flex flex-wrap items-center gap-1">{badges}</div> : null}

        {meta ? (
          <Text variant="meta" as="p" className="mt-2 line-clamp-2 leading-snug">
            {meta}
          </Text>
        ) : null}
      </div>

      {footer ? <div className="relative z-[2]">{footer}</div> : null}
    </div>
  );
}
