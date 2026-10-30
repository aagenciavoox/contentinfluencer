import {eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Plus} from 'lucide-react';
import type {ReactNode} from 'react';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import type {PublicacaoNoDia} from '../lib/publicacoesDoMes';
import type {PlanejamentoPostIt} from '../lib/postIt';

const WEEK_STARTS_ON = 0;

function dateKey(day: Date) {
  return format(day, 'yyyy-MM-dd');
}

function weekdayLabel(day: Date) {
  const full = format(day, 'EEEE', {locale: ptBR}).split('-')[0];
  return full.charAt(0).toUpperCase() + full.slice(1);
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
        {days.map(day => (
          <div
            key={dateKey(day)}
            role="columnheader"
            className="border-r border-[var(--border-color)] px-2 py-2 last:border-r-0"
          >
            <Text variant="meta" as="span" className="block uppercase tracking-wide text-[var(--text-secondary)]">
              {weekdayLabel(day)}
            </Text>
            <span className="mt-0.5 flex items-center gap-1.5">
              <Text variant="sectionTitle" as="span">{format(day, 'd')}</Text>
              {isSameDay(day, today) ? <Badge variant="neutral">Hoje</Badge> : null}
            </span>
          </div>
        ))}
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
                <AppButton
                  variant="ghost"
                  size="xs"
                  className="mt-0.5 justify-start px-2 text-[var(--text-secondary)]"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  aria-label={`Adicionar pauta em ${weekdayLabel(day).toLowerCase()}, ${format(day, 'd')}`}
                  onClick={() => onAddPauta(key)}
                >
                  {/* Coluna estreita: "Adicionar pauta" virava "+ Adici…". */}
                  <span className="@[9rem]:hidden">Pauta</span>
                  <span className="hidden @[9rem]:inline">Adicionar pauta</span>
                </AppButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
