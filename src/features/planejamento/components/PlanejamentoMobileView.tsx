import {INICIO_DA_SEMANA} from '../../../lib/semana.ts';
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
import {ArrowDownToLine, MoreHorizontal, Plus, SlidersHorizontal, StickyNote, X} from 'lucide-react';
import {CalendarPeriodNav} from '../../../components/calendar';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {Badge} from '../../../components/ui/Badge';
import {MoreMenu, type MoreMenuItem} from '../../../components/ui/MoreMenu';
import {DisclosureButton} from '../../../components/ui/DisclosureButton';
import {SegmentTabs} from '../../../components/ui/SegmentTabs';
import {Text} from '../../../components/ui/Text';
import {MobileFilterSelect, MobileFilterSheet} from '../../../mobile/components/MobileFilterSheet';
import {CreationRedeQuickFilter} from '../../creation/components/CreationRedeQuickFilter';
import {redesDoFiltroRapido} from '../../creation/lib/creationRedeFilter';
import {ROTULO_REDE_DO_FILTRO} from '../../contas/lib/contas';
import {cn} from '../../../lib/utils';
import type {Content, Platform, Serie, Tema} from '../../../lib/database';
import type {PlanejamentoPostIt} from '../lib/postIt';
import type {VistaPlanejamento} from '../lib/periodoPlanejamento';
import {diasDoCalendario, type IntervaloSaude} from '../lib/saudeActions';
import {fimDeSemana} from '../lib/periodoPlanejamento';
import {formatosDoFiltro, type FiltroCalendario} from '../lib/filtroCalendario';
import {SemDataPanel} from './SemDataPanel';
import {pontosParaRevisar, type AvisoOrientacao} from '../lib/orientacaoEditorial';
import {classeDiaPausaPublicacao, linhasDaRegua} from '../lib/reguaFrequencia';
import type {Continuidade} from '../lib/saudeIndicadores';
import {PlanejamentoSaudeDrawer, type AbaSaudeDrawer} from './PlanejamentoSaudeDrawer';

/** Convite do período sem pauta (celular). */
export const CONVITE_PERIODO_VAZIO = 'Período livre por aqui. Que tal criar um post-it ou puxar algo da Criação?';

const TODOS_OS_ASSUNTOS = '__todos';
const WEEK_STARTS_ON = INICIO_DA_SEMANA;

