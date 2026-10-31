import type { ReactNode } from 'react';
import { Badge } from '../ui/Badge';
import { Text } from '../ui/Text';

/** Faixa de série ou pilar: marca colorida, nome e selo só quando inativo. */
export function EntityIdentity({
  name,
  color,
  active = true,
  inactiveLabel = 'Inativa',
  icon,
}: {
  name: string;
  color?: string | null;
  active?: boolean;
  inactiveLabel?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {icon ?? (color ? (
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      ) : null)}
      <Text variant="itemTitle" as="span" className="min-w-0 truncate">{name}</Text>
      {!active ? <Badge variant="neutral">{inactiveLabel}</Badge> : null}
    </div>
  );
}
