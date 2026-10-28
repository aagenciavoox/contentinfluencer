import {useEffect, useId, useMemo, useRef, useState, type ReactNode} from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Plus, StickyNote} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {MoreMenu} from '../../../components/ui/MoreMenu';
import {DisclosureButton} from '../../../components/ui/DisclosureButton';
import {FilterChips} from '../../../components/ui/FilterChips';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import type {PublicacaoNoDia} from '../lib/publicacoesDoMes';
import type {PlanejamentoPostIt} from '../lib/postIt';

const TODOS_OS_TEMAS = '__todos';
const WEEK_STARTS_ON = 0;

interface PlanejamentoMobileViewProps {
  month: Date;
  onMonthChange: (date: Date) => void;
  byDate: ReadonlyMap<string, PlanejamentoPostIt[]>;
  publicacoesDoDia: ReadonlyMap<string, PublicacaoNoDia[]>;
  undated: readonly PlanejamentoPostIt[];
  /** Post-it em largura toda, com o menu ⋯ (mover, tirar do mês, apagar). */
  renderPostIt: (postIt: PlanejamentoPostIt) => ReactNode;
  renderPublicacao: (publicacao: PublicacaoNoDia) => ReactNode;
  onNovoPostIt: (date: string | null) => void;
  onPuxar: (date: string | null) => void;
  monthHealth: ReactNode;
  temas: readonly {id: string; nome: string}[];
  temaFiltroId: string | null;
  onTemaFiltroChange: (id: string | null) => void;
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

/** Título do grupo das publicações do dia, pelo estado delas. */
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

interface MonthWeeksProps {
  month: Date;
  today: Date;
  todayKey: string;
  byDate: ReadonlyMap<string, PlanejamentoPostIt[]>;
  publicacoesDoDia: ReadonlyMap<string, PublicacaoNoDia[]>;
  renderPostIt: (postIt: PlanejamentoPostIt) => ReactNode;
  renderPublicacao: (publicacao: PublicacaoNoDia) => ReactNode;
  onNovoPostIt: (date: string | null) => void;
  onPuxar: (date: string | null) => void;
  undatedOpen: boolean;
  undatedId: string;
  undated: readonly PlanejamentoPostIt[];
  currentWeekRef: React.RefObject<HTMLElement | null>;
  setUndatedOpen: (open: boolean) => void;
}

function MonthWeeks({
  month,
  today,
  todayKey,
  byDate,
  publicacoesDoDia,
  renderPostIt,
  renderPublicacao,
  onNovoPostIt,
  onPuxar,
  undatedOpen,
  undatedId,
  undated,
  currentWeekRef,
  setUndatedOpen,
}: MonthWeeksProps) {
  const monthKey = format(month, 'yyyy-MM');

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const days = eachDayOfInterval({
      start: startOfWeek(monthStart, {weekStartsOn: WEEK_STARTS_ON}),
      end: endOfWeek(monthEnd, {weekStartsOn: WEEK_STARTS_ON}),
    });
    const list: {start: Date; end: Date; days: Date[]; defaultDay: Date}[] = [];
    for (let index = 0; index < days.length; index += 7) {
      const weekDays = days.slice(index, index + 7);
      const start = weekDays[0];
      const end = weekDays[weekDays.length - 1];
      const defaultDay =
        weekDays.find(day => isSameDay(day, today)) ??
        weekDays.find(day => isSameMonth(day, month)) ??
        start;
      list.push({start, end, days: weekDays, defaultDay});
    }
    return list;
  }, [monthKey, todayKey]);

  const currentWeekIndex = weeks.findIndex(week => isWithinInterval(today, {start: week.start, end: week.end}));

  useEffect(() => {
    if (currentWeekIndex <= 0) return;
    currentWeekRef.current?.scrollIntoView({block: 'start'});
  }, [monthKey]);

  return (
    <div className="stack-sm">
      {weeks.map((week, index) => {
        const isCurrent = index === currentWeekIndex;
        const daysWithItems = week.days
          .map(day => {
            const key = dateKey(day);
            return {
              day,
              key,
              publicacoes: publicacoesDoDia.get(key) ?? [],
              postIts: byDate.get(key) ?? [],
            };
          })
          .filter(item => item.publicacoes.length > 0 || item.postIts.length > 0);
        const total = daysWithItems.reduce((sum, item) => sum + item.publicacoes.length + item.postIts.length, 0);
        const defaultKey = dateKey(week.defaultDay);
        const title = `Semana ${weekRangeLabel(week.start, week.end)}`;

        const addMenu = (
          <MoreMenu
            align="right"
            size="sm"
            label={`Adicionar em ${title}`}
            trigger={<Plus className="h-4 w-4" />}
            items={[
              {id: 'post-it', label: 'Novo post-it', onClick: () => onNovoPostIt(defaultKey)},
              {id: 'puxar', label: 'Puxar conteúdo', onClick: () => onPuxar(defaultKey)},
            ]}
          />
        );

        return (
          <section
            key={week.start.toISOString()}
            ref={isCurrent ? element => { currentWeekRef.current = element; } : undefined}
            aria-label={title}
            className={cn(
              'min-w-0 rounded-[var(--radius-card-mobile)] border bg-[var(--bg-secondary)]',
              total === 0 ? 'py-0.5 pl-3 pr-1' : 'py-2 pl-3 pr-1',
              isCurrent ? 'border-[var(--border-strong)]' : 'border-[var(--border-color)]',
            )}
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <Text variant={total === 0 ? 'body' : 'sectionTitle'} as="h2" className={total === 0 ? 'text-[var(--text-secondary)]' : undefined}>
                  {title}
                </Text>
                <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                  · {total === 0 ? 'nada' : itemsLabel(total)}
                </Text>
                {isCurrent ? <Badge variant="neutral" className="self-center">Esta semana</Badge> : null}
              </div>
              {addMenu}
            </div>

            {daysWithItems.length > 0 ? (
              <div className="mb-1 mt-2 stack-md pr-2">
                {daysWithItems.map(item => {
                  const isToday = item.key === todayKey;
                  const ambos = item.publicacoes.length > 0 && item.postIts.length > 0;
                  return (
                    <div key={item.key} className="stack-sm min-w-0">
                      <Text
                        variant="label"
                        as="h3"
                        className={cn('flex items-center gap-2', !isSameMonth(item.day, month) && 'text-[var(--text-tertiary)]')}
                      >
                        {dayLabel(item.day)}
                        {isToday ? <Badge variant="neutral">Hoje</Badge> : null}
                      </Text>
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
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Planejamento no celular: o mês semana a semana, em lista. A grade de 7 colunas não cabe
 * em 390px (títulos quebravam letra a letra). Só aparecem os dias com algo; mover um
 * post-it é pelo menu ⋯ do card, porque arrastar não funciona bem no toque.
 */
export function PlanejamentoMobileView({
  month,
  onMonthChange,
  byDate,
  publicacoesDoDia,
  undated,
  renderPostIt,
  renderPublicacao,
  onNovoPostIt,
  onPuxar,
  monthHealth,
  temas,
  temaFiltroId,
  onTemaFiltroChange,
}: PlanejamentoMobileViewProps) {
  const today = new Date();
  const todayKey = dateKey(today);
  const nextMonth = useMemo(() => addMonths(month, 1), [month]);
  const [undatedOpen, setUndatedOpen] = useState(false);
  const undatedId = useId();
  const currentWeekRef = useRef<HTMLElement | null>(null);

  const temaOptions = useMemo(
    () => [{id: TODOS_OS_TEMAS, label: 'Todos'}, ...temas.map(tema => ({id: tema.id, label: tema.nome}))],
    [temas],
  );

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
          Puxar conteúdo
        </AppButton>
      </div>

      {monthHealth}

      {temas.length > 0 ? (
        <FilterChips
          ariaLabel="Destacar por tema"
          size="sm"
          layout="scroll"
          options={temaOptions}
          value={temaFiltroId ?? TODOS_OS_TEMAS}
          onChange={id => onTemaFiltroChange(id === TODOS_OS_TEMAS ? null : id)}
        />
      ) : null}

      <div className="stack-md">
        <Text variant="sectionTitle" className="mb-2">
          {capitalizeFirst(format(month, "MMMM 'de' yyyy", {locale: ptBR}))}
        </Text>
        <MonthWeeks
          month={month}
          today={today}
          todayKey={todayKey}
          byDate={byDate}
          publicacoesDoDia={publicacoesDoDia}
          renderPostIt={renderPostIt}
          renderPublicacao={renderPublicacao}
          onNovoPostIt={onNovoPostIt}
          onPuxar={onPuxar}
          undatedOpen={undatedOpen}
          undatedId={undatedId}
          undated={undated}
          currentWeekRef={currentWeekRef}
          setUndatedOpen={setUndatedOpen}
        />

        <Surface variant="plain" padding="sm" className="my-4">
          <div className="flex items-center justify-center gap-2 md:gap-6">
            <div className="flex items-center gap-2">
              <Text variant="meta" className="text-[var(--text-secondary)]">
                ↑
              </Text>
              <Text variant="meta" className="text-[var(--text-secondary)]">
                {capitalizeFirst(format(month, "MMMM 'de' yyyy", {locale: ptBR}))}
              </Text>
            </div>
            <div className="h-px w-8 bg-[var(--border-color)]" />
            <div className="flex items-center gap-2">
              <Text variant="meta" className="text-[var(--text-secondary)]">
                {capitalizeFirst(format(nextMonth, "MMMM 'de' yyyy", {locale: ptBR}))}
              </Text>
              <Text variant="meta" className="text-[var(--text-secondary)]">
                ↓
              </Text>
            </div>
          </div>
        </Surface>

        <Text variant="sectionTitle" className="mb-2">
          {capitalizeFirst(format(nextMonth, "MMMM 'de' yyyy", {locale: ptBR}))}
        </Text>
        <MonthWeeks
          month={nextMonth}
          today={today}
          todayKey={todayKey}
          byDate={byDate}
          publicacoesDoDia={publicacoesDoDia}
          renderPostIt={renderPostIt}
          renderPublicacao={renderPublicacao}
          onNovoPostIt={onNovoPostIt}
          onPuxar={onPuxar}
          undatedOpen={undatedOpen}
          undatedId={undatedId}
          undated={undated}
          currentWeekRef={currentWeekRef}
          setUndatedOpen={setUndatedOpen}
        />
      </div>

      {undated.length > 0 ? (
        <section className="min-w-0 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1">
          <DisclosureButton
            open={undatedOpen}
            onToggle={() => setUndatedOpen(open => !open)}
            controls={undatedId}
            trailing={<Badge variant="neutral">{undated.length}</Badge>}
          >
            <Text variant="sectionTitle" as="span">Fora do calendário</Text>
          </DisclosureButton>
          {undatedOpen ? (
            <div id={undatedId} className="stack-sm p-2">
              <Text variant="meta" className="text-[var(--text-secondary)]">
                Sem dia ainda. Use ⋯ no card para colocar em um dia.
              </Text>
              <ul className="stack-sm min-w-0">
                {undated.map(postIt => (
                  <li key={postIt.id} className="min-w-0">{renderPostIt(postIt)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