interface PlanejamentoMobileViewProps {
  month: Date;
  intervalo?: IntervaloSaude | null;
  onMonthChange: (date: Date) => void;
  vista: VistaPlanejamento;
  onVistaChange: (vista: VistaPlanejamento) => void;
  byDate: ReadonlyMap<string, PlanejamentoPostIt[]>;
  undated: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  series: readonly Serie[];
  /** Post-it em largura toda, com o menu ⋯ (mover, tirar do período, apagar). */
  renderPostIt: (postIt: PlanejamentoPostIt) => ReactNode;
  onNovoPostIt: (date: string | null) => void;
  onPuxar: (date: string | null) => void;
  onEditorial: () => void;
  onVerAnalise?: () => void;
  /** Avisos do trecho: abrem num sheet, sem empurrar os dias (Fase 3.1). */
  avisos?: readonly AvisoOrientacao[];
  avisoAtivoId?: string | null;
  onLocalizarAviso?: (aviso: AvisoOrientacao) => void;
  onFoiDeProposito?: (aviso: AvisoOrientacao) => void;
  onQueroFazerAMais?: (aviso: AvisoOrientacao) => void;
  onLimparDestaque?: () => void;
  temas: readonly Pick<Tema, 'id' | 'nome'>[];
  assuntoFiltroId: string | null;
  onAssuntoFiltroChange: (id: string | null) => void;
  filtro?: FiltroCalendario;
  onFiltroChange?: (filtro: FiltroCalendario) => void;
  platforms?: readonly Platform[];
  dataReady?: boolean;
  focusDateKey?: string | null;
  /** Régua de frequência (3.4): faixa "Ritmo", fechada por padrão. */
  continuidade?: Continuidade<unknown> | null;
  /** Dias com pausa de publicação no período (hachura, como no computador). */
  pausedDateKeys?: ReadonlySet<string> | readonly string[];
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

function DayList({
  days,
  month,
  todayKey,
  byDate,
  renderPostIt,
  onAddDay,
  emptyDays,
  pausedDateKeys,
}: {
  days: Date[];
  month: Date;
  todayKey: string;
  byDate: ReadonlyMap<string, PlanejamentoPostIt[]>;
  renderPostIt: (postIt: PlanejamentoPostIt) => ReactNode;
  onAddDay: (date: string, label: string) => void;
  /** Semana: dia vazio no card cheio. Mês: dia vazio numa linha curta. */
  emptyDays: 'card' | 'linha';
  pausedDateKeys?: ReadonlySet<string> | readonly string[];
}) {
  const entries = days
    .map(day => {
      const key = dateKey(day);
      return {
        day,
        key,
        postIts: byDate.get(key) ?? [],
      };
    });

  return (
    <div className={emptyDays === 'linha' ? 'stack-xs' : 'stack-md'}>
      {entries.map(item => {
        const isToday = item.key === todayKey;
        const label = dayLabel(item.day);
        const pausado = classeDiaPausaPublicacao(item.key, pausedDateKeys);
        const fundo = !isToday && fimDeSemana(item.day) ? 'planejamento-fim-de-semana' : 'bg-[var(--bg-secondary)]';
        const seloPausa = pausado ? <Badge variant="neutral">Pausa de publicação</Badge> : null;
        if (emptyDays === 'linha' && item.postIts.length === 0) {
          return (
            <button
              key={item.key}
              type="button"
              data-date={item.key}
              data-dia-vazio={item.key}
              aria-label={`Adicionar em ${label}`}
              onClick={() => onAddDay(item.key, label)}
              className={cn(
                'flex min-h-11 w-full min-w-0 scroll-mt-24 items-center justify-between gap-2 rounded-[var(--radius-card-mobile)] px-3 py-2 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                fundo,
                pausado,
              )}
            >
              <Text
                variant="meta"
                as="span"
                className={cn('flex min-w-0 items-center gap-2 text-[var(--text-secondary)]', !isSameMonth(item.day, month) && 'text-[var(--text-tertiary)]')}
              >
                {label}
                {isToday ? <Badge variant="neutral">Hoje</Badge> : null}
                {seloPausa}
              </Text>
              <Plus className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
            </button>
          );
        }
        return (
          <div key={item.key} data-date={item.key} className={cn(
            'stack-sm min-w-0 scroll-mt-24 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] p-3',
            fundo,
            pausado,
          )}>
            <div className="flex items-center justify-between gap-2">
              <Text
                variant="label"
                as="h3"
                className={cn('flex items-center gap-2', !isSameMonth(item.day, month) && 'text-[var(--text-tertiary)]')}
              >
                {label}
                {isToday ? <Badge variant="neutral">Hoje</Badge> : null}
                {seloPausa}
              </Text>
              <button
                type="button"
                aria-label={`Adicionar em ${label}`}
                onClick={() => onAddDay(item.key, label)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {item.postIts.length > 0 ? (
              <ul className="stack-sm min-w-0">
                {item.postIts.map(postIt => (
                  <li key={postIt.id} className="min-w-0">{renderPostIt(postIt)}</li>
                ))}
              </ul>
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
  intervalo,
  onMonthChange,
  vista,
  onVistaChange,
  byDate,
  undated,
  contents,
  series,
  renderPostIt,
  onNovoPostIt,
  onPuxar,
  onEditorial,
  onVerAnalise,
  avisos = [],
  avisoAtivoId = null,
  onLocalizarAviso,
  onFoiDeProposito,
  onQueroFazerAMais,
  onLimparDestaque,
  temas,
  assuntoFiltroId,
  onAssuntoFiltroChange,
  filtro,
  onFiltroChange,
  platforms = [],
  dataReady = true,
  focusDateKey = null,
  continuidade = null,
  pausedDateKeys,
}: PlanejamentoMobileViewProps) {
  const today = new Date();
  const todayKey = dateKey(today);
  const [undatedOpen, setUndatedOpen] = useState(undated.length > 0);
  const [saudeDrawerAberto, setSaudeDrawerAberto] = useState(false);
  const [abaSaude, setAbaSaude] = useState<AbaSaudeDrawer>('ajustes');
  const [addSheetTarget, setAddSheetTarget] = useState<{date: string | null; label?: string} | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const revisar = pontosParaRevisar(avisos);
  const totalAjustes = revisar > 0 ? revisar : avisos.length;
  const undatedId = useId();
  const linhasRegua = useMemo(() => linhasDaRegua(continuidade), [continuidade]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentWeekRef = useRef<HTMLElement | null>(null);
  const didInitialScrollRef = useRef(false);
  const pendingTodayScrollRef = useRef(false);

  const filtroAtual: FiltroCalendario = filtro ?? {redes: [], formato: null};
  const redesDisponiveis = useMemo(
    () => redesDoFiltroRapido(platforms, filtroAtual.redes),
    [platforms, filtroAtual.redes],
  );
  const formatoOptions = useMemo(
    () => [{value: 'todos', label: 'Todos'}, ...formatosDoFiltro()],
    [],
  );
  const assuntoAtivo = assuntoFiltroId ? temas.find(tema => tema.id === assuntoFiltroId) ?? null : null;
  const activeFilterCount =
    (assuntoFiltroId ? 1 : 0)
    + filtroAtual.redes.length
    + (filtroAtual.formato ? 1 : 0);
  const hasAnyFilterOption = temas.length > 0 || redesDisponiveis.length > 1 || Boolean(onFiltroChange);

  const clearAllFilters = () => {
    onAssuntoFiltroChange(null);
    onFiltroChange?.({redes: [], formato: null});
  };

  const abrirSaude = (aba: AbaSaudeDrawer) => {
    setAbaSaude(aba);
    setSaudeDrawerAberto(true);
  };

  const opcoesMenu: MoreMenuItem[] = [
    {id: 'editorial', label: 'Editorial', onClick: onEditorial},
    {
      id: 'ajustes',
      label: totalAjustes > 0 ? `Ajustes (${totalAjustes})` : 'Ajustes',
      onClick: () => abrirSaude('ajustes'),
    },
    ...(linhasRegua.length > 0
      ? [{id: 'ritmo', label: `Ritmo (${linhasRegua.length})`, onClick: () => abrirSaude('ritmo')}]
      : []),
  ];

  useEffect(() => {
    const abrirRitmo = () => {
      setAbaSaude('ritmo');
      setSaudeDrawerAberto(true);
    };
    window.addEventListener('criaki:abrir-ritmo', abrirRitmo);
    return () => window.removeEventListener('criaki:abrir-ritmo', abrirRitmo);
  }, []);

  const assuntoOptions = useMemo(
    () => [{value: TODOS_OS_ASSUNTOS, label: 'Todos os assuntos'}, ...temas.map(tema => ({value: tema.id, label: tema.nome}))],
    [temas],
  );

  const weekDays = useMemo(
    () => diasDoCalendario(month, intervalo),
    [month, intervalo],
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

  // Contagem de pautas visíveis no período atual (para "Ver resultados (N)" na folha de filtros).
  const totalResultadosPeriodo = useMemo(() => {
    const dias = vista === 'semana' ? weekDays : weeks.flatMap(week => week.days).filter(day => isSameMonth(day, month));
    return dias.reduce((sum, day) => sum + (byDate.get(dateKey(day))?.length ?? 0), 0);
  }, [vista, weekDays, weeks, month, byDate]);

  // Período sem nenhuma pauta: semana visível ou dias do mês.
  const periodoVazio = totalResultadosPeriodo === 0;

  // Rolagem automática: só uma vez na abertura (depois que os dados carregam), priorizando ?data=/?postit=.
  useEffect(() => {
    if (didInitialScrollRef.current || !dataReady || vista !== 'mes') return;
    if (focusDateKey) {
      const focusDate = new Date(`${focusDateKey}T12:00:00`);
      if (isSameMonth(focusDate, month)) {
        didInitialScrollRef.current = true;
        const target = containerRef.current?.querySelector(`[data-date="${focusDateKey}"]`);
        target?.scrollIntoView({behavior: 'smooth', block: 'start'});
        return;
      }
    }
    didInitialScrollRef.current = true;
    const index = weeks.findIndex(week => isWithinInterval(today, {start: week.start, end: week.end}));
    if (index > 0) {
      currentWeekRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }, [dataReady, byDate, vista, month, focusDateKey, weeks]);

  // Rolagem explícita ao tocar em "Hoje".
  useEffect(() => {
    if (!pendingTodayScrollRef.current || vista !== 'mes') return;
    const index = weeks.findIndex(week => isWithinInterval(today, {start: week.start, end: week.end}));
    if (index < 0) return;
    pendingTodayScrollRef.current = false;
    currentWeekRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }, [month, vista, weeks]);

  return (
    <div ref={containerRef} className="mx-auto w-full min-w-0 max-w-2xl pb-20 stack-md">
      <div className="stack-sm">
        {/* Faixa 1 fixa no topo: Período (reusando CalendarPeriodNav) + filtro + opções */}
        <div className="sticky top-0 z-20 -mx-1 flex items-center justify-between gap-1.5 bg-[var(--bg-primary)]/95 px-1 py-1.5 backdrop-blur-sm">
          <CalendarPeriodNav
            anchorDate={month}
            onAnchorDateChange={onMonthChange}
            viewMode={vista}
            onViewModeChange={mode => onVistaChange(mode)}
            weekStartsOn={WEEK_STARTS_ON}
            weekViewId="semana"
            views={[]}
            todayWhenOutside
            todayPosition="after"
            touchArrows
            onTodayClick={() => {
              pendingTodayScrollRef.current = true;
            }}
            className="min-w-0 flex-1 flex-nowrap gap-1"
          />

          <div className="flex shrink-0 items-center gap-1">
            {hasAnyFilterOption ? (
              <button
                type="button"
                onClick={() => setFilterSheetOpen(true)}
                aria-label={activeFilterCount > 0 ? `Filtros (${activeFilterCount} ativos)` : 'Abrir filtros'}
                aria-pressed={activeFilterCount > 0}
                className={cn(
                  'relative inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-[var(--radius-input)] border px-2.5 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                  activeFilterCount > 0
                    ? 'border-[var(--text-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                )}
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                {activeFilterCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--text-primary)] px-1 t-label tabular-nums text-[var(--bg-primary)]">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            ) : null}

            <MoreMenu
              align="right"
              label="Opções do planejamento"
              items={opcoesMenu}
              trigger={
                <span className="relative inline-flex items-center justify-center">
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                  {revisar > 0 ? (
                    <span
                      className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--accent-orange)]"
                      aria-hidden
                    />
                  ) : null}
                </span>
              }
            />
          </div>
        </div>

        {/* Faixa 2: Vista full-width estilo iOS */}
        <SegmentTabs<VistaPlanejamento>
          ariaLabel="Vista"
          value={vista}
          onChange={mode => onVistaChange(mode)}
          fullWidth
          options={[
            {id: 'mes', label: 'Mês'},
            {id: 'semana', label: 'Semana'},
          ]}
        />

        {activeFilterCount > 0 ? (
          <div className="mobile-h-scroll scrollbar-none flex items-center gap-1.5 overflow-x-auto">
            {assuntoAtivo ? (
              <button
                type="button"
                onClick={() => onAssuntoFiltroChange(null)}
                aria-label={`Remover filtro de assunto ${assuntoAtivo.nome}`}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--text-primary)] bg-[var(--bg-elevated)] px-3 py-1.5 t-label text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <span>Assunto: {assuntoAtivo.nome}</span>
                <X className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" aria-hidden />
              </button>
            ) : null}
            {filtroAtual.formato && onFiltroChange ? (() => {
              const formatoLabel = formatoOptions.find(opt => opt.value === filtroAtual.formato)?.label ?? filtroAtual.formato;
              return (
                <button
                  type="button"
                  onClick={() => onFiltroChange({...filtroAtual, formato: null})}
                  aria-label={`Remover filtro de formato ${formatoLabel}`}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--text-primary)] bg-[var(--bg-elevated)] px-3 py-1.5 t-label text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <span>Formato: {formatoLabel}</span>
                  <X className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" aria-hidden />
                </button>
              );
            })() : null}
            {onFiltroChange ? filtroAtual.redes.map(rede => (
              <button
                key={rede}
                type="button"
                onClick={() => onFiltroChange({...filtroAtual, redes: filtroAtual.redes.filter(item => item !== rede)})}
                aria-label={`Remover filtro de rede ${ROTULO_REDE_DO_FILTRO[rede]}`}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--text-primary)] bg-[var(--bg-elevated)] px-3 py-1.5 t-label text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <span>{ROTULO_REDE_DO_FILTRO[rede]}</span>
                <X className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" aria-hidden />
              </button>
            )) : null}
          </div>
        ) : null}
      </div>

      {periodoVazio ? (
        <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
          {CONVITE_PERIODO_VAZIO}
        </Text>
      ) : null}

      {vista === 'semana' ? (
        <DayList
          days={weekDays}
          month={month}
          todayKey={todayKey}
          byDate={byDate}
          renderPostIt={renderPostIt}
          onAddDay={(date, label) => setAddSheetTarget({date, label})}
          emptyDays="card"
          pausedDateKeys={pausedDateKeys}
        />
      ) : (
        <div className="stack-sm">
          {weeks.map(week => {
            const isCurrent = isWithinInterval(today, {start: week.start, end: week.end});
            const total = week.days.reduce(
              (sum, day) => sum + (byDate.get(dateKey(day))?.length ?? 0),
              0,
            );
            const title = `Semana ${weekRangeLabel(week.start, week.end)}`;
            return (
              <section
                key={week.start.toISOString()}
                ref={isCurrent ? element => { currentWeekRef.current = element; } : undefined}
                aria-label={title}
                className={cn(
                  'min-w-0 scroll-mt-24 rounded-[var(--radius-card-mobile)] border bg-[var(--bg-secondary)] p-3',
                  isCurrent ? 'border-[var(--border-strong)]' : 'border-[var(--border-color)]',
                )}
              >
                <div className="mb-2 flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <Text variant="sectionTitle" as="h2">{title}</Text>
                  <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                    · {total === 0 ? 'nada' : itemsLabel(total)}
                  </Text>
                  {isCurrent ? <Badge variant="neutral">Esta semana</Badge> : null}
                </div>
                <DayList
                  days={week.days}
                  month={month}
                  todayKey={todayKey}
                  byDate={byDate}
                  renderPostIt={renderPostIt}
                  onAddDay={(date, label) => setAddSheetTarget({date, label})}
                  emptyDays="linha"
                  pausedDateKeys={pausedDateKeys}
                />
              </section>
            );
          })}
        </div>
      )}

      <MobileFilterSheet
        open={filterSheetOpen}
        title="Filtrar planejamento"
        onClose={() => setFilterSheetOpen(false)}
        onClear={activeFilterCount > 0 ? () => {
          clearAllFilters();
          setFilterSheetOpen(false);
        } : undefined}
        clearLabel="Limpar filtros"
        resultCount={totalResultadosPeriodo}
      >
        {redesDisponiveis.length > 1 && onFiltroChange ? (
          <div className="stack-xs">
            <Text variant="label" as="p" className="text-[var(--text-secondary)]">
              Redes
            </Text>
            <CreationRedeQuickFilter
              redes={redesDisponiveis}
              value={filtroAtual.redes}
              onChange={redes => onFiltroChange({...filtroAtual, redes})}
              compacto
            />
          </div>
        ) : null}
        {onFiltroChange ? (
          <MobileFilterSelect
            label="Formato"
            value={filtroAtual.formato ?? 'todos'}
            onChange={value => onFiltroChange({...filtroAtual, formato: value === 'todos' ? null : value})}
            options={formatoOptions}
          />
        ) : null}
        {temas.length > 0 ? (
          <MobileFilterSelect
            label="Destacar por assunto"
            value={assuntoFiltroId ?? TODOS_OS_ASSUNTOS}
            onChange={value => onAssuntoFiltroChange(value === TODOS_OS_ASSUNTOS ? null : value)}
            options={assuntoOptions}
          />
        ) : null}
      </MobileFilterSheet>

      <button
        type="button"
        aria-label="Adicionar ao planejamento"
        onClick={() => setAddSheetTarget({date: null})}
        className="fixed right-4 z-40 bottom-[calc(4.5rem+max(0.25rem,env(safe-area-inset-bottom,0px)))] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-[var(--shadow-modal)] transition-transform active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <Plus className="h-6 w-6" aria-hidden />
      </button>

      <Dialog
        open={addSheetTarget !== null}
        onClose={() => setAddSheetTarget(null)}
        ariaLabel={addSheetTarget?.label ? `Adicionar em ${addSheetTarget.label}` : 'Adicionar no planejamento'}
      >
        <OverlayHeader
          title={addSheetTarget?.label ? `Adicionar em ${addSheetTarget.label}` : 'Adicionar ao planejamento'}
          onClose={() => setAddSheetTarget(null)}
        />
        <div className="stack-sm p-4">
          <button
            type="button"
            onClick={() => {
              const date = addSheetTarget?.date ?? null;
              setAddSheetTarget(null);
              onPuxar(date);
            }}
            className="flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <ArrowDownToLine className="h-5 w-5 shrink-0 text-[var(--text-primary)]" aria-hidden />
            <div className="min-w-0 flex-1">
              <Text variant="bodyStrong" as="p">Puxar da Criação</Text>
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                Trazer um roteiro ou ideia existente
              </Text>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              const date = addSheetTarget?.date ?? null;
              setAddSheetTarget(null);
              onNovoPostIt(date);
            }}
            className="flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <StickyNote className="h-5 w-5 shrink-0 text-[var(--text-primary)]" aria-hidden />
            <div className="min-w-0 flex-1">
              <Text variant="bodyStrong" as="p">Novo post-it</Text>
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                Criar uma pauta rápida para planejar
              </Text>
            </div>
          </button>
        </div>
      </Dialog>

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

      <PlanejamentoSaudeDrawer
        open={saudeDrawerAberto}
        abaAtiva={abaSaude}
        onAbaChange={setAbaSaude}
        onClose={() => setSaudeDrawerAberto(false)}
        avisos={avisos}
        avisoAtivoId={avisoAtivoId}
        onLocalizar={aviso => onLocalizarAviso?.(aviso)}
        onFoiDeProposito={onFoiDeProposito}
        onQueroFazerAMais={onQueroFazerAMais}
        onLimparDestaque={onLimparDestaque}
        continuidade={continuidade}
        onVerAnalise={() => onVerAnalise?.()}
      />
    </div>
  );
}
