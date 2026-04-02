import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Zap, 
  BookOpen, 
  Film, 
  Heart 
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, addWeeks, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { Content } from '../types';
import { motion } from 'motion/react';

export function EditorialCalendar() {
  const { state } = useAppContext();
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  
  // April 2026 reference
  const aprilStart = new Date(2026, 3, 1);
  const weeks = [0, 1, 2, 3].map(w => {
    const start = addWeeks(startOfWeek(aprilStart, { weekStartsOn: 1 }), w);
    const end = endOfWeek(start, { weekStartsOn: 1 });
    return { start, end };
  });

  const getContentsInInterval = (start: Date, end: Date) => {
    return state.contents.filter(c => {
      if (!c.publishDate) return false;
      const date = parseISO(c.publishDate);
      return isWithinInterval(date, { start, end });
    });
  };

  const getRotationStatus = (weekContents: Content[]) => {
    const formatsCount: Record<string, number> = {};
    const seriesCount: Record<string, number> = {};
    
    weekContents.forEach(c => {
      if (c.seriesId) {
        seriesCount[c.seriesId] = (seriesCount[c.seriesId] || 0) + 1;
      }
    });

    const violations: string[] = [];
    
    // Rule: Max 1x per series (except indications)
    Object.entries(seriesCount).forEach(([id, count]) => {
      if (id !== 'indicacoes' && count > 1) {
        const name = state.series.find(s => s.id === id)?.name || 'Outra';
        violations.push(`Série "${name}" repetida ${count}x na mesma semana.`);
      }
    });

    return violations;
  };

  return (
    <div className="max-w-7xl mx-auto py-10 md:py-16 px-6 md:px-10 transition-colors duration-200">
      <header className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] mb-6 tracking-tight">Estratégia Editorial</h1>
          <p className="text-lg text-[var(--text-tertiary)] font-medium leading-relaxed">
            Gestão de slots baseada em energia e regra de rotação de formatos. A lógica por trás do ecossistema.
          </p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-sm">
           <CalendarIcon className="w-5 h-5 text-[var(--accent-blue)]" />
           <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Abril 2026</span>
        </div>
      </header>

      {/* Golden Rules Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 md:mb-20">
        <div className="p-6 md:p-10 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <RotateCcw className="w-12 h-12" />
          </div>
          <div className="flex items-center gap-3 mb-8 text-[var(--accent-orange)]">
            <RotateCcw className="w-5 h-5" />
            <span className="text-[10px] uppercase font-black tracking-[0.2em]">Rotação</span>
          </div>
          <h3 className="text-2xl font-black text-[var(--text-primary)] mb-4">Max 1x / Semana</h3>
          <p className="text-sm text-[var(--text-tertiary)] font-medium leading-relaxed">Cada formato de série deve aparecer apenas uma vez por semana (exceto Indicações).</p>
        </div>
        
        <div className="p-6 md:p-10 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen className="w-12 h-12" />
          </div>
          <div className="flex items-center gap-3 mb-8 text-purple-500">
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] uppercase font-black tracking-[0.2em]">Temas</span>
          </div>
          <h3 className="text-2xl font-black text-[var(--text-primary)] mb-4">Alternar Assuntos</h3>
          <p className="text-sm text-[var(--text-tertiary)] font-medium leading-relaxed">Máximo 2 posts de livros seguidos. Quebre com filme, comportamento ou ciência.</p>
        </div>

        <div className="p-6 md:p-10 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
           <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-12 h-12" />
          </div>
          <div className="flex items-center gap-3 mb-8 text-[var(--accent-blue)]">
            <Zap className="w-5 h-5" />
            <span className="text-[10px] uppercase font-black tracking-[0.2em]">Energia</span>
          </div>
          <h3 className="text-2xl font-black text-[var(--text-primary)] mb-4">Slots de Energia</h3>
          <p className="text-sm text-[var(--text-tertiary)] font-medium leading-relaxed">Curto (Viral), Série (Identidade) e Janela (Presença) compõem o ecossistema.</p>
        </div>
      </section>

      {/* Weeks Grid */}
      <div className="space-y-20 md:space-y-32">
        {weeks.map((week, idx) => {
          const contents = getContentsInInterval(week.start, week.end);
          const violations = getRotationStatus(contents);
          
          return (
            <div key={idx} className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${idx * 100}ms` }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-color)] pb-8 gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full flex items-center justify-center font-black text-xl shadow-lg">
                    {idx + 1}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Semana {idx + 1}</h2>
                    <span className="text-xs font-black text-[var(--text-tertiary)] uppercase tracking-widest opacity-40">
                      {format(week.start, 'dd MMM')} — {format(week.end, 'dd MMM')}
                    </span>
                  </div>
                </div>
                {violations.length === 0 ? (
                  <div className="flex items-center gap-3 px-5 py-2 bg-[var(--accent-green)]/10 text-[var(--accent-green)] rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-[var(--accent-green)]/20 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" /> REGRA DE OURO OK
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-5 py-2 bg-red-400/10 text-red-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-red-400/20 shadow-sm animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5" /> {violations.length} AVISOS DE ROTAÇÃO
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {contents.map(c => (
                  <motion.div 
                    layoutId={c.id}
                    key={c.id} 
                    onClick={() => setSelectedContent(c)}
                    className="p-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all flex flex-col justify-between cursor-pointer group shadow-sm overflow-hidden relative"
                  >
                    {/* Background accent */}
                    <div className={cn(
                      "absolute -top-4 -right-4 w-20 h-20 blur-3xl opacity-0 group-hover:opacity-40 transition-opacity",
                      c.slotType === 'Curto' && 'bg-[var(--accent-orange)]',
                      c.slotType === 'Série' && 'bg-purple-500',
                      c.slotType === 'Janela' && 'bg-[var(--accent-blue)]',
                    )} />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <span className={cn(
                          "text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border",
                          c.slotType === 'Curto' && 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] border-[var(--accent-orange)]/20',
                          c.slotType === 'Série' && 'bg-purple-500/10 text-purple-500 border-purple-500/20',
                          c.slotType === 'Janela' && 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/20',
                        )}>
                          {c.slotType}
                        </span>
                        <span className="text-[10px] font-black text-[var(--text-tertiary)] opacity-40 uppercase tracking-widest">{format(parseISO(c.publishDate!), 'iii, dd', { locale: ptBR })}</span>
                      </div>
                      <h4 className="text-base font-bold text-[var(--text-primary)] leading-tight mb-8 line-clamp-3 group-hover:text-black dark:group-hover:text-white transition-colors">{c.title}</h4>
                    </div>
                    <div className="relative z-10 pt-6 border-t border-[var(--border-color)]">
                      <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] opacity-40 block">
                        {state.series.find(s => s.id === c.seriesId)?.name || 'Sem Série'}
                      </span>
                    </div>
                  </motion.div>
                ))}
                
                {contents.length === 0 && (
                  <div className="col-span-full py-16 text-center border-2 border-dashed border-[var(--border-color)] rounded-3xl opacity-30 flex flex-col items-center gap-4">
                    <CalendarIcon className="w-8 h-8" />
                    <p className="text-xs text-[var(--text-tertiary)] font-black uppercase tracking-[0.3em] italic">Nenhum conteúdo nesta semana</p>
                  </div>
                )}
              </div>

              {violations.length > 0 && (
                <div className="mt-8 p-8 bg-red-400/5 border border-red-400/10 rounded-3xl space-y-4 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 text-red-500">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Ajustes Estratégicos Necessários</span>
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none">
                    {violations.map((v, i) => (
                      <li key={i} className="flex gap-4 p-4 bg-[var(--bg-secondary)] rounded-2xl border border-red-400/10 text-xs font-bold text-red-400/80 leading-relaxed shadow-sm">
                         <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                         {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Guidelines Section */}
      <section className="mt-16 md:mt-40 pt-12 md:pt-24 border-t border-[var(--border-color)] flex flex-col md:flex-row gap-12 md:gap-20">
        <div className="flex-1 space-y-12">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--accent-orange)] italic">O que evitar</h3>
            <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Fadiga de Formato</h2>
          </div>
          <ul className="space-y-6">
            {[
              "Dois posts de livro específico lado a lado",
              "Dois curtos de humor do mesmo tipo seguidos",
              "Mais de um vídeo de ciência/neurociência na mesma semana",
              "Janela todo dia com o mesmo livro"
            ].map((text, i) => (
              <li key={i} className="flex gap-6 p-6 bg-[var(--bg-hover)] rounded-2xl border border-[var(--border-strong)] text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--accent-orange)]/20 transition-all">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-orange)] mt-1.5 shrink-0 shadow-sm shadow-[var(--accent-orange)]/20" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex-1 space-y-12">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-purple-500 italic">Mix Semanal Ideal</h3>
            <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Harmonia de Pilares</h2>
          </div>
          <div className="space-y-6">
            {[
              { label: "Livros", value: "2-3 posts", color: "bg-[var(--accent-blue)]", percent: 40 },
              { label: "Filme / Série", value: "1-2 posts", color: "bg-[var(--accent-orange)]", percent: 25 },
              { label: "Humor / Lifestyle", value: "1-2 posts", color: "bg-pink-500", percent: 25 },
              { label: "Ciência", value: "1 post", color: "bg-purple-500", percent: 10 },
            ].map((item, i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full shadow-sm", item.color)} />
                    <span className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">{item.label}</span>
                  </div>
                  <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">{item.value}</span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden border border-[var(--border-color)]">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-1000", item.color)} 
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedContent && (
        <ContentDetailModal 
          content={state.contents.find(c => c.id === selectedContent.id) || selectedContent} 
          onClose={() => setSelectedContent(null)} 
        />
      )}
    </div>
  );
}
