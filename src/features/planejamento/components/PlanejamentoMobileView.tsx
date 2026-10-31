import {useEffect, useId, useMemo, useRef, useState, type ReactNode} from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {LayoutGrid, Plus, StickyNote} from 'lucide-react';
import {CalendarPeriodNav} from '../../../components/calendar';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {MoreMenu} from '../../../components/ui/MoreMenu';
import {DisclosureButton} from '../../../components/ui/DisclosureButton';
import {FilterChips} from '../../../components/ui/FilterChips';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import type {Content, Serie, Tema} from '../../../lib/database';
import type {PublicacaoNoDia} from '../lib/publicacoesDoMes';
import type {PlanejamentoPostIt} from '../lib/postIt';
import type {VistaPlanejamento} from '../lib/periodoPlanejamento';
import {SemDataPanel} from './SemDataPanel';

const TODOS_OS_ASSUNTOS = '__todos';
const WEEK_STARTS_ON = 0;

interface PlanejamentoMobileViewProps {
  month: Date;
  onMonthChange: (date: Date) => void;
  vista: VistaPlanejamento;
  onVistaChange: (vista: VistaPlanejamento) => void;
  byDate: ReadonlyMap<string, PlanejamentoPostIt[]>;
  publicacoesDoDia: ReadonlyMap<string, PublicacaoNoDia[]>;
  undated: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  series: readonly Serie[];
  /** Post-it em largura toda, com o menu ⋯ (mover, tirar do período, apagar). */
  renderPostIt: (postIt: PlanejamentoPostIt) => ReactNode;
  renderPublicacao: (publicacao: PublicacaoNoDia) => ReactNode;
  onNovoPostIt: (date: string | null) => void;
  onPuxar: (date: string | null) => void;
  onEditorial: () => void;
  resumo: ReactNode;
  temas: readonly Pick<Tema, 'id' | 'nome'>[];
  assuntoFiltroId: string | null;
  onAssuntoFiltroChange: (id: string | null) => void;
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function dateKey(day: Date) {
  return format(day, 'yyyy-MM-dd');
}

/** "13–19 out" ou, virando o mês, "28 set–4 out". */
function weekRangeLabel(start: Date, end: Date) {
  if (isSameMonth(start, end)) {
    return `${format(start, 'd')}–${format(end, 'd')} ${format(end, 'MMM', {locale: ptBR})}`;
  }
  return `${format(start, 'd MMM', {locale: ptBR})}–${format(end, 'd MMM', {locale: ptBR})}`;
}

/** "ter, 14". */
function dayLabel(day: Date) {
  return `${format(day, 'EEE', {locale: ptBR}).replace('.', '')}, ${format(day, 'd')}`;
}

function itemsLabel(count: number) {
  return count === 1 ? '1 item' : `${count} itens`;
}

function publicadasLabel(publicacoes: readonly PublicacaoNoDia[]) {
  const postadas = publicacoes.filter(publicacao => publicacao.estado === 'postado').length;
  if (postadas === 0) return 'Programado';
  if (postadas === publicacoes.length) return 'Publicado';
  return 'Programado e publicado';
}

function GroupLabel({children}: {children: ReactNode}) {
  return (
    <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
      {children}
    </Text>
  );
}

function DayList({
  days,
  month,
  todayKey,
  byDate,
  publicacoesDoDia,
  renderPostIt,
  renderPublicacao,
  onNovoPostIt,
  showEmptyDays,
}: {
  days: Date[];
  month: Date;
  todayKey: string;
  byDate: ReadonlyMap<string, PlanejamentoPostIt[]>;
  publicacoesDoDia: ReadonlyMap<string, PublicacaoNoDia[]>;
  renderPostIt: (postIt: PlanejamentoPostIt) => ReactNode;
  renderPublicacao: (publicacao: PublicacaoNoDia) => ReactNode;
  onNovoPostIt: (date: string | null) => void;
  showEmptyDays: boolean;
}) {
  const entries = days
    .map(day => {
      const key = dateKey(day);
      return {
        day,
        key,
        publicacoes: publicacoesDoDia.get(key) ?? [],
        postIts: byDate.get(key) ?? [],
      };
    })
    .filter(item => showEmptyDays || item.publicacoes.length > 0 || item.postIts.length > 0);

  if (entries.length === 0) {
    return (
      <Text variant="meta" className="text-[var(--text-secondary)]">
        Nenhuma pauta neste período.
      </Text>
    );
  }

  return (
    <div className="stack-md">
      {entries.map(item => {
        const isToday = item.key === todayKey;
        const ambos = item.publicacoes.length > 0 && item.postIts.length > 0;
        return (
          <div key={item.key} className="stack-sm min-w-0 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
            <div className="flex items-center justify-between gap-2">
              <Text
                variant="label"
                as="h3"
                className={cn('flex items-center gap-2', !isSameMonth(item.day, month) && 'text-[var(--text-tertiary)]')}
              >
                {dayLabel(item.day)}
                {isToday ? <Badge variant="neutral">Hoje</Badge> : null}
              </Text>
              <AppButton variant="ghost" size="xs" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => onNovoPostIt(item.key)}>
                Adicionar
              </AppButton>
            </div>
            {item.publicacoes.length > 0 ? (
              <div className="stack-sm min-w-0">
                {ambos ? <GroupLabel>{publicadasLabel(item.publicacoes)}</GroupLabel> : null}
                <ul className="stack-sm min-w-0">
                  {item.publicacoes.map(publicacao => (
                    <li key={publicacao.id} className="min-w-0">{renderPublicacao(publicacao)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {item.postIts.length > 0 ? (
              <div className="stack-sm min-w-0">
                {ambos ? <GroupLabel>Rascunhos</GroupLabel> : null}
                <ul className="stack-sm min-w-0">
                  {item.postIts.map(postIt => (
                    <li key={postIt.id} className="min-w-0">{renderPostIt(postIt)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Planejamento no celular: dias em lista. Semana mostra os 7 dias; mês agrupa por semana.
 * Mover é pelo menu ⋯ do card.
 */
export function PlanejamentoMobileView({
  month,
  onMonthChange,
  vista,
  onVistaChange,
  byDate,
  publicacoesDoDia,
  undated,
  contents,
  series,
  renderPostIt,
  renderPublicacao,
  onNovoPostIt,
  onPuxar,
  onEditorial,
  resumo,
  temas,
  assuntoFiltroId,
  onAssuntoFiltroChange,
}: PlanejamentoMobileViewProps) {
  const today = new Date();
  const todayKey = dateKey(today);
  const [undatedOpen, setUndatedOpen] = useState(undated.length > 0);
  const undatedId = useId();
  const currentWeekRef = useRef<HTMLElement | null>(null);

  const assuntoOptions = useMemo(
    () => [{id: TODOS_OS_ASSUNTOS, label: 'Todos'}, ...temas.map(tema => ({id: tema.id, label: tema.nome}))],
    [temas],
  );

  const weekDays = useMemo(
    () => eachDayOfInterval({
      start: startOfWeek(month, {weekStartsOn: WEEK_STARTS_ON}),
      end: endOfWeek(month, {weekStartsOn: WEEK_STARTS_ON}),
    }),
    [month],
  );

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const days = eachDayOfInterval({
      start: startOfWeek(monthStart, {weekStartsOn: WEEK_STARTS_ON}),
      end: endOfWeek(monthEnd, {weekStartsOn: WEEK_STARTS_ON}),
    });
    const list: {start: Date; end: Date; days: Date[]}[] = [];
    for (let index = 0; index < days.length; index += 7) {
      const slice = days.slice(index, index + 7);
      list.push({start: slice[0], end: slice[slice.length - 1], days: slice});
    }
    return list;
  }, [month]);

  useEffect(() => {
    if (vista !== 'mes') return;
    const index = weeks.findIndex(week => isWithinInterval(today, {start: week.start, end: week.end}));
    if (index <= 0) return;
    currentWeekRef.current?.scrollIntoView({block: 'start'});
  }, [vista, month]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl stack-md">
      <div className="grid grid-cols-2 gap-2">
        <AppButton
          variant="secondary"
          size="sm"
          className="w-full min-w-0"
          leftIcon={<StickyNote className="h-4 w-4" />}
          onClick={() => onNovoPostIt(null)}
        >
          Novo post-it
        </AppButton>
        <AppButton
          variant="primary"
          size="sm"
          className="w-full min-w-0"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => onPuxar(null)}
        >
          Puxar da Criação
        </AppButton>
      </div>

      {resumo}

      <div className="flex flex-wrap items-center gap-2">
        <CalendarPeriodNav
          anchorDate={month}
          onAnchorDateChange={onMonthChange}
          viewMode={vista}
          onViewModeChange={mode => onVistaChange(mode)}
          weekViewId="semana"
          views={[
            {id: 'semana' as const, label: 'Semana'},
            {id: 'mes' as const, label: 'Mês'},
          ]}
        />
        <AppButton variant="secondary" size="sm" leftIcon={<LayoutGrid className="h-4 w-4" />} onClick={onEditorial}>
          Editorial
        </AppButton>
      </div>

      {temas.length > 0 ? (
        <FilterChips
          ariaLabel="Destacar por assunto"
          size="sm"
          layout="scroll"
          options={assuntoOptions}
          value={assuntoFiltroId ?? TODOS_OS_ASSUNTOS}
          onChange={id => onAssuntoFiltroChange(id === TODOS_OS_ASSUNTOS ? null : id)}
        />
      ) : null}

      {vista === 'semana' ? (
        <DayList
          days={weekDays}
          month={month}
          todayKey={todayKey}
          byDate={byDate}
          publicacoesDoDia={publicacoesDoDia}
          renderPostIt={renderPostIt}
          renderPublicacao={renderPublicacao}
          onNovoPostIt={onNovoPostIt}
          showEmptyDays
        />
      ) : (
        <div className="stack-sm">
          <Text variant="sectionTitle">
            {capitalizeFirst(format(month, "MMMM 'de' yyyy", {locale: ptBR}))}
          </Text>
          {weeks.map(week => {
            const isCurrent = isWithinInterval(today, {start: week.start, end: week.end});
            const total = week.days.reduce(
              (sum, day) => sum + (byDate.get(dateKey(day))?.length ?? 0) + (publicacoesDoDia.get(dateKey(day))?.length ?? 0),
              0,
            );
            const title = `Semana ${weekRangeLabel(week.start, week.end)}`;
            return (
              <section
                key={week.start.toISOString()}
                ref={isCurrent ? element => { currentWeekRef.current = element; } : undefined}
                aria-label={title}
                className={cn(
                  'min-w-0 rounded-[var(--radius-card-mobile)] border bg-[var(--bg-secondary)] p-3',
                  isCurrent ? 'border-[var(--border-strong)]' : 'border-[var(--border-color)]',
                )}
              >
                <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                    <Text variant="sectionTitle" as="h2">{title}</Text>
                    <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                      · {total === 0 ? 'nada' : itemsLabel(total)}
                    </Text>
                    {isCurrent ? <Badge variant="neutral">Esta semana</Badge> : null}
                  </div>
                  <MoreMenu
                    align="right"
                    size="sm"
                    label={`Adicionar em ${title}`}
                    trigger={<Plus className="h-4 w-4" />}
                    items={[
                      {id: 'post-it', label: 'Novo post-it', onClick: () => onNovoPostIt(dateKey(week.days[0]))},
                      {id: 'puxar', label: 'Puxar da Criação', onClick: () => onPuxar(dateKey(week.days[0]))},
                    ]}
                  />
                </div>
                <DayList
                  days={week.days}
                  month={month}
                  todayKey={todayKey}
                  byDate={byDate}
                  publicacoesDoDia={publicacoesDoDia}
                  renderPostIt={renderPostIt}
                  renderPublicacao={renderPublicacao}
                  onNovoPostIt={onNovoPostIt}
                  showEmptyDays={false}
                />
              </section>
            );
          })}
        </div>
      )}

      <section className="min-w-0 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1">
        <DisclosureButton
          open={undatedOpen}
          onToggle={() => setUndatedOpen(open => !open)}
          controls={undatedId}
          trailing={<Badge variant="neutral">{undated.length}</Badge>}
        >
          <Text variant="sectionTitle" as="span">Sem data</Text>
        </DisclosureButton>
        {undatedOpen ? (
          <div id={undatedId} className="p-2">
            <SemDataPanel
              undated={undated}
              contents={contents}
              series={series}
              temas={temas}
              compactHint
              renderPostIt={renderPostIt}
              className="border-0 bg-transparent p-0 shadow-none"
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
