import React, { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';
import { AgendaItem } from '../types';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { BottomSheetModal } from '../components/BottomSheetModal';
import { useIsMobile } from '../hooks/useIsMobile';
import { HarvestDayPanel } from '../features/harvest/HarvestDayPanel';
import { HarvestHeader } from '../features/harvest/HarvestHeader';
import { HarvestMonthGrid } from '../features/harvest/HarvestMonthGrid';
import {
  AgendaTipo,
  CalendarItem,
  FiltroAtivo,
  ItemType,
  TIPO_COR_MAP,
} from '../features/harvest/types';

export function Harvest() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [filtros, setFiltros] = useState<FiltroAtivo>({
    organico: true,
    parceria: true,
    reuniao: true,
    entrega: true,
    publicacao: true,
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaData, setNovaData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [novoTipo, setNovoTipo] = useState<AgendaTipo>('Reunião');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const itemsByDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};

    const add = (date: string, item: CalendarItem) => {
      if (!map[date]) map[date] = [];
      map[date].push(item);
    };

    if (filtros.organico) {
      state.contents.forEach((content) => {
        if (content.publishDate) {
          add(content.publishDate, {
            id: content.id,
            tipo: 'organico',
            titulo: content.title,
            subtitulo: content.pillar,
            status: content.status,
            raw: content,
          });
        }
      });
    }

    if (filtros.parceria) {
      state.partnerships.forEach((partnership) => {
        if (partnership.deadline) {
          add(partnership.deadline, {
            id: partnership.id,
            tipo: 'parceria',
            titulo: partnership.title,
            subtitulo: partnership.brand,
            cor: partnership.brandColor,
            raw: partnership,
          });
        }
      });
    }

    state.agenda.forEach((agendaItem) => {
      const tipoMap: Record<string, ItemType> = {
        Reunião: 'reuniao',
        Entrega: 'entrega',
        Publicação: 'publicacao',
      };

      const tipo = tipoMap[agendaItem.type];
      if (filtros[tipo]) {
        add(agendaItem.date, {
          id: agendaItem.id,
          tipo,
          titulo: agendaItem.title,
          subtitulo: agendaItem.type,
          raw: agendaItem,
        });
      }
    });

    return map;
  }, [filtros, state.agenda, state.contents, state.partnerships]);

  const toggleFiltro = (tipo: ItemType) => {
    setFiltros((prev) => ({ ...prev, [tipo]: !prev[tipo] }));
  };

  const handleAddAgenda = (event: React.FormEvent) => {
    event.preventDefault();
    if (!novoTitulo.trim()) return;

    const item: AgendaItem = {
      id: Math.random().toString(36).substr(2, 9),
      title: novoTitulo.trim(),
      date: novaData,
      type: novoTipo,
      external: true,
    };

    dispatch({ type: 'ADD_AGENDA', payload: item });
    setNovoTitulo('');
    setFormAberto(false);
  };

  const handleDeleteAgenda = (id: string) => {
    dispatch({ type: 'DELETE_AGENDA', payload: id });
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  const energiaHoje = state.energyLogs.find((log) => isSameDay(new Date(log.date), new Date()));
  const sugestaoHoje = energiaHoje
    ? energiaHoje.level >= 4
      ? 'Alta Energia: Gravar Séries'
      : energiaHoje.level === 3
        ? 'Energia Média: Conteúdo Curto'
        : 'Baixa Energia: Janelas ou Descanso'
    : null;

  const selectedDayStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const itemsDodia = selectedDayStr ? (itemsByDate[selectedDayStr] || []) : [];

  const contentSelecionado =
    selectedItem?.tipo === 'organico'
      ? state.contents.find((content) => content.id === selectedItem.id) ?? null
      : null;

  return (
    <div className="content-wide mx-auto py-10 md:py-16 px-6 md:px-10 transition-colors duration-200">
      <HarvestHeader
        currentDate={currentDate}
        filtros={filtros}
        sugestaoHoje={sugestaoHoje}
        onPrevMonth={() => setCurrentDate(subMonths(currentDate, 1))}
        onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
        onToggleFiltro={toggleFiltro}
        onAddCompromisso={() => setFormAberto(true)}
      />

      <HarvestMonthGrid
        currentDate={currentDate}
        days={days}
        itemsByDate={itemsByDate}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      <div className="mt-6 flex flex-wrap gap-4">
        {[
          { cor: 'bg-[var(--accent-blue)]', label: 'Orgânico agendado' },
          { cor: 'bg-[var(--accent-green)]', label: 'Orgânico postado' },
          { cor: 'border-2 border-[var(--text-primary)]', label: 'Parceria' },
          { cor: 'bg-purple-400', label: 'Reunião' },
          { cor: 'bg-orange-400', label: 'Entrega' },
          { cor: 'bg-teal-400', label: 'Publicação' },
        ].map(({ cor, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', cor)} />
            <span className="text-[10px] font-bold text-[var(--text-primary)] opacity-50 uppercase tracking-widest">
              {label}
            </span>
          </div>
        ))}
      </div>

      {state.agenda.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] mb-4 italic">
            Compromissos cadastrados
          </h2>
          <div className="space-y-2">
            {state.agenda
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedItem({
                      id: item.id,
                      tipo: ({ Reunião: 'reuniao', Entrega: 'entrega', Publicação: 'publicacao' } as Record<string, ItemType>)[item.type],
                      titulo: item.title,
                      subtitulo: item.type,
                      raw: item,
                    });
                  }}
                  className="w-full flex items-center gap-4 px-5 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl group hover:border-[var(--text-primary)]/30 transition-all text-left"
                >
                  <span className={cn('text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0', TIPO_COR_MAP[item.type])}>
                    {item.type}
                  </span>
                  <p className="flex-1 text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">{item.title}</p>
                  <span className="text-[10px] text-[var(--text-tertiary)] font-bold shrink-0">
                    {format(new Date(`${item.date}T12:00:00`), "dd 'de' MMM", { locale: ptBR })}
                  </span>
                  <Trash2
                    className="w-4 h-4 text-red-500 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-all shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAgenda(item.id);
                    }}
                  />
                </button>
              ))}
          </div>
        </section>
      )}

      <HarvestDayPanel
        isMobile={isMobile}
        selectedDay={selectedDay}
        itemsDodia={itemsDodia}
        onClose={() => setSelectedDay(null)}
        onNewItem={() => {
          if (!selectedDay) return;
          setNovaData(format(selectedDay, 'yyyy-MM-dd'));
          setFormAberto(true);
        }}
        onSelectItem={setSelectedItem}
      />

      {selectedItem?.tipo === 'organico' && contentSelecionado && (
        <ContentDetailModal
          content={contentSelecionado}
          onClose={() => setSelectedItem(null)}
        />
      )}

      <BottomSheetModal
        open={selectedItem?.tipo === 'parceria'}
        onClose={() => setSelectedItem(null)}
        desktopMaxW="max-w-[480px]"
        zIndex="z-[60]"
      >
        {selectedItem?.tipo === 'parceria' && (
          <div className="p-6 md:p-8 overflow-y-auto flex-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: selectedItem.cor || '#888' }}
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50">
                  {selectedItem.subtitulo}
                </span>
              </div>
              <button type="button" onClick={() => setSelectedItem(null)} className="p-2 hover:bg-[var(--bg-hover)] rounded-full">
                <X className="w-5 h-5 text-[var(--text-tertiary)]" />
              </button>
            </div>

            <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6">{selectedItem.titulo}</h2>

            <div className="space-y-3 text-sm">
              {selectedItem.raw.status && (
                <div className="flex items-center justify-between py-2 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-tertiary)] font-bold text-xs uppercase tracking-widest">Status</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedItem.raw.status}</span>
                </div>
              )}
              {selectedItem.raw.deadline && (
                <div className="flex items-center justify-between py-2 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-tertiary)] font-bold text-xs uppercase tracking-widest">Deadline</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {format(new Date(`${selectedItem.raw.deadline}T12:00:00`), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
              )}
              {selectedItem.raw.value && (
                <div className="flex items-center justify-between py-2 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-tertiary)] font-bold text-xs uppercase tracking-widest">Valor</span>
                  <span className="font-bold text-[var(--text-primary)]">R$ {selectedItem.raw.value.toLocaleString('pt-BR')}</span>
                </div>
              )}
              {selectedItem.raw.notes && (
                <div className="py-2">
                  <span className="text-[var(--text-tertiary)] font-bold text-xs uppercase tracking-widest block mb-2">Notas</span>
                  <p className="text-sm text-[var(--text-primary)] opacity-70 leading-relaxed">{selectedItem.raw.notes}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedItem(null);
                navigate('/partnerships');
              }}
              className="mt-6 w-full flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest border border-[var(--border-strong)] text-[var(--text-primary)] opacity-60 hover:opacity-100 rounded-2xl transition-all pb-safe"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir em Parcerias
            </button>
          </div>
        )}
      </BottomSheetModal>

      <BottomSheetModal
        open={!!(selectedItem && ['reuniao', 'entrega', 'publicacao'].includes(selectedItem.tipo))}
        onClose={() => setSelectedItem(null)}
        desktopMaxW="max-w-[420px]"
        zIndex="z-[60]"
      >
        {selectedItem && ['reuniao', 'entrega', 'publicacao'].includes(selectedItem.tipo) && (
          <div className="p-6 md:p-8 overflow-y-auto flex-1">
            <div className="flex items-center justify-between mb-6">
              <span className={cn('text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border', TIPO_COR_MAP[selectedItem.raw.type] || '')}>
                {selectedItem.raw.type}
              </span>
              <button type="button" onClick={() => setSelectedItem(null)} className="p-2 hover:bg-[var(--bg-hover)] rounded-full">
                <X className="w-5 h-5 text-[var(--text-tertiary)]" />
              </button>
            </div>

            <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6">{selectedItem.titulo}</h2>

            <div className="py-3 border-b border-[var(--border-color)] flex items-center justify-between">
              <span className="text-[var(--text-tertiary)] font-bold text-xs uppercase tracking-widest">Data</span>
              <span className="font-bold text-[var(--text-primary)] text-sm">
                {format(new Date(`${selectedItem.raw.date}T12:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
            </div>

            {selectedItem.raw.slotType && (
              <div className="py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <span className="text-[var(--text-tertiary)] font-bold text-xs uppercase tracking-widest">Slot</span>
                <span className="font-bold text-[var(--text-primary)] text-sm">{selectedItem.raw.slotType}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                handleDeleteAgenda(selectedItem.id);
                setSelectedItem(null);
              }}
              className="mt-8 w-full flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest text-red-500 border border-red-200 hover:bg-red-50 rounded-2xl transition-all pb-safe"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir compromisso
            </button>
          </div>
        )}
      </BottomSheetModal>

      <BottomSheetModal
        open={formAberto}
        onClose={() => setFormAberto(false)}
        desktopMaxW="max-w-[420px]"
        zIndex="z-[60]"
      >
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-[var(--border-color)] shrink-0">
          <h2 className="text-lg font-black text-[var(--text-primary)]">Novo Compromisso</h2>
          <button type="button" onClick={() => setFormAberto(false)} className="p-2 hover:bg-[var(--bg-hover)] rounded-full">
            <X className="w-5 h-5 text-[var(--text-tertiary)]" />
          </button>
        </div>

        <form onSubmit={handleAddAgenda} className="p-5 md:p-6 space-y-5 flex-1 overflow-y-auto">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1.5">
              O que é?
            </label>
            <input
              type="text"
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Reunião, gravação, entrega..."
              autoFocus
              className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:opacity-30 focus:ring-2 focus:ring-[var(--text-primary)]/20"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1.5">
              Quando?
            </label>
            <input
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--text-primary)]/20"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-2">
              Categoria
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Reunião', 'Entrega', 'Publicação'] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setNovoTipo(tipo)}
                  className={cn(
                    'py-2.5 text-[10px] font-black rounded-xl border transition-all uppercase tracking-widest',
                    novoTipo === tipo
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-sm'
                      : 'bg-[var(--bg-hover)] text-[var(--text-primary)] border-[var(--border-color)] opacity-50 hover:opacity-80'
                  )}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2 pb-safe">
            <button
              type="button"
              onClick={() => setFormAberto(false)}
              className="flex-1 py-3 rounded-2xl text-xs font-black border border-[var(--border-strong)] text-[var(--text-primary)] opacity-60 hover:opacity-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!novoTitulo.trim()}
              className="flex-1 py-3 rounded-2xl text-xs font-black bg-[var(--text-primary)] text-[var(--bg-primary)] hover:scale-[1.02] transition-all shadow-sm disabled:opacity-40"
            >
              Adicionar
            </button>
          </div>
        </form>
      </BottomSheetModal>
    </div>
  );
}
