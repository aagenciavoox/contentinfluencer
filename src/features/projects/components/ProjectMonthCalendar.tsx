import {useState} from 'react';
import {format, parseISO} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Plus} from 'lucide-react';
import {CalendarEventPill, CalendarMonthGrid, CalendarPeriodNav} from '../../../components/calendar';
import {editorialPillStyle} from '../../../components/calendar/calendarPillStyles';
import {AppButton} from '../../../components/ui/AppButton';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {tintedTextColor} from '../../../lib/utils';
import type {AgendaItem, ProjetoLivro} from '../../../lib/database';
import {
  eventoCobreDia,
  isPeriodoLeitura,
  nomeDoLivro,
  papelNoIntervalo,
  rotuloPeriodoLeitura,
} from '../lib/agendaEventos';
import {AgendaTipoIcon} from './AgendaTipoIcon';

export function ProjectMonthCalendar({
  eventos,
  livros,
  cor,
  onCreate,
  onOpen,
}: {
  eventos: AgendaItem[];
  livros: ProjetoLivro[];
  cor: string | null;
  onCreate: (date: string) => void;
  onOpen: (item: AgendaItem) => void;
}) {
  const isMobile = useIsMobile();
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const selectedKey = format(selected, 'yyyy-MM-dd');
  const doDia = eventos
    .filter(item => eventoCobreDia(item, selectedKey))
    .sort((left, right) => `${left.time || '99'}${left.title}`.localeCompare(`${right.time || '99'}${right.title}`));

  const rotulo = (item: AgendaItem) => {
    const livro = nomeDoLivro(item, livros);
    if (isPeriodoLeitura(item.tipo) && livro && item.dateEnd) {
      return rotuloPeriodoLeitura(livro, item.date, item.dateEnd);
    }
    return item.title;
  };

  return (
    <div className="stack-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CalendarPeriodNav
          anchorDate={anchor}
          onAnchorDateChange={setAnchor}
          viewMode="mes"
          onViewModeChange={() => undefined}
          views={[]}
        />
        <AppButton
          variant="primary"
          onClick={() => onCreate(selectedKey)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Novo evento
        </AppButton>
      </div>

      <CalendarMonthGrid
        anchorDate={anchor}
        selectedDate={selected}
        onSelectDate={setSelected}
        minCellHeight={isMobile ? 76 : 112}
        onDayClick={dayProps => {
          const itens = eventos.filter(item => eventoCobreDia(item, dayProps.dateKey));
          if (itens.length === 0) onCreate(dayProps.dateKey);
        }}
        renderDayContent={dayProps => {
          const itens = eventos.filter(item => eventoCobreDia(item, dayProps.dateKey));
          const visiveis = itens.slice(0, isMobile ? 2 : 3);
          const resto = itens.length - visiveis.length;
          return (
            <>
              {visiveis.map(item => {
                const papel = papelNoIntervalo(dayProps.dateKey, item.date, item.dateEnd || item.date);
                return (
                  <CalendarEventPill
                    key={item.id}
                    label={isPeriodoLeitura(item.tipo) ? (nomeDoLivro(item, livros) ? `Leitura de ${nomeDoLivro(item, livros)}` : item.title) : item.title}
                    time={papel === 'start' || papel === 'single' ? item.time : null}
                    icon={<AgendaTipoIcon tipo={item.tipo} />}
                    style={editorialPillStyle(cor)}
                    className={
                      papel === 'start' ? 'rounded-r-none' : papel === 'end' ? 'rounded-l-none' : papel === 'middle' ? 'rounded-none' : undefined
                    }
                    onClick={event => {
                      event.stopPropagation();
                      onOpen(item);
                    }}
                  />
                );
              })}
              {resto > 0 ? (
                <Text variant="meta">+{resto}</Text>
              ) : null}
            </>
          );
        }}
      />

      <Surface variant="info" padding="md" className="stack-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text variant="label">
            {format(parseISO(selectedKey), "EEEE, d 'de' MMMM", {locale: ptBR})}
          </Text>
          <AppButton
            variant="secondary"
            size="sm"
            onClick={() => onCreate(selectedKey)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Novo evento neste dia
          </AppButton>
        </div>
        {doDia.length === 0 ? (
          <Text variant="secondary">Nenhum evento neste dia.</Text>
        ) : (
          <div className="stack-sm">
            {doDia.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpen(item)}
                className="flex w-full items-start gap-3 rounded-[var(--radius-input)] px-2 py-2 text-left hover:bg-[var(--bg-hover)]"
              >
                <span className="mt-0.5" style={{color: cor ? tintedTextColor(cor) : 'var(--text-secondary)'}}>
                  <AgendaTipoIcon tipo={item.tipo} className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <Text variant="itemTitle" as="span" className="block">{rotulo(item)}</Text>
                  <Text variant="meta" className="mt-0.5 block">
                    {item.tipo}{item.time ? ` · ${item.time}` : ''}
                  </Text>
                </span>
              </button>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}
