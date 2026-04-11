import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Calendar as CalendarIcon, Plus, Clock, Zap, Trash2 } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendaItem } from '../types';
import { cn } from '../lib/utils';

export function Agenda() {
  const { state, dispatch } = useAppContext();
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newType, setNewType] = useState<'Reunião' | 'Entrega' | 'Publicação'>('Reunião');

  const today = startOfToday();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleAddAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: AgendaItem = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      date: newDate,
      type: newType,
      external: true,
    };

    dispatch({ type: 'ADD_AGENDA', payload: newItem });
    setNewTitle('');
  };

  return (
    <div className="content-wide mx-auto py-10 md:py-16 px-6 md:px-10">
      <header className="mb-12 md:mb-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-xl">
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight italic mb-2">Agenda</h1>
          <p className="text-sm text-[var(--text-secondary)] font-medium">Apenas o que é real e externo. Sem ruído, apenas contexto.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-2xl shadow-sm">
           <CalendarIcon className="w-4 h-4 text-[var(--accent-blue)]" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Visualização Semanal</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 md:gap-16">
        {/* Weekly View (Main Content) */}
        <div className="lg:col-span-3 space-y-10 md:space-y-16">
          <div className="grid grid-cols-1 gap-6">
            {weekDays.map((day) => {
              const dayItems = state.agenda.filter(item => isSameDay(new Date(item.date), day));
              const energy = state.energyLogs.find(l => isSameDay(new Date(l.date), day));
              const isToday = isSameDay(day, today);
              const dayOfWeek = format(day, 'EEEE', { locale: ptBR });

              // Suggestion Logic
              let suggestion = '';
              if (energy) {
                if (energy.level >= 4) suggestion = 'Alta Energia: Gravar Séries';
                else if (energy.level === 3) suggestion = 'Energia Média: Conteúdo Curto';
                else suggestion = 'Baixa Energia: Janelas ou Descanso';
              }

              return (
                <div 
                  key={day.toString()} 
                  className={cn(
                    "p-8 rounded-3xl border transition-all relative overflow-hidden group",
                    isToday 
                      ? "bg-[var(--bg-secondary)] border-[var(--text-primary)] shadow-2xl ring-4 ring-[var(--text-primary)]/5" 
                      : "bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--border-strong)] shadow-sm hover:shadow-xl hover:-translate-y-1"
                  )}
                >
                  {isToday && (
                    <div className="absolute top-0 right-0 p-4">
                       <span className="text-[9px] font-black bg-[var(--text-primary)] text-[var(--bg-primary)] px-3 py-1 rounded-full uppercase tracking-[0.2em]">HOJE</span>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-4">
                        <h3 className={cn(
                          "text-2xl font-black uppercase tracking-tight",
                          isToday ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] opacity-80"
                        )}>
                          {dayOfWeek}
                        </h3>
                        <span className="text-xs font-black text-[var(--text-tertiary)] opacity-40 uppercase tracking-widest">
                          {format(day, "dd 'de' MMM")}
                        </span>
                      </div>
                      {suggestion && (
                        <div className="inline-flex items-center gap-2 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] px-3 py-1 rounded-full border border-[var(--accent-blue)]/20 animate-in fade-in slide-in-from-left-2">
                           <Zap className="w-3 h-3 fill-current" />
                           <span className="text-[10px] font-black uppercase tracking-widest">{suggestion}</span>
                        </div>
                      )}
                    </div>

                    {energy && (
                      <div className="flex items-center gap-3 px-4 py-2 bg-[var(--accent-orange)]/10 rounded-2xl border border-[var(--accent-orange)]/20">
                        <span className="text-[10px] font-black text-[var(--accent-orange)] uppercase tracking-widest">Energia</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(v => (
                            <div key={v} className={cn(
                              "w-1.5 h-4 rounded-full transition-all",
                              v <= energy.level ? "bg-[var(--accent-orange)]" : "bg-[var(--accent-orange)]/10"
                            )} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {dayItems.length > 0 ? dayItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between group/item p-4 bg-[var(--bg-hover)] rounded-2xl border border-transparent hover:border-[var(--border-color)] transition-all">
                        <div className="flex items-center gap-4 text-[var(--text-primary)] min-w-0">
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0 shadow-sm",
                            item.type === 'Reunião' ? 'bg-[var(--accent-blue)]' : 
                            item.type === 'Entrega' ? 'bg-purple-500' : 'bg-[var(--accent-green)]'
                          )} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold truncate tracking-tight">{item.title}</span>
                            <span className="text-[9px] text-[var(--text-tertiary)] font-black uppercase tracking-widest opacity-60">{item.type}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => dispatch({ type: 'DELETE_AGENDA', payload: item.id })}
                          className="p-3 text-red-500 opacity-0 group-hover/item:opacity-40 hover:!opacity-100 hover:bg-red-500/10 rounded-xl transition-all"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )) : (
                      <div className="py-6 border-2 border-dashed border-[var(--border-color)] rounded-2xl opacity-30 flex items-center justify-center">
                        <p className="text-[10px] text-[var(--text-tertiary)] font-black uppercase tracking-[0.3em]">Vazio</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Column (Side on desktop) */}
        <div className="lg:col-span-1">
          <section className="p-10 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-xl lg:sticky lg:top-10 transition-all hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-10 text-[var(--text-primary)]">
              <div className="p-2 bg-[var(--bg-hover)] rounded-xl border border-[var(--border-color)]">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[11px] uppercase tracking-[0.2em] font-black italic">Novo Bloco</span>
            </div>

            <form onSubmit={handleAddAgenda} className="space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--text-tertiary)] ml-2 opacity-60">O QUE É?</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Reunião, Gravação, Evento..."
                  className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)] transition-all"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--text-tertiary)] ml-2 opacity-60">QUANDO?</label>
                <input 
                  type="date" 
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)] transition-all"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--text-tertiary)] ml-2 opacity-60">CATEGORIA</label>
                <div className="grid grid-cols-1 gap-2">
                  {['Reunião', 'Entrega', 'Publicação'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewType(type as any)}
                      className={cn(
                        "text-left px-6 py-4 text-xs font-black rounded-2xl border transition-all uppercase tracking-widest",
                        newType === type 
                          ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-lg" 
                          : "bg-[var(--bg-hover)] text-[var(--text-tertiary)] border-[var(--border-color)] hover:border-[var(--text-primary)]/40 hover:text-[var(--text-primary)]"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                disabled={!newTitle.trim()}
                className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] py-5 rounded-3xl text-xs font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-10 shadow-xl shadow-black/5"
              >
                ADICIONAR
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
