import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatDayTitle(date: Date): string {
  const weekday = capitalize(WEEKDAYS[date.getDay()] ?? 'hoje');
  return `${weekday}, ${format(date, "d 'de' MMMM", { locale: ptBR })}`;
}

export function formatWeekdayShort(date: Date): string {
  return capitalize(WEEKDAYS[date.getDay()] ?? 'hoje');
}

export function localDateKey(date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export type DayPulseSegment = {
  label: string;
  to?: string;
};

type AgendaPulseItem = { title: string; time?: string | null };
type ProjectPulseItem = { id: string; nome: string; dataFim?: string | null };

function formatAgendaLabel(item: AgendaPulseItem): string {
  const title = item.title.trim() || 'Compromisso';
  return item.time ? `${title} · ${item.time}` : title;
}

function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return format(date, "d 'de' MMMM", { locale: ptBR });
}

export function buildDayPulse({
  readyCount,
  showCounts,
  agendaToday,
  urgentProjects,
}: {
  readyCount: number;
  showCounts: boolean;
  agendaToday: AgendaPulseItem[];
  urgentProjects: ProjectPulseItem[];
}): DayPulseSegment[] {
  let readyLabel = 'Roteiros prontos para gravar';
  if (readyCount === 0) readyLabel = 'Nenhum roteiro pronto';
  else if (showCounts && readyCount === 1) readyLabel = '1 roteiro pronto';
  else if (showCounts) readyLabel = `${readyCount} roteiros prontos`;

  const segments: DayPulseSegment[] = [{ label: readyLabel }];

  if (agendaToday.length === 0) {
    segments.push({ label: 'nada na agenda', to: '/calendario' });
  } else if (agendaToday.length === 1) {
    segments.push({ label: formatAgendaLabel(agendaToday[0]), to: '/calendario' });
  } else if (!showCounts) {
    segments.push({ label: 'Compromissos na agenda', to: '/calendario' });
  } else {
    const extra = agendaToday.length - 1;
    segments.push({
      label: `${formatAgendaLabel(agendaToday[0])} e mais ${extra}`,
      to: '/calendario',
    });
  }

  if (urgentProjects.length === 1) {
    const project = urgentProjects[0];
    const when = project.dataFim ? formatIsoDate(project.dataFim) : '';
    segments.push({
      label: when ? `${project.nome} · ${when}` : project.nome,
      to: `/projetos/${project.id}`,
    });
  } else if (urgentProjects.length > 1) {
    segments.push({
      label: showCounts ? `${urgentProjects.length} prazos esta semana` : 'Prazos esta semana',
      to: '/projetos',
    });
  }

  return segments;
}
