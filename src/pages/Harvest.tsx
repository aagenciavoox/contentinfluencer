import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Zap,
  X,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AgendaItem } from '../types';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { useNavigate } from 'react-router-dom';

type ItemType = 'organico' | 'parceria' | 'reuniao' | 'entrega' | 'publicacao';

interface CalendarItem {
  id: string;
  tipo: ItemType;
  titulo: string;
  subtitulo?: string;
  cor?: string;
  status?: string;
  raw: any;
}

type FiltroAtivo = Record<ItemType, boolean>;

const FILTRO_LABELS: Record<ItemType, string> = {
  organico: 'Orgânico',
  parceria: 'Parceria',
  reuniao: 'Reunião',
  entrega: 'Entrega',
  publicacao: 'Publicação',
};

const ITEM_CLASSES: Record<ItemType, (status?: string) => string> = {
  organico: (status) =>
    status === 'Postado'
      ? 'bg-[var(--accent-green)]/10 border-[var(--accent-green)] text-[var(--accent-green)]'
      : 'bg-[var(--accent-blue)]/10 border-[var(--accent-blue)] text-[var(--accent-blue)]',
  parceria: () => 'bg-[var(--bg-secondary)] border-2 text-[var(--text-primary)]',
  reuniao: () => 'bg-purple-50 border-purple-400 text-purple-700',
  entrega: () => 'bg-orange-50 border-orange-400 text-orange-700',
  publicacao: () => 'bg-teal-50 border-teal-400 text-teal-700',
};

const TIPO_COR_MAP: Record<string, string> = {
  Reunião: 'bg-purple-50 text-purple-700 border-purple-200',
  Entrega: 'bg-orange-50 text-orange-700 border-orange-200',
  Publicação: 'bg-teal-50 text-teal-700 border-teal-200',
};

