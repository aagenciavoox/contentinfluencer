import {eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {ArrowDownToLine, Plus} from 'lucide-react';
import type {ReactNode} from 'react';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import type {PublicacaoNoDia} from '../lib/publicacoesDoMes';
import type {PlanejamentoPostIt} from '../lib/postIt';

const WEEK_STARTS_ON = 1;
const WEEKDAYS_SHORT_PT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;

function dateKey(day: Date) {
  return format(day, 'yyyy-MM-dd');
}

function weekdayLabel(day: Date) {
  return WEEKDAYS_SHORT_PT[day.getDay()];
}

export function PlanejamentoWeekGrid({
  anchorDate,
  byDate,
  publicacoesDoDia,
  dragOverDay,
  onDayDragOver,
  onDayDragLeave,
  onDayDrop,
  renderPostIt,
  renderPublicacao,
  onAddPauta,
  onPuxarConteudo,
}: {
  anchorDate: Date;
  byDate: ReadonlyMap<string, PlanejamentoPostIt[]>;
  publicacoesDoDia: ReadonlyMap<string, PublicacaoNoDia[]>;
  dragOverDay: string | null;
  onDayDragOver: (dateKey: string, event: React.DragEvent) => void;
  onDayDragLeave: () => void;
  onDayDrop: (dateKey: string, event: React.DragEvent) => void;
  renderPostIt: (postIt: PlanejamentoPostIt, compact: boolean) => ReactNode;
  renderPublicacao: (publicacao: PublicacaoNoDia) => ReactNode;
  onAddPauta: (dateKey: string) => void;
  onPuxarConteudo?: (dateKey: string) => void;
}) {
  const today = new Date();
  const days = eachDayOfInterval({
    start: startOfWeek(anchorDate, {weekStartsOn: WEEK_STARTS_ON}),
    end: endOfWeek(anchorDate, {weekStartsOn: WEEK_STARTS_ON}),
  });

  return (
    <div
      role="grid"
      className="w-full min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-raised)]"
    >
      <div role="row" className="grid grid-cols-7 border-b border-[var(--border-color)]">
        {days.map(day => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={dateKey(day)}
              role="columnheader"
              className="border-r border-[var(--border-color)] px-2 py-2 last:border-r-0"
            >
              <Text variant="label" as="span" className="block text-center uppercase tracking-wide text-[var(--text-secondary)]">
                {weekdayLabel(day)}
              </Text>
              <div className="mt-1 flex items-center justify-center">
                <Text
                  variant="bodyStrong"
                  as="span"
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full',
                    isToday
                      ? 'bg-[#ec4899] text-white shadow-sm'
                      : 'text-[var(--text-primary)]',
                  )}
                >
                  {format(day, 'd')}
                </Text>
              </div>
            </div>
          );
        })}
      </div>
      {/* Sem items-start: as colunas esticam até o dia mais cheio e as linhas da grade vão até o fim. */}
      <div role="row" className="grid grid-cols-7">
        {days.map(day => {
          const key = dateKey(day);
          const dayPostIts = byDate.get(key) ?? [];
          const dayPubs = publicacoesDoDia.get(key) ?? [];
          return (
            <div
              key={key}
              role="gridcell"
              className={cn(
                // Altura da tela que sobra abaixo da barra: a semana vira um quadro, não uma faixa baixa.
                '@container min-h-[max(16rem,calc(100vh-25rem))] min-w-0 border-r border-[var(--border-color)] p-1.5 last:border-r-0',
                dragOverDay === key && 'bg-[color-mix(in_srgb,var(--accent-orange)_12%,transparent)]',
              )}
              onDragOver={event => {
                event.preventDefault();
                onDayDragOver(key, event);
              }}
              onDragLeave={onDayDragLeave}
              onDrop={event => {
                event.preventDefault();
                onDayDrop(key, event);
              }}
            >
              <div className="stack-sm">
                {dayPubs.map(renderPublicacao)}
                {dayPostIts.map(postIt => renderPostIt(postIt, false))}
                <div className="mt-1 flex items-center gap-1 opacity-70 transition-opacity md:opacity-0 md:group-hover/day:opacity-100 md:focus-within:opacity-100 pointer-coarse:opacity-100">
                  <AppButton
                    variant="ghost"
                    size="xs"
                    className="px-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    leftIcon={<Plus className="h-3 w-3" />}
                    aria-label={`Criar post-it em ${weekdayLabel(day).toLowerCase()}, ${format(day, 'd')}`}
                    onClick={() => onAddPauta(key)}
                  >
                    Post-it
                  </AppButton>
                  {onPuxarConteudo ? (
                    <AppButton
                      variant="ghost"
                      size="xs"
                      className="px-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      leftIcon={<ArrowDownToLine className="h-3 w-3" />}
                      aria-label={`Puxar conteúdo em ${weekdayLabel(day).toLowerCase()}, ${format(day, 'd')}`}
                      onClick={() => onPuxarConteudo(key)}
                    >
                      Puxar
                    </AppButton>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
