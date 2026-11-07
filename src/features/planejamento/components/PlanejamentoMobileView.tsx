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
import {ArrowDownToLine, Bell, LayoutGrid, Plus, StickyNote} from 'lucide-react';
import {CalendarPeriodNav} from '../../../components/calendar';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {MoreMenu} from '../../../components/ui/MoreMenu';
import {DisclosureButton} from '../../../components/ui/DisclosureButton';
import {FilterChips} from '../../../components/ui/FilterChips';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import type {Content, Serie, Tema} from '../../../lib/database';
import type {PlanejamentoPostIt} from '../lib/postIt';
import type {VistaPlanejamento} from '../lib/periodoPlanejamento';
import {diasDoCalendario, type IntervaloSaude} from '../lib/saudeActions';
import {fimDeSemana} from '../lib/periodoPlanejamento';
import {SemDataPanel} from './SemDataPanel';
import {AvisosFaixa} from './AvisosFaixa';
import {BottomSheet} from '../../../components/overlays/BottomSheet';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {pontosParaRevisar, type AvisoOrientacao} from '../lib/orientacaoEditorial';
import {ReguaDeFrequencia} from './ReguaDeFrequencia';
import {classeDiaPausaPublicacao, linhasDaRegua, resumoDaRegua} from '../lib/reguaFrequencia';
import type {Continuidade} from '../lib/saudeIndicadores';

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
  onLimparDestaque?: () => void;
  temas: readonly Pick<Tema, 'id' | 'nome'>[];
  assuntoFiltroId: string | null;
  onAssuntoFiltroChange: (id: string | null) => void;
  /** Régua de frequência (3.4): faixa "Ritmo", fechada por padrão. */
  continuidade?: Continuidade<unknown> | null;
  /** Dias com pausa de publicação no período (hachura, como no computador). */
  pausedDateKeys?: ReadonlySet<string> | readonly string[];
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

