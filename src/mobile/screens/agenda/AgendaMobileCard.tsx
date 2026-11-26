import { format, parseISO } from 'date-fns';
import {
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  Mic2,
  Send,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { CONTENT_STATUS, DISPLAY_STATUS } from '../../../features/contents/lib/contentPipeline';
import { estadoDoCard } from '../../../features/editorial-calendar/components/PublishCalendarCard';
import type { PublishCalendarConta } from '../../../features/editorial-calendar/lib/publishCalendarItems';
import { AgendaTipoIcon } from '../../../features/projects/components/AgendaTipoIcon';
import { cn, getEntityTagStyle, tintedTextColor } from '../../../lib/utils';

export type AgendaMobileCardKind = 'agenda' | 'recording' | 'publish' | 'project';

export interface AgendaMobileCardProps {
  kind: AgendaMobileCardKind;
  title: string;
  date: string;
  time?: string | null;
  secondary?: string | null;
  color?: string | null;
  agendaTipo?: string;
  platformNames?: string[];
  contas?: PublishCalendarConta[];
  contentStatus?: string;
  posted?: boolean;
  scheduled?: boolean;
  editado?: boolean;
  onClick: () => void;
}

const KIND_LABELS: Record<AgendaMobileCardKind, string> = {
  agenda: 'Agenda',
  recording: 'Gravação',
  publish: 'Publicação',
  project: 'Projeto',
};

const KIND_ACCENTS: Record<AgendaMobileCardKind, string> = {
  agenda: 'var(--accent-green)',
  recording: 'var(--accent-orange)',
  publish: 'var(--status-ready)',
  project: 'var(--accent-purple)',
};

function contaSemLegenda(conta: PublishCalendarConta): boolean {
  return !conta.posted && !conta.cancelled && !conta.legenda.trim();
}

function resolveVisual(props: AgendaMobileCardProps) {
  const { kind, agendaTipo, color, posted, scheduled, editado, contas = [], platformNames = [], contentStatus, secondary } = props;

  if (kind === 'publish') {
    const estado = estadoDoCard({ posted, scheduled, editado });
    const faltandoLegenda = contas.filter(contaSemLegenda).length;
    const redes = platformNames.length > 0 ? platformNames.join(' · ') : '';

    let accentColor = 'var(--status-ready)';
    let kindLabel = KIND_LABELS.publish;
    let statusBadge: { label: string; kind: 'edited' | 'pending' | 'posted' } | null = null;
    let icon = <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />;

    if (estado === 'publicado') {
      accentColor = 'var(--status-posted)';
      kindLabel = CONTENT_STATUS.POSTADO;
      icon = <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />;
    } else if (estado === 'programado') {
      accentColor = 'var(--status-scheduled)';
      kindLabel = DISPLAY_STATUS.PROGRAMADO;
      icon = <Send className="h-4 w-4 shrink-0" aria-hidden />;
    } else if (estado === 'editado') {
      accentColor = 'var(--status-edited)';
      kindLabel = KIND_LABELS.publish;
      statusBadge = { label: 'Editado', kind: 'edited' };
      icon = <Send className="h-4 w-4 shrink-0" aria-hidden />;
    } else {
      accentColor = 'var(--status-ready)';
      kindLabel = KIND_LABELS.publish;
      statusBadge = { label: 'Pendente', kind: 'pending' };
      icon = <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />;
    }

    let subtitle: string | null = null;
    let subtitleTone: 'default' | 'warning' = 'default';

    if (faltandoLegenda > 0) {
      const aviso = faltandoLegenda === 1 ? '1 sem legenda' : `${faltandoLegenda} sem legenda`;
      subtitle = redes ? `${redes} · ${aviso}` : aviso;
      subtitleTone = 'warning';
    } else if (estado === 'previsto') {
      const partes = [contentStatus, redes].filter(Boolean);
      subtitle = partes.length > 0 ? partes.join(' · ') : secondary || null;
      subtitleTone = 'warning';
    } else {
      subtitle = redes || secondary || null;
    }

    return { accentColor, kindLabel, statusBadge, icon, subtitle, subtitleTone };
  }

  if (kind === 'recording') {
    return {
      accentColor: 'var(--accent-orange)',
      kindLabel: KIND_LABELS.recording,
      statusBadge: editado ? ({ label: 'Editado', kind: 'edited' } as const) : null,
      icon: <Mic2 className="h-4 w-4 shrink-0" aria-hidden />,
      subtitle: secondary || null,
      subtitleTone: 'default' as const,
    };
  }

  if (kind === 'project') {
    return {
      accentColor: color || KIND_ACCENTS.project,
      kindLabel: KIND_LABELS.project,
      statusBadge: null,
      icon: <BriefcaseBusiness className="h-4 w-4 shrink-0" aria-hidden />,
      subtitle: secondary || null,
      subtitleTone: 'default' as const,
    };
  }

  const tipoLabel = agendaTipo || KIND_LABELS.agenda;
  const agendaSubtitle = secondary && secondary !== tipoLabel ? secondary : null;

  return {
    accentColor: color || KIND_ACCENTS.agenda,
    kindLabel: tipoLabel,
    statusBadge: null,
    icon: <AgendaTipoIcon tipo={agendaTipo || 'Outro'} className="h-4 w-4 shrink-0" />,
    subtitle: agendaSubtitle,
    subtitleTone: 'default' as const,
  };
}

/**
 * Card compacto da lista da Agenda no celular (Variante C — Borda de Cor & Linha Única).
 * Borda semântica lateral de 4px, cabeçalho inline unificado (tipo · horário · data + ícone)
 * e título em até 2 linhas para máxima densidade e escaneabilidade na lista mobile.
 */
export function AgendaMobileCard(props: AgendaMobileCardProps) {
  const { title, date, time, onClick } = props;
  const { accentColor, kindLabel, statusBadge, icon, subtitle, subtitleTone } = resolveVisual(props);
  const dateLabel = format(parseISO(date), 'dd/MM');
  const headerPrimary = time ? `${kindLabel} · ${time}` : kindLabel;
  const ariaLabel = [headerPrimary, dateLabel, statusBadge?.label, title].filter(Boolean).join(' · ');

  return (
    <Surface
      variant="interactive"
      padding="none"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group relative overflow-hidden p-3 pl-4 transition-transform active:scale-[0.99]"
    >
      <span
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-1"
        style={{ backgroundColor: accentColor }}
      />

      <span className="mb-1 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <Text
            variant="label"
            as="span"
            className="truncate tabular-nums text-[var(--text-primary)]"
          >
            {headerPrimary}
          </Text>
          <span aria-hidden className="shrink-0 text-[var(--text-tertiary)]">·</span>
          <Text
            variant="meta"
            as="span"
            className="shrink-0 tabular-nums text-[var(--text-secondary)]"
          >
            {dateLabel}
          </Text>
        </span>

        <span className="flex shrink-0 items-center gap-1.5">
          {statusBadge ? (
            statusBadge.kind === 'edited' ? (
              <Badge
                variant="neutral"
                className="gap-0.5 rounded-[var(--radius-input)] px-1.5 py-0.5"
                style={getEntityTagStyle('var(--status-edited)')}
              >
                <Check className="h-3 w-3 shrink-0" aria-hidden />
                {statusBadge.label}
              </Badge>
            ) : (
              <Badge
                variant="warning"
                className="rounded-[var(--radius-input)] px-1.5 py-0.5"
              >
                {statusBadge.label}
              </Badge>
            )
          ) : null}
          <span className="inline-flex shrink-0" style={{ color: tintedTextColor(accentColor) }}>
            {icon}
          </span>
        </span>
      </span>

      <Text
        variant="itemTitle"
        as="span"
        className="block line-clamp-2 leading-snug text-[var(--text-primary)]"
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          variant={subtitleTone === 'warning' ? 'label' : 'meta'}
          as="span"
          className={cn(
            'mt-1 block line-clamp-1',
            subtitleTone === 'default' && 'text-[var(--text-secondary)]',
          )}
          style={subtitleTone === 'warning' ? { color: tintedTextColor('var(--status-ready)') } : undefined}
        >
          {subtitle}
        </Text>
      ) : null}
    </Surface>
  );
}
