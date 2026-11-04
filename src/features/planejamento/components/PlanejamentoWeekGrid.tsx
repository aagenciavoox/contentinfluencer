import {format, isSameDay} from 'date-fns';
import {diasDoCalendario, type IntervaloSaude} from '../lib/saudeActions';
import {ArrowDownToLine, Plus} from 'lucide-react';
import type {ReactNode} from 'react';
import {AppButton} from '../../../components/ui/AppButton';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import type {PublicacaoNoDia} from '../lib/publicacoesDoMes';
import type {PlanejamentoPostIt} from '../lib/postIt';
import type {RedeSocial} from '../../../lib/database';
import {DivisoriaRede} from './DivisoriaRede';

export type DiaSeparado = {
  rede: RedeSocial;
  pubsAcima: PublicacaoNoDia[];
  pubsAbaixo: PublicacaoNoDia[];
  postItsAcima: PlanejamentoPostIt[];
  postItsAbaixo: PlanejamentoPostIt[];
};

const WEEKDAYS_SHORT_PT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;

function dateKey(day: Date) {
  return format(day, 'yyyy-MM-dd');
}

function weekdayLabel(day: Date) {
  return WEEKDAYS_SHORT_PT[day.getDay()];
}

export function PlanejamentoWeekGrid({
  anchorDate,
  intervalo,
  byDate,
  publicacoesDoDia,
  dragOverDay,
  onDayDragOver,
  onDayDragLeave,
  onDayDrop,
  renderPostIt,
  renderPublicacao,
  separarDia,
  onAddPauta,
  onPuxarConteudo,
}: {
  anchorDate: Date;
  intervalo?: IntervaloSaude | null;
  byDate: ReadonlyMap<string, PlanejamentoPostIt[]>;
  publicacoesDoDia: ReadonlyMap<string, PublicacaoNoDia[]>;
  dragOverDay: string | null;
  onDayDragOver: (dateKey: string, event: React.DragEvent) => void;
  onDayDragLeave: () => void;
  onDayDrop: (dateKey: string, event: React.DragEvent) => void;
  renderPostIt: (postIt: PlanejamentoPostIt, compact: boolean) => ReactNode;
  renderPublicacao: (publicacao: PublicacaoNoDia) => ReactNode;
  /** Dia de postagem de uma rede: devolve a divisão; null mantém o dia como está. */
  separarDia?: (dateKey: string) => DiaSeparado | null;
  onAddPauta: (dateKey: string) => void;
  onPuxarConteudo?: (dateKey: string) => void;
}) {
  const today = new Date();
  const days = diasDoCalendario(anchorDate, intervalo);

  return (
    <div
      role="grid"
      className="planejamento-week-grid w-full min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-raised)]"
    >
      <div role="row" className="grid grid-cols-7 border-b border-[var(--border-color)]">
        {days.slice(0, 7).map(day => {
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
              {!intervalo ? <div className="mt-1 flex items-center justify-center">
                <Text
                  variant="bodyStrong"
                  as="span"
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full',
                    isToday
                      ? 'bg-[var(--brand-accent-strong)] text-[var(--brand-on-accent)] shadow-sm'
                      : 'text-[var(--text-primary)]',
                  )}
                >
                  {format(day, 'd')}
                </Text>
              </div> : null}
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
                'group/day @container/week-day min-h-[max(16rem,calc(100vh-25rem))] min-w-0 border-r border-[var(--border-color)] p-1.5 last:border-r-0',
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
                {intervalo ? <Text variant="label" as="p" className="text-[var(--text-secondary)]">{format(day, 'dd/MM')}</Text> : null}
                <div role="group" aria-label={`Ações de ${format(day, 'dd/MM')}`} className="grid min-w-0 grid-cols-2 gap-1">
                  <AppButton
                    variant="ghost"
                    size="xs"
                    iconOnly
                    className="w-full min-w-0 gap-1 px-0"
                    title="Criar post-it"
                    aria-label={`Criar post-it em ${weekdayLabel(day).toLowerCase()}, ${format(day, 'd')}`}
                    onClick={() => onAddPauta(key)}
                  >
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="hidden @min-[12rem]/week-day:inline">Post-it</span>
                    </span>
                  </AppButton>
                  {onPuxarConteudo ? (
                    <AppButton
                      variant="ghost"
                      size="xs"
                      iconOnly
                      className="w-full min-w-0 gap-1 px-0"
                      title="Puxar conteúdo da Criação"
                      aria-label={`Puxar conteúdo em ${weekdayLabel(day).toLowerCase()}, ${format(day, 'd')}`}
                      onClick={() => onPuxarConteudo(key)}
                    >
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <ArrowDownToLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="hidden @min-[12rem]/week-day:inline">Puxar</span>
                      </span>
                    </AppButton>
                  ) : null}
                </div>
                {(() => {
                  const dia = separarDia?.(key) ?? null;
                  if (!dia) return (<>
                    {dayPubs.map(renderPublicacao)}
                    {dayPostIts.map(postIt => renderPostIt(postIt, false))}
                  </>);
                  return (<>
                    {dia.pubsAcima.map(renderPublicacao)}
                    {dia.postItsAcima.map(postIt => renderPostIt(postIt, false))}
                    <DivisoriaRede rede={dia.rede}>
                      {dia.pubsAbaixo.map(renderPublicacao)}
                      {dia.postItsAbaixo.map(postIt => renderPostIt(postIt, false))}
                    </DivisoriaRede>
                  </>);
                })()}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
