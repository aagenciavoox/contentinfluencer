import {useMemo, useState} from 'react';
import {
  addDays,
  endOfDay,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {
  BriefcaseBusiness,
  CalendarClock,
  Clapperboard,
  Mic2,
  Plus,
  Radio,
  SearchCheck,
} from 'lucide-react';
import type {AgendaItem, Content, Projeto} from '../../../lib/database';
import {MobileEmptyState} from '../../components/MobileEmptyState';
import {MobileFilterSheet} from '../../components/MobileFilterSheet';
import {MobileListCard} from '../../components/MobileListCard';
import {MobileSearchBar} from '../../components/MobileSearchBar';
import {MobileSegmentTabs} from '../../components/MobileSegmentTabs';

type AgendaTimelineKind = 'agenda' | 'recording' | 'publish' | 'project';
type AgendaMobileTab = 'today' | 'week' | 'upcoming';

interface AgendaMobileScreenProps {
  contents: Content[];
  agendaItems: AgendaItem[];
  projetos: Projeto[];
  onAddAgenda: () => void;
}

interface AgendaTimelineEntry {
  id: string;
  kind: AgendaTimelineKind;
  title: string;
  date: string;
  time?: string | null;
  secondary?: string | null;
}

const KIND_LABELS: Record<AgendaTimelineKind, string> = {
  agenda: 'Agenda',
  recording: 'Gravacao',
  publish: 'Publicacao',
  project: 'Projeto',
};

const KIND_ACCENTS: Record<AgendaTimelineKind, string> = {
  agenda: 'var(--accent-green)',
  recording: 'var(--accent-orange)',
  publish: 'var(--accent-blue)',
  project: 'var(--accent-purple)',
};

function buildTimelineEntries(contents: Content[], agendaItems: AgendaItem[], projetos: Projeto[]) {
  const projectNameById = new Map(projetos.map(projeto => [projeto.id, projeto.nome]));
  const entries: AgendaTimelineEntry[] = [];

  agendaItems.forEach(item => {
    entries.push({
      id: item.id,
      kind: 'agenda',
      title: item.title,
      date: item.date,
      time: item.time,
      secondary: item.projetoId ? projectNameById.get(item.projetoId) ?? item.tipo : item.tipo,
    });
  });

  contents.forEach(content => {
    if (content.recordingDate) {
      entries.push({
        id: `${content.id}:recording`,
        kind: 'recording',
        title: content.title || 'Conteudo sem titulo',
        date: content.recordingDate,
        secondary: content.status || 'Fila de gravacao',
      });
    }

    if (content.publishDate) {
      entries.push({
        id: `${content.id}:publish`,
        kind: 'publish',
        title: content.title || 'Conteudo sem titulo',
        date: content.publishDate,
        secondary: content.status || 'Planejado para publicar',
      });
    }
  });

  projetos
    .filter(projeto => !projeto.deletedAt)
    .forEach(projeto => {
      if (projeto.dataInicio) {
        entries.push({
          id: `${projeto.id}:start`,
          kind: 'project',
          title: projeto.nome,
          date: projeto.dataInicio,
          secondary: 'Inicio do projeto',
        });
      }

      if (projeto.dataFim) {
        entries.push({
          id: `${projeto.id}:deadline`,
          kind: 'project',
          title: projeto.nome,
          date: projeto.dataFim,
          secondary: 'Prazo final',
        });
      }

      projeto.etapas.forEach(etapa => {
        if (!etapa.dataPrazo) return;

        entries.push({
          id: etapa.id,
          kind: 'project',
          title: projeto.nome,
          date: etapa.dataPrazo,
          secondary: `Etapa: ${etapa.nome}`,
        });
      });
    });

  return entries.sort((left, right) => {
    const leftTime = new Date(left.date).getTime();
    const rightTime = new Date(right.date).getTime();

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return (left.time || '').localeCompare(right.time || '');
  });
}

export function AgendaMobileScreen({
  contents,
  agendaItems,
  projetos,
  onAddAgenda,
}: AgendaMobileScreenProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<AgendaMobileTab>('week');
  const [activeKinds, setActiveKinds] = useState<AgendaTimelineKind[]>([
    'agenda',
    'recording',
    'publish',
    'project',
  ]);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, {weekStartsOn: 1});
  const weekEnd = endOfWeek(today, {weekStartsOn: 1});
  const upcomingEnd = endOfDay(addDays(today, 30));

  const timeline = useMemo(
    () => buildTimelineEntries(contents, agendaItems, projetos),
    [agendaItems, contents, projetos]
  );

  const tabCounts = useMemo(
    () => ({
      today: timeline.filter(entry => isSameDay(parseISO(entry.date), today)).length,
      week: timeline.filter(entry =>
        isWithinInterval(parseISO(entry.date), {start: weekStart, end: weekEnd})
      ).length,
      upcoming: timeline.filter(entry =>
        isWithinInterval(parseISO(entry.date), {start: today, end: upcomingEnd})
      ).length,
    }),
    [timeline, today, upcomingEnd, weekEnd, weekStart]
  );

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return timeline
      .filter(entry => {
        const entryDate = parseISO(entry.date);

        if (activeTab === 'today') {
          return isSameDay(entryDate, today);
        }

        if (activeTab === 'week') {
          return isWithinInterval(entryDate, {start: weekStart, end: weekEnd});
        }

        return isWithinInterval(entryDate, {start: today, end: upcomingEnd});
      })
      .filter(entry => activeKinds.includes(entry.kind))
      .filter(entry => {
        if (!normalizedSearch) return true;
        return [entry.title, entry.secondary || '', KIND_LABELS[entry.kind]]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      });
  }, [activeKinds, activeTab, search, timeline, today, upcomingEnd, weekEnd, weekStart]);

  const groupedEntries = useMemo(() => {
    return filteredEntries.reduce<Array<{label: string; items: AgendaTimelineEntry[]}>>((acc, entry) => {
      const label = format(parseISO(entry.date), "EEEE, dd 'de' MMMM", {locale: ptBR});
      const existing = acc.find(group => group.label === label);

      if (existing) {
        existing.items.push(entry);
        return acc;
      }

      acc.push({label, items: [entry]});
      return acc;
    }, []);
  }, [filteredEntries]);

  const focusAction = (
    <button type="button" onClick={onAddAgenda} className="button-primary w-full">
      <Plus className="h-4 w-4" />
      Novo evento
    </button>
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--accent-blue)]/12 p-3 text-[var(--accent-blue)]">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <p className="t-section-title text-[var(--text-primary)]">Radar da semana</p>
            <p className="t-secondary">Gravacoes, publicacoes, projetos e compromissos em uma fila objetiva.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Hoje</p>
            <p className="mt-1 text-xl font-black text-[var(--text-primary)]">{tabCounts.today}</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">7 dias</p>
            <p className="mt-1 text-xl font-black text-[var(--text-primary)]">{tabCounts.week}</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Projetos</p>
            <p className="mt-1 text-xl font-black text-[var(--text-primary)]">
              {timeline.filter(entry => entry.kind === 'project').length}
            </p>
          </div>
        </div>

        <button type="button" onClick={onAddAgenda} className="button-primary mt-4 w-full">
          <Plus className="h-4 w-4" />
          Adicionar evento
        </button>
      </section>

      <section className="space-y-4">
        <MobileSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por titulo, tipo, projeto ou entrega"
          onFilterClick={() => setIsFilterSheetOpen(true)}
        />

        <MobileSegmentTabs
          tabs={[
            {value: 'today', label: 'Hoje', count: tabCounts.today},
            {value: 'week', label: 'Semana', count: tabCounts.week},
            {value: 'upcoming', label: '30 dias', count: tabCounts.upcoming},
          ]}
          value={activeTab}
          onChange={value => setActiveTab(value)}
        />

        {groupedEntries.length === 0 ? (
          <MobileEmptyState
            title="Nada nessa faixa de agenda"
            description="Ajuste as camadas ou crie um novo evento para preencher a fila mobile."
            action={focusAction}
            icon={<SearchCheck className="h-8 w-8" />}
          />
        ) : (
          <div className="space-y-5">
            {groupedEntries.map(group => (
              <section key={group.label} className="space-y-3">
                <div className="px-1">
                  <p className="t-label text-[var(--text-tertiary)]">{group.label}</p>
                </div>

                <div className="space-y-3">
                  {group.items.map(entry => (
                    <MobileListCard
                      key={entry.id}
                      eyebrow={KIND_LABELS[entry.kind]}
                      title={entry.title}
                      description={entry.secondary || 'Sem contexto adicional'}
                      meta={
                        <span
                          className="rounded-full px-3 py-1 text-[11px] font-semibold"
                          style={{
                            backgroundColor: `${KIND_ACCENTS[entry.kind]}1A`,
                            color: KIND_ACCENTS[entry.kind],
                          }}
                        >
                          {entry.time ? `${entry.time} · ` : ''}
                          {format(parseISO(entry.date), 'dd/MM')}
                        </span>
                      }
                      trailing={
                        entry.kind === 'recording' ? (
                          <Mic2 className="h-4 w-4 text-[var(--accent-orange)]" />
                        ) : entry.kind === 'publish' ? (
                          <Radio className="h-4 w-4 text-[var(--accent-blue)]" />
                        ) : entry.kind === 'project' ? (
                          <BriefcaseBusiness className="h-4 w-4 text-[var(--accent-purple)]" />
                        ) : (
                          <Clapperboard className="h-4 w-4 text-[var(--accent-green)]" />
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <MobileFilterSheet
        open={isFilterSheetOpen}
        title="Filtrar agenda"
        onClose={() => setIsFilterSheetOpen(false)}
      >
        <label className="block space-y-2">
          <span className="t-label text-[var(--text-tertiary)]">Camadas visiveis</span>
          <div className="grid grid-cols-2 gap-2">
            {(['agenda', 'recording', 'publish', 'project'] as AgendaTimelineKind[]).map(kind => {
              const active = activeKinds.includes(kind);

              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() =>
                    setActiveKinds(current => {
                      if (current.includes(kind)) {
                        return current.length === 1 ? current : current.filter(item => item !== kind);
                      }

                      return [...current, kind];
                    })
                  }
                  className={`rounded-[1rem] border px-3 py-3 text-sm font-semibold transition-all ${
                    active
                      ? 'border-[var(--text-primary)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                  }`}
                >
                  {KIND_LABELS[kind]}
                </button>
              );
            })}
          </div>
        </label>

        <button
          type="button"
          onClick={() => {
            setActiveKinds(['agenda', 'recording', 'publish', 'project']);
            setIsFilterSheetOpen(false);
          }}
          className="button-primary w-full"
        >
          Limpar filtros
        </button>
      </MobileFilterSheet>
    </div>
  );
}