export function Harvest() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [filtros, setFiltros] = useState<FiltroAtivo>({
    organico: true,
    parceria: true,
    reuniao: true,
    entrega: true,
    publicacao: true,
  });

  // Painel do dia
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Detalhe do evento
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);

  // Form novo compromisso
  const [formAberto, setFormAberto] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaData, setNovaData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [novoTipo, setNovoTipo] = useState<'Reunião' | 'Entrega' | 'Publicação'>('Reunião');

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
      state.contents.forEach(c => {
        if (c.publishDate) {
          add(c.publishDate, {
            id: c.id,
            tipo: 'organico',
            titulo: c.title,
            subtitulo: c.pillar,
            status: c.status,
            raw: c,
          });
        }
      });
    }

    if (filtros.parceria) {
      state.partnerships.forEach(p => {
        if (p.deadline) {
          add(p.deadline, {
            id: p.id,
            tipo: 'parceria',
            titulo: p.title,
            subtitulo: p.brand,
            cor: p.brandColor,
            raw: p,
          });
        }
      });
    }

    state.agenda.forEach(a => {
      const tipoMap: Record<string, ItemType> = {
        Reunião: 'reuniao',
        Entrega: 'entrega',
        Publicação: 'publicacao',
      };
      const tipo = tipoMap[a.type];
      if (filtros[tipo]) {
        add(a.date, {
          id: a.id,
          tipo,
          titulo: a.title,
          subtitulo: a.type,
          raw: a,
        });
      }
    });

    return map;
  }, [state.contents, state.partnerships, state.agenda, filtros]);

  const toggleFiltro = (tipo: ItemType) => {
    setFiltros(f => ({ ...f, [tipo]: !f[tipo] }));
  };

  const handleAddAgenda = (e: React.FormEvent) => {
    e.preventDefault();
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

  const energiaHoje = state.energyLogs.find(l => isSameDay(new Date(l.date), new Date()));
  const sugestaoHoje = energiaHoje
    ? energiaHoje.level >= 4
      ? 'Alta Energia: Gravar Séries'
      : energiaHoje.level === 3
        ? 'Energia Média: Conteúdo Curto'
        : 'Baixa Energia: Janelas ou Descanso'
    : null;

  const selectedDayStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const itemsDodia = selectedDayStr ? (itemsByDate[selectedDayStr] || []) : [];

  // Conteúdo orgânico selecionado para abrir no ContentDetailModal
  const contentSelecionado =
    selectedItem?.tipo === 'organico'
      ? state.contents.find(c => c.id === selectedItem.id) ?? null
      : null;

  return (
    <div className="max-w-7xl mx-auto py-10 md:py-16 px-6 md:px-10 transition-colors duration-200">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[9px] font-black text-[var(--text-primary)] opacity-30 uppercase tracking-[0.4em] mb-2 italic">
            Calendário
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] tracking-tight leading-none">
            Agenda
          </h1>
          {sugestaoHoje && (
            <div className="inline-flex items-center gap-2 mt-3 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] px-3 py-1.5 rounded-full border border-[var(--accent-blue)]/20">
              <Zap className="w-3 h-3 fill-current" />
              <span className="text-[10px] font-black uppercase tracking-widest">{sugestaoHoje}</span>
            </div>
          )}
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center gap-4 bg-[var(--bg-secondary)] p-2 rounded-[2rem] border border-[var(--border-color)] shadow-xl shrink-0">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-3 hover:bg-[var(--bg-hover)] rounded-2xl transition-all hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-[0.2em] min-w-[160px] text-center">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-3 hover:bg-[var(--bg-hover)] rounded-2xl transition-all hover:scale-105 active:scale-95"
          >
            <ChevronRight className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </div>
      </header>

      {/* Filtros + botão adicionar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTRO_LABELS) as ItemType[]).map(tipo => {
            const ativo = filtros[tipo];
            const corMap: Record<ItemType, string> = {
              organico: 'border-[var(--accent-blue)] text-[var(--accent-blue)]',
              parceria: 'border-[var(--text-primary)] text-[var(--text-primary)]',
              reuniao: 'border-purple-400 text-purple-700',
              entrega: 'border-orange-400 text-orange-700',
              publicacao: 'border-teal-400 text-teal-700',
            };
            return (
              <button
                key={tipo}
                onClick={() => toggleFiltro(tipo)}
                className={cn(
                  'text-[10px] font-black px-3 py-1.5 rounded-full border-2 transition-all',
                  ativo
                    ? corMap[tipo] + ' bg-transparent'
                    : 'border-[var(--border-color)] text-[var(--text-primary)] opacity-30 hover:opacity-60'
                )}
              >
                {FILTRO_LABELS[tipo]}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setFormAberto(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.03] transition-all shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Compromisso
        </button>
      </div>

      {/* Calendário */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2.5rem] overflow-hidden shadow-xl">
        {/* Cabeçalho dos dias */}
        <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-hover)]/30">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div
              key={d}
              className="py-5 text-center text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] opacity-60 italic"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grade */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const items = itemsByDate[dateStr] || [];
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isTodayDay = isToday(day);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  'min-h-[60px] md:min-h-[130px] p-1.5 md:p-3 border-r border-b border-[var(--border-color)] transition-colors text-left w-full',
                  !isCurrentMonth && 'bg-[var(--bg-hover)]/20 opacity-30',
                  (i + 1) % 7 === 0 && 'border-r-0',
                  isSelected
                    ? 'bg-[var(--text-primary)]/5 ring-2 ring-inset ring-[var(--text-primary)]/20'
                    : 'hover:bg-[var(--bg-hover)]/40 cursor-pointer'
                )}
              >
                {/* Número do dia */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      'text-xs font-black w-7 h-7 flex items-center justify-center rounded-xl',
                      isTodayDay
                        ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md'
                        : 'text-[var(--text-tertiary)]'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {items.length > 2 && (
                    <span className="text-[8px] font-black text-[var(--text-primary)] opacity-30">
                      +{items.length}
                    </span>
                  )}
                </div>

                {/* Itens do dia — labels on md+, dots on mobile */}
                <div className="space-y-1">
                  {/* Mobile: colored dots only */}
                  <div className="flex flex-wrap gap-1 md:hidden">
                    {items.slice(0, 4).map(item => (
                      <div
                        key={item.id}
                        className={cn('w-2 h-2 rounded-full border', ITEM_CLASSES[item.tipo](item.status))}
                        style={item.tipo === 'parceria' && item.cor ? { backgroundColor: item.cor } : {}}
                      />
                    ))}
                    {items.length > 4 && (
                      <span className="text-[7px] font-black text-[var(--text-primary)] opacity-40">+{items.length - 4}</span>
                    )}
                  </div>
                  {/* Desktop: full labels */}
                  <div className="hidden md:block space-y-1">
                    {items.slice(0, 3).map(item => (
                      <div
                        key={item.id}
                        className={cn(
                          'px-1.5 py-1 rounded-lg text-[8px] font-black leading-tight border truncate uppercase tracking-tight',
                          ITEM_CLASSES[item.tipo](item.status)
                        )}
                        style={item.tipo === 'parceria' && item.cor ? { borderColor: item.cor } : {}}
                        title={item.titulo}
                      >
                        <span className="truncate block">{item.titulo}</span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-[8px] font-black text-[var(--text-primary)] opacity-30 pl-1">
                        +{items.length - 3} mais
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
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

      {/* Lista de compromissos */}
      {state.agenda.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] opacity-30 mb-4 italic">
            Compromissos cadastrados
          </h2>
          <div className="space-y-2">
            {state.agenda
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(item => (
                <button
                  key={item.id}
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
                  <span className="text-[10px] text-[var(--text-primary)] opacity-30 font-bold shrink-0">
                    {format(new Date(item.date + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })}
                  </span>
                  <Trash2
                    className="w-4 h-4 text-red-500 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-all shrink-0"
                    onClick={e => { e.stopPropagation(); handleDeleteAgenda(item.id); }}
                  />
                </button>
              ))}
          </div>
        </section>
      )}

      {/* ── PAINEL DO DIA ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedDay && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDay(null)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              className="fixed top-0 right-0 h-full w-full md:w-[400px] bg-[var(--bg-primary)] border-l border-[var(--border-color)] shadow-2xl z-50 flex flex-col"
            >
              {/* Header do painel */}
              <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between shrink-0">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] opacity-40">
                    {format(selectedDay, "EEEE", { locale: ptBR })}
                  </p>
                  <h2 className="text-xl font-black text-[var(--text-primary)] capitalize">
                    {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setNovaData(format(selectedDay, 'yyyy-MM-dd'));
                      setFormAberto(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.03] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Novo
                  </button>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-[var(--text-primary)] opacity-40" />
                  </button>
                </div>
              </div>

              {/* Lista de eventos do dia */}
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                {itemsDodia.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
                    <Calendar className="w-10 h-10 text-[var(--text-primary)]" />
                    <p className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">
                      Nenhum evento
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itemsDodia.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={cn(
                          'w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-l-4 text-left hover:scale-[1.01] transition-all shadow-sm',
                          item.tipo === 'organico' && item.status === 'Postado'
                            ? 'bg-[var(--accent-green)]/5 border-[var(--accent-green)]'
                            : item.tipo === 'organico'
                              ? 'bg-[var(--accent-blue)]/5 border-[var(--accent-blue)]'
                              : item.tipo === 'parceria'
                                ? 'bg-[var(--bg-secondary)] border-[var(--text-primary)]/30'
                                : item.tipo === 'reuniao'
                                  ? 'bg-purple-50 border-purple-400'
                                  : item.tipo === 'entrega'
                                    ? 'bg-orange-50 border-orange-400'
                                    : 'bg-teal-50 border-teal-400'
                        )}
                        style={item.tipo === 'parceria' && item.cor ? { borderColor: item.cor } : {}}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">{item.titulo}</p>
                          {item.subtitulo && (
                            <p className="text-[10px] text-[var(--text-secondary)] opacity-60 mt-0.5">{item.subtitulo}</p>
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0',
                            item.tipo === 'organico'
                              ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/10'
                              : item.tipo === 'parceria'
                                ? 'border-[var(--text-primary)]/30 text-[var(--text-primary)]'
                                : item.tipo === 'reuniao'
                                  ? 'border-purple-300 text-purple-700 bg-purple-50'
                                  : item.tipo === 'entrega'
                                    ? 'border-orange-300 text-orange-700 bg-orange-50'
                                    : 'border-teal-300 text-teal-700 bg-teal-50'
                          )}
                        >
                          {FILTRO_LABELS[item.tipo]}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DETALHE DO EVENTO ──────────────────────────────────────────────── */}

      {/* Orgânico → ContentDetailModal completo */}
      {selectedItem?.tipo === 'organico' && contentSelecionado && (
        <ContentDetailModal
          content={contentSelecionado}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Parceria → modal compacto */}
      <AnimatePresence>
        {selectedItem?.tipo === 'parceria' && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-[95%] md:w-[480px] bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-2xl p-8"
            >
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
                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-[var(--bg-hover)] rounded-full">
                  <X className="w-5 h-5 text-[var(--text-primary)] opacity-40" />
                </button>
              </div>

              <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6">{selectedItem.titulo}</h2>

              <div className="space-y-3 text-sm">
                {selectedItem.raw.status && (
                  <div className="flex items-center justify-between py-2 border-b border-[var(--border-color)]">
                    <span className="text-[var(--text-primary)] opacity-40 font-bold text-xs uppercase tracking-widest">Status</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedItem.raw.status}</span>
                  </div>
                )}
                {selectedItem.raw.deadline && (
                  <div className="flex items-center justify-between py-2 border-b border-[var(--border-color)]">
                    <span className="text-[var(--text-primary)] opacity-40 font-bold text-xs uppercase tracking-widest">Deadline</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {format(new Date(selectedItem.raw.deadline + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                )}
                {selectedItem.raw.value && (
                  <div className="flex items-center justify-between py-2 border-b border-[var(--border-color)]">
                    <span className="text-[var(--text-primary)] opacity-40 font-bold text-xs uppercase tracking-widest">Valor</span>
                    <span className="font-bold text-[var(--text-primary)]">R$ {selectedItem.raw.value.toLocaleString('pt-BR')}</span>
                  </div>
                )}
                {selectedItem.raw.notes && (
                  <div className="py-2">
                    <span className="text-[var(--text-primary)] opacity-40 font-bold text-xs uppercase tracking-widest block mb-2">Notas</span>
                    <p className="text-sm text-[var(--text-primary)] opacity-70 leading-relaxed">{selectedItem.raw.notes}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => { setSelectedItem(null); navigate('/partnerships'); }}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest border border-[var(--border-strong)] text-[var(--text-primary)] opacity-60 hover:opacity-100 rounded-2xl transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir em Parcerias
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reunião / Entrega / Publicação → modal simples */}
      <AnimatePresence>
        {selectedItem && ['reuniao', 'entrega', 'publicacao'].includes(selectedItem.tipo) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-[95%] md:w-[420px] bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <span className={cn('text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border', TIPO_COR_MAP[selectedItem.raw.type] || '')}>
                  {selectedItem.raw.type}
                </span>
                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-[var(--bg-hover)] rounded-full">
                  <X className="w-5 h-5 text-[var(--text-primary)] opacity-40" />
                </button>
              </div>

              <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6">{selectedItem.titulo}</h2>

              <div className="py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <span className="text-[var(--text-primary)] opacity-40 font-bold text-xs uppercase tracking-widest">Data</span>
                <span className="font-bold text-[var(--text-primary)] text-sm">
                  {format(new Date(selectedItem.raw.date + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </span>
              </div>

              {selectedItem.raw.slotType && (
                <div className="py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                  <span className="text-[var(--text-primary)] opacity-40 font-bold text-xs uppercase tracking-widest">Slot</span>
                  <span className="font-bold text-[var(--text-primary)] text-sm">{selectedItem.raw.slotType}</span>
                </div>
              )}

              <button
                onClick={() => { handleDeleteAgenda(selectedItem.id); setSelectedItem(null); }}
                className="mt-8 w-full flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest text-red-500 border border-red-200 hover:bg-red-50 rounded-2xl transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir compromisso
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: ADICIONAR COMPROMISSO ──────────────────────────────────── */}
      <AnimatePresence>
        {formAberto && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFormAberto(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-[95%] md:w-[420px] bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-[var(--text-primary)]">Novo Compromisso</h2>
                <button onClick={() => setFormAberto(false)} className="p-2 hover:bg-[var(--bg-hover)] rounded-full">
                  <X className="w-5 h-5 text-[var(--text-primary)] opacity-40" />
                </button>
              </div>

              <form onSubmit={handleAddAgenda} className="space-y-5">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-1.5">
                    O que é?
                  </label>
                  <input
                    type="text"
                    value={novoTitulo}
                    onChange={e => setNovoTitulo(e.target.value)}
                    placeholder="Reunião, gravação, entrega..."
                    autoFocus
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:opacity-30 focus:ring-2 focus:ring-[var(--text-primary)]/20"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-1.5">
                    Quando?
                  </label>
                  <input
                    type="date"
                    value={novaData}
                    onChange={e => setNovaData(e.target.value)}
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--text-primary)]/20"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-2">
                    Categoria
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Reunião', 'Entrega', 'Publicação'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNovoTipo(t)}
                        className={cn(
                          'py-2.5 text-[10px] font-black rounded-xl border transition-all uppercase tracking-widest',
                          novoTipo === t
                            ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-sm'
                            : 'bg-[var(--bg-hover)] text-[var(--text-primary)] border-[var(--border-color)] opacity-50 hover:opacity-80'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