function DayList({
  days,
  month,
  todayKey,
  byDate,
  renderPostIt,
  onNovoPostIt,
  onPuxar,
  emptyDays,
  pausedDateKeys,
}: {
  days: Date[];
  month: Date;
  todayKey: string;
  byDate: ReadonlyMap<string, PlanejamentoPostIt[]>;
  renderPostIt: (postIt: PlanejamentoPostIt) => ReactNode;
  onNovoPostIt: (date: string | null) => void;
  onPuxar: (date: string | null) => void;
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
    <div className={emptyDays === 'linha' ? 'stack-sm' : 'stack-md'}>
      {entries.map(item => {
        const isToday = item.key === todayKey;
        const pausado = classeDiaPausaPublicacao(item.key, pausedDateKeys);
        const fundo = !isToday && fimDeSemana(item.day) ? 'planejamento-fim-de-semana' : 'bg-[var(--bg-secondary)]';
        const seloPausa = pausado ? <Badge variant="neutral">Pausa de publicação</Badge> : null;
        if (emptyDays === 'linha' && item.postIts.length === 0) {
          return (
            <div
              key={item.key}
              data-date={item.key}
              data-dia-vazio={item.key}
              className={cn(
                'flex min-w-0 items-center justify-between gap-2 rounded-[var(--radius-card-mobile)] px-3 py-1',
                fundo,
                pausado,
              )}
            >
              <Text
                variant="meta"
                as="h3"
                className={cn('flex min-w-0 items-center gap-2 text-[var(--text-secondary)]', !isSameMonth(item.day, month) && 'text-[var(--text-tertiary)]')}
              >
                {dayLabel(item.day)}
                {isToday ? <Badge variant="neutral">Hoje</Badge> : null}
                {seloPausa}
              </Text>
              <div className="flex shrink-0 items-center gap-1">
                <AppButton variant="ghost" size="xs" leftIcon={<Plus className="h-3 w-3" />} aria-label={`Criar post-it em ${dayLabel(item.day)}`} onClick={() => onNovoPostIt(item.key)}>
                  Post-it
                </AppButton>
                <AppButton variant="ghost" size="xs" leftIcon={<ArrowDownToLine className="h-3 w-3" />} aria-label={`Puxar da Criação para ${dayLabel(item.day)}`} onClick={() => onPuxar(item.key)}>
                  Puxar
                </AppButton>
              </div>
            </div>
          );
        }
        return (
          <div key={item.key} data-date={item.key} className={cn(
            'stack-sm min-w-0 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] p-3',
            fundo,
            pausado,
          )}>
            <div className="flex items-center justify-between gap-2">
              <Text
                variant="label"
                as="h3"
                className={cn('flex items-center gap-2', !isSameMonth(item.day, month) && 'text-[var(--text-tertiary)]')}
              >
                {dayLabel(item.day)}
                {isToday ? <Badge variant="neutral">Hoje</Badge> : null}
                {seloPausa}
              </Text>
              <div className="flex items-center gap-1">
                <AppButton variant="ghost" size="xs" leftIcon={<Plus className="h-3 w-3" />} onClick={() => onNovoPostIt(item.key)}>
                  Post-it
                </AppButton>
                <AppButton variant="ghost" size="xs" leftIcon={<ArrowDownToLine className="h-3 w-3" />} onClick={() => onPuxar(item.key)}>
                  Puxar
                </AppButton>
              </div>
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
  onLimparDestaque,
  temas,
  assuntoFiltroId,
  onAssuntoFiltroChange,
  continuidade = null,
  pausedDateKeys,
}: PlanejamentoMobileViewProps) {
  const today = new Date();
  const todayKey = dateKey(today);
  const [undatedOpen, setUndatedOpen] = useState(undated.length > 0);
  const [avisosAbertos, setAvisosAbertos] = useState(false);
  const revisar = pontosParaRevisar(avisos);
  const undatedId = useId();
  const ritmoId = useId();
  const [ritmoAberto, setRitmoAberto] = useState(false);
  const linhasRegua = useMemo(() => linhasDaRegua(continuidade), [continuidade]);
  const currentWeekRef = useRef<HTMLElement | null>(null);

  const assuntoOptions = useMemo(
    () => [{id: TODOS_OS_ASSUNTOS, label: 'Todos'}, ...temas.map(tema => ({id: tema.id, label: tema.nome}))],
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

  // Período sem nenhuma pauta: semana visível ou dias do mês.
  const periodoVazio = useMemo(() => {
    const dias = vista === 'semana' ? weekDays : weeks.flatMap(week => week.days).filter(day => isSameMonth(day, month));
    return dias.every(day => (byDate.get(dateKey(day))?.length ?? 0) === 0);
  }, [vista, weekDays, weeks, month, byDate]);

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

      <div className="flex flex-wrap items-center gap-2">
        <CalendarPeriodNav
          anchorDate={month}
          onAnchorDateChange={onMonthChange}
          viewMode={vista}
          onViewModeChange={mode => onVistaChange(mode)}
          weekStartsOn={INICIO_DA_SEMANA}
          weekViewId="semana"
          views={[
            {id: 'mes' as const, label: 'Mês'},
            {id: 'semana' as const, label: 'Semana'},
          ]}
        />
        <AppButton variant="secondary" size="sm" leftIcon={<LayoutGrid className="h-4 w-4" />} onClick={onEditorial}>
          Editorial
        </AppButton>
        <AppButton
          variant="secondary"
          size="sm"
          leftIcon={<Bell className="h-4 w-4" />}
          onClick={() => setAvisosAbertos(true)}
        >
          {revisar > 0 ? `Avisos (${revisar})` : 'Avisos'}
        </AppButton>
      </div>

      {linhasRegua.length > 0 ? (
        <section className="min-w-0 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1">
          <DisclosureButton
            open={ritmoAberto}
            onToggle={() => setRitmoAberto(open => !open)}
            controls={ritmoId}
            trailing={(
              <Text variant="meta" as="span" className="truncate text-[var(--text-secondary)]">
                {resumoDaRegua(linhasRegua)}
              </Text>
            )}
          >
            <Text variant="sectionTitle" as="span">Ritmo</Text>
          </DisclosureButton>
          {ritmoAberto ? (
            <div id={ritmoId} className="p-2">
              <ReguaDeFrequencia continuidade={continuidade} compacto />
            </div>
          ) : null}
        </section>
      ) : null}

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
          onNovoPostIt={onNovoPostIt}
          onPuxar={onPuxar}
          emptyDays="card"
          pausedDateKeys={pausedDateKeys}
        />
      ) : (
        <div className="stack-sm">
          <Text variant="sectionTitle">
            {capitalizeFirst(format(month, "MMMM 'de' yyyy", {locale: ptBR}))}
          </Text>
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
                  renderPostIt={renderPostIt}
                  onNovoPostIt={onNovoPostIt}
                  onPuxar={onPuxar}
                  emptyDays="linha"
                  pausedDateKeys={pausedDateKeys}
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

      <BottomSheet
        open={avisosAbertos}
        onClose={() => setAvisosAbertos(false)}
        ariaLabel="Avisos do planejamento"
      >
        <OverlayHeader title="Avisos" onClose={() => setAvisosAbertos(false)} />
        <OverlayBody className="stack-md">
          <AvisosFaixa
            onFoiDeProposito={onFoiDeProposito}
            avisos={avisos}
            avisoAtivoId={avisoAtivoId}
            onLocalizar={aviso => {
              onLocalizarAviso?.(aviso);
              setAvisosAbertos(false);
            }}
            onLimparDestaque={onLimparDestaque}
            onVerAnalise={onVerAnalise ? () => {
              setAvisosAbertos(false);
              onVerAnalise();
            } : undefined}
            onAbrirEditorial={() => {
              setAvisosAbertos(false);
              onEditorial();
            }}
          />
        </OverlayBody>
      </BottomSheet>
    </div>
  );
}
