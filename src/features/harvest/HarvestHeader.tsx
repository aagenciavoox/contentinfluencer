import { ChevronLeft, ChevronRight, Plus, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiltroAtivo, FILTRO_LABELS, ItemType } from './types';
import { cn } from '../../lib/utils';

interface HarvestHeaderProps {
  currentDate: Date;
  filtros: FiltroAtivo;
  sugestaoHoje: string | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToggleFiltro: (tipo: ItemType) => void;
  onAddCompromisso: () => void;
}

export function HarvestHeader({
  currentDate,
  filtros,
  sugestaoHoje,
  onPrevMonth,
  onNextMonth,
  onToggleFiltro,
  onAddCompromisso,
}: HarvestHeaderProps) {
  return (
    <>
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.4em] mb-2 italic">
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

        <div className="flex items-center gap-4 bg-[var(--bg-secondary)] p-2 rounded-[2rem] border border-[var(--border-color)] shadow-xl shrink-0">
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-3 hover:bg-[var(--bg-hover)] rounded-2xl transition-all hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-[0.2em] min-w-[160px] text-center">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button
            type="button"
            onClick={onNextMonth}
            className="p-3 hover:bg-[var(--bg-hover)] rounded-2xl transition-all hover:scale-105 active:scale-95"
          >
            <ChevronRight className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTRO_LABELS) as ItemType[]).map((tipo) => {
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
                type="button"
                onClick={() => onToggleFiltro(tipo)}
                className={cn(
                  'text-[10px] font-black px-3 py-1.5 rounded-full border-2 transition-all',
                  ativo
                    ? `${corMap[tipo]} bg-transparent`
                    : 'border-[var(--border-color)] text-[var(--text-primary)] opacity-30 hover:opacity-60'
                )}
              >
                {FILTRO_LABELS[tipo]}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onAddCompromisso}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.03] transition-all shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Compromisso
        </button>
      </div>
    </>
  );
}
