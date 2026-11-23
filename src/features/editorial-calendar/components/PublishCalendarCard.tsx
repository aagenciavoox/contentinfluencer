import { useState, type CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { DisclosureButton } from '../../../components/ui/DisclosureButton';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import type { PublishCalendarConta } from '../lib/publishCalendarItems';

type PublishCalendarCardProps = {
  label: string;
  time?: string | null;
  secondary?: string | null;
  contas?: readonly PublishCalendarConta[];
  style?: CSSProperties;
  variant?: 'compact' | 'expanded';
  onOpen?: () => void;
};

/** A cor do selo segue os status que o calendário já pinta. O texto continua o da publicação. */
function corDoStatus(status: string): string {
  if (status === 'Programada') return 'Programado';
  if (status === 'Publicada') return 'Publicado';
  return status;
}

function seloDaConta(conta: PublishCalendarConta) {
  return (
    <span key={conta.plataformaId} title={`${conta.platformName}: ${conta.status}`}>
      <Badge
        variant="status"
        status={corDoStatus(conta.status)}
        className="inline-flex max-w-full items-center gap-1"
      >
        <PlatformIcon platform={conta.platformName} className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{conta.status}</span>
      </Badge>
    </span>
  );
}

function detalheDaConta(conta: PublishCalendarConta) {
  return (
    <div key={conta.plataformaId} className="stack-xs">
      <Text variant="label" as="p" className="text-[var(--text-primary)]">{conta.platformName}</Text>
      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
        {conta.time ?? 'Sem horário'}
      </Text>
      <Text variant="secondary" as="p" className="whitespace-pre-wrap text-[var(--text-primary)]">
        {conta.legenda.trim() ? conta.legenda : 'Sem legenda'}
      </Text>
    </div>
  );
}

/**
 * Card de publicação do calendário. Os selos mostram a rede e o status de cada conta.
 * O drawer abre horário e legenda sem ir para a ficha do roteiro.
 */
export function PublishCalendarCard({
  label,
  time,
  secondary,
  contas = [],
  style,
  variant = 'compact',
  onOpen,
}: PublishCalendarCardProps) {
  const [open, setOpen] = useState(false);
  const expanded = variant === 'expanded';
  const temContas = contas.length > 0;
  const resumo = [label, time, secondary].filter(Boolean).join(' · ');

  return (
    <Surface variant="outlined" padding="none" className="w-full overflow-hidden text-left" style={style}>
      <button
        type="button"
        title={resumo}
        onClick={event => {
          event.stopPropagation();
          onOpen?.();
        }}
        className={cn(
          'w-full text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
          expanded ? 'px-2.5 py-2' : 'px-2 py-1',
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {time ? (
            <Text variant="meta" as="span" className="shrink-0 tabular-nums text-[var(--text-secondary)]">{time}</Text>
          ) : null}
          <Text variant={expanded ? 'itemTitle' : 'label'} as="span" className="min-w-0 truncate text-[var(--text-primary)]">
            {label}
          </Text>
        </span>
        {expanded && secondary ? (
          <Text variant="meta" as="span" className="mt-0.5 block text-[var(--text-secondary)]">{secondary}</Text>
        ) : null}
        {temContas ? (
          <span className="mt-1 flex flex-wrap items-center gap-1">
            {contas.map(seloDaConta)}
          </span>
        ) : null}
      </button>
      {temContas ? (
        <div onClick={event => event.stopPropagation()}>
          {expanded ? (
            <DisclosureButton
              open={open}
              onToggle={() => setOpen(value => !value)}
              className="rounded-none border-t border-[var(--border-color)] px-2"
            >
              <Text variant="meta" as="span">Horário e legenda</Text>
            </DisclosureButton>
          ) : (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(value => !value)}
              className="flex w-full items-center justify-between gap-2 border-t border-[var(--border-color)] px-2 py-1 text-left pointer-coarse:min-h-6 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Text variant="meta" as="span">Horário e legenda</Text>
              <ChevronDown
                className={cn('h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)] transition-transform', open && 'rotate-180')}
                aria-hidden
              />
            </button>
          )}
          {open ? (
            <div className="stack-sm border-t border-[var(--border-color)] px-2 py-2">
              {contas.map(detalheDaConta)}
            </div>
          ) : null}
        </div>
      ) : null}
    </Surface>
  );
}
