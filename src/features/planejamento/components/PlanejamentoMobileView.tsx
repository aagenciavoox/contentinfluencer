import {useId, useMemo, useState, type ReactNode} from 'react';
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameMonth,
  startOfWeek,
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Plus, StickyNote} from 'lucide-react';
import {CalendarPeriodNav} from '../../../components/calendar';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
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
  filtersControl:ReactNode;
  contaControl:ReactNode;
  gradeFiltrada:boolean;
  onMoverContent:(content:Content)=>void;
  monthView: ReactNode;
  candidatos: readonly Content[];
  renderContent:(content:Content)=>ReactNode;
  onIncluirSemData:(content:Content)=>void;
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
  resumo: ReactNode;
  temas: readonly Pick<Tema, 'id' | 'nome'>[];
  assuntoFiltroId: string | null;
  onAssuntoFiltroChange: (id: string | null) => void;
}

function dateKey(day: Date) {
  return format(day, 'yyyy-MM-dd');
}

/** "ter, 14". */
function dayLabel(day: Date) {
  return `${format(day, 'EEE', {locale: ptBR}).replace('.', '')}, ${format(day, 'd')}`;
}

function publicadasLabel(publicacoes: readonly PublicacaoNoDia[]) {
  const postadas = publicacoes.filter(publicacao => publicacao.estado === 'postado').length;
  if (postadas === 0) return publicacoes.some(item => item.estado === 'programado') ? 'Previsões e programações' : 'Datas previstas';
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
        Nenhum post-it ou roteiro neste período.
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
                {ambos ? <GroupLabel>Post-its</GroupLabel> : null}
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
 * No celular, a semana usa dias em lista e o mês mantém a grade contínua.
 * Mover é pelo menu ⋯ do card.
 */
export function PlanejamentoMobileView({
  month,
  monthView,
  filtersControl,
  contaControl,
  gradeFiltrada,
  onMoverContent,
  candidatos,
  renderContent,
  onIncluirSemData,
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
  resumo,
  temas,
  assuntoFiltroId,
  onAssuntoFiltroChange,
}: PlanejamentoMobileViewProps) {
  const today = new Date();
  const todayKey = dateKey(today);
  const [undatedOpen, setUndatedOpen] = useState(false);
  const undatedId = useId();


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

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl stack-md">
      <div className="grid grid-cols-2 gap-2">
        <AppButton
          variant="primary"
          size="sm"
          className="w-full min-w-0"
          leftIcon={<StickyNote className="h-4 w-4" />}
          onClick={() => onNovoPostIt(null)}
        >
          Novo post-it
        </AppButton>
        <AppButton
          variant="secondary"
          size="sm"
          className="w-full min-w-0"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => onPuxar(null)}
        >
          Puxar conteúdo
        </AppButton>
      </div>

      <div className="sticky top-0 z-30 bg-[var(--bg-primary)] py-2 stack-sm">
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
        {filtersControl}
        <AppButton variant="secondary" size="sm" count={undated.length+candidatos.length} aria-expanded={undatedOpen} aria-controls={undatedId} onClick={()=>setUndatedOpen(open=>!open)}>Sem data</AppButton>
      </div>
      {contaControl}
      </div>
<details className="rounded-[var(--radius-card)] border border-[var(--border-color)] p-2"><summary className="cursor-pointer t-label">Saúde do mês · {format(month, 'MMMM yyyy', {locale:ptBR})}</summary><div className="mt-2">{resumo}</div></details>
      {gradeFiltrada ? <Text variant="meta">Grade filtrada. Indicadores do mês completo.</Text> : null}

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

      {undatedOpen ? <section id={undatedId} className="min-w-0 max-h-[60dvh] overflow-y-auto"><SemDataPanel renderContent={renderContent} candidatos={candidatos} onPuxar={onIncluirSemData} onMoverContent={onMoverContent} undated={undated} contents={contents} series={series} temas={temas} renderPostIt={renderPostIt} /></section> : null}

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
      ) : monthView}

    </div>
  );
}
