import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Calendar, Clock, CheckCircle2, ChevronRight, Plus, AlertCircle, LayoutDashboard,
  Briefcase,
  ListTodo,
  Columns
} from 'lucide-react';
import { format, isSameMonth, isSameDay, addMonths, startOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Partnership, PartnershipStatus } from '../types';
import { PARTNERSHIP_STAGES } from '../constants';
import { BottomSheetModal } from '../components/BottomSheetModal';
import { PartnershipForm } from '../components/partnerships/PartnershipForm';

type ViewMode = 'calendar' | 'timeline' | 'projects' | 'dashboard';

export function ProjectCalendar() {
  const { state, dispatch } = useAppContext();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedProject, setSelectedProject] = useState<Partnership | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAddProject = () => {
    setSelectedProject({
      id: Math.random().toString(36).substr(2, 9),
      brand: '',
      brandColor: '#' + Math.floor(Math.random()*16777215).toString(16),
      title: '',
      status: PARTNERSHIP_STAGES[0],
      createdAt: new Date().toISOString()
    } as Partnership);
    setIsFormOpen(true);
  };

  const saveProject = (project: Partnership) => {
    let finalProject = { ...project };

    // Se a fase for Roteiro, criamos ou atualizamos um conteúdo correspondente no Inventário
    if (finalProject.status === 'Roteiro') {
      if (!finalProject.contentId) {
        const newContentId = Math.random().toString(36).substr(2, 9);
        const newContent = {
          id: newContentId,
          title: `[PUB ${finalProject.brand}] ${finalProject.title}`,
          seriesId: 'none',
          pillar: 'pilar-indicacao', // Mapeamento genérico
          format: 'Reels', // Mantendo tipo base
          status: 'Pronto para Gravar' as any, // Inicia já como pronto para uso de Roteiro
          script: finalProject.script || '',
          notes: finalProject.notes || '',
          createdAt: new Date().toISOString()
        } as any;
        dispatch({ type: 'ADD_CONTENT', payload: newContent });
        finalProject.contentId = newContentId;
      } else {
        // Se já existe, sincroniza o roteiro do projeto com o conteúdo
        const existingContent = state.contents.find(c => c.id === finalProject.contentId);
        if (existingContent && existingContent.script !== finalProject.script) {
          dispatch({ 
            type: 'UPDATE_CONTENT', 
            payload: { ...existingContent, script: finalProject.script, notes: finalProject.notes } 
          });
        }
      }
    }

    const existing = state.partnerships.find(p => p.id === finalProject.id);
    if (existing) {
      dispatch({ type: 'UPDATE_PARTNERSHIP', payload: finalProject });
    } else {
      dispatch({ type: 'ADD_PARTNERSHIP', payload: finalProject });
    }
    setIsFormOpen(false);
  };

  const openProjectModal = (p: Partnership) => {
    let proj = { ...p };
    // Mantenha sincronizado se o roteiro foi editado pelo Inventário
    if (proj.contentId) {
      const linkedContent = state.contents.find(c => c.id === proj.contentId);
      if (linkedContent) {
         proj.script = linkedContent.script;
      }
    }
    setSelectedProject(proj);
    setIsFormOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] transition-colors duration-200">
      <header className="px-6 md:px-10 py-6 md:py-8 border-b border-[var(--border-color)] flex flex-col md:flex-row md:items-center justify-between bg-[var(--bg-secondary)] shadow-sm sticky top-0 z-20 gap-6">
        <div className="flex items-center gap-6">
          <div className="p-3 bg-[var(--text-primary)]/10 rounded-2xl shadow-inner">
             <Calendar className="w-6 h-6 text-[var(--text-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Calendário</h1>
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.2em] font-black italic">Projetos & Marcas</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-[var(--bg-hover)] p-1.5 rounded-xl">
             <button 
               onClick={() => setViewMode('calendar')}
               className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2", viewMode === 'calendar' ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md" : "text-[var(--text-tertiary)] hover:opacity-100")}
             >
               <Calendar className="w-3.5 h-3.5" /> Mês a Mês
             </button>
             <button 
               onClick={() => setViewMode('timeline')}
               className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2", viewMode === 'timeline' ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md" : "text-[var(--text-tertiary)] hover:opacity-100")}
             >
               <Clock className="w-3.5 h-3.5" /> Cronograma
             </button>
             <button 
               onClick={() => setViewMode('projects')}
               className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2", viewMode === 'projects' ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md" : "text-[var(--text-tertiary)] hover:opacity-100")}
             >
               <Briefcase className="w-3.5 h-3.5" /> Projetos
             </button>
             <button 
               onClick={() => setViewMode('dashboard')}
               className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2", viewMode === 'dashboard' ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md" : "text-[var(--text-tertiary)] hover:opacity-100")}
             >
               <LayoutDashboard className="w-3.5 h-3.5" /> Visão Geral
             </button>
          </div>
          <button 
            onClick={handleAddProject}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-6 py-2.5 rounded-xl text-sm font-black hover:scale-105 active:scale-95 transition-all shadow-lg shrink-0"
          >
            <Plus className="w-4 h-4" /> NOVO PROJETO
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto custom-scrollbar">
        {viewMode === 'calendar' && <CalendarView onSelectProject={openProjectModal} />}
        {viewMode === 'timeline' && <TimelineView projects={state.partnerships} onSelect={openProjectModal} />}
        {viewMode === 'projects' && <ProjectsDirectory projects={state.partnerships} onSelect={openProjectModal} />}
        {viewMode === 'dashboard' && <DashboardOverview projects={state.partnerships} onSelect={openProjectModal} />}
      </div>

      <BottomSheetModal open={isFormOpen} onClose={() => setIsFormOpen(false)} desktopMaxW="max-w-2xl">
         {selectedProject && (
           <PartnershipForm 
             initialData={selectedProject} 
             onSave={saveProject} 
             onClose={() => setIsFormOpen(false)} 
             onDelete={(id) => { dispatch({ type: 'DELETE_PARTNERSHIP', payload: id }); setIsFormOpen(false); }}
           />
         )}
      </BottomSheetModal>
    </div>
  );
}// 1. Calendário (Vista Principal) - Master Agenda
function CalendarView({ onSelectProject }: { onSelectProject: (p: Partnership) => void }) {
  const { state } = useAppContext();
  const [filters, setFilters] = useState({ conteudos: true, agenda: true, projetos: true });
  
  // Renderizar 6 meses a partir do mês atual para o scroll
  const currentMonthStart = startOfMonth(new Date());
  const monthsRendered = Array.from({ length: 6 }, (_, i) => addMonths(currentMonthStart, i));

  // Mapa global de eventos por data (YYYY-MM-DD)
  const itemsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    const add = (date: string, item: any) => {
      const d = date.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(item);
    };

    if (filters.conteudos) {
      state.contents.forEach(c => {
        if (c.publishDate) add(c.publishDate, { ...c, __type: 'conteudo_pub' });
        if (c.recordingDate) add(c.recordingDate, { ...c, __type: 'conteudo_rec' });
      });
    }
    if (filters.projetos) {
      state.partnerships.forEach(p => {
         if (p.deadline) add(p.deadline, { ...p, __type: 'projeto' });
      });
    }
    if (filters.agenda) {
      state.agenda.forEach(a => {
         add(a.date, { ...a, __type: 'agenda' });
      });
    }

    return map;
  }, [state.contents, state.partnerships, state.agenda, filters]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Filters & Legend Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] shrink-0">
         <div className="flex flex-wrap gap-2">
           <button 
             onClick={() => setFilters(f => ({...f, conteudos: !f.conteudos}))}
             className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all", filters.conteudos ? "border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/5" : "border-[var(--border-color)] text-[var(--text-tertiary)] hover:border-[var(--accent-blue)]/40")}
           >
              Conteúdos
           </button>
           <button 
             onClick={() => setFilters(f => ({...f, agenda: !f.agenda}))}
             className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all", filters.agenda ? "border-purple-400 text-purple-600 bg-purple-500/5 dark:text-purple-400" : "border-[var(--border-color)] text-[var(--text-tertiary)] hover:border-purple-400/40")}
           >
              Agenda Interna
           </button>
           <button 
             onClick={() => setFilters(f => ({...f, projetos: !f.projetos}))}
             className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all", filters.projetos ? "border-[var(--text-primary)] text-[var(--text-primary)] bg-[var(--text-primary)]/5" : "border-[var(--border-color)] text-[var(--text-tertiary)] hover:border-[var(--text-primary)]/40")}
           >
              Projetos Patrocinados
           </button>
         </div>
         <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] flex-wrap">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[var(--accent-blue)]"></div> Publicação</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[var(--accent-orange)]"></div> Gravação</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Compromisso</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 border border-[var(--text-primary)]"></div> Projeto</div>
         </div>
      </div>
      
      {/* Brands Legend */}
      <div className="flex flex-wrap items-center gap-6 px-6 py-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)] shrink-0">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Marcas:</span>
          {Array.from(new Set(state.partnerships.map(p => p.brand))).map(brand => {
             const p = state.partnerships.find(pr => pr.brand === brand);
             if (!p) return null;
             return (
               <div key={brand} className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: p.brandColor }} />
                 <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-widest">{brand}</span>
               </div>
             );
          })}
          {state.partnerships.length === 0 && (
             <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest italic opacity-40">Nenhuma marca ativa</span>
          )}
      </div>

      {/* Monthly Grids Scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 space-y-16 pb-32">
        {monthsRendered.map(month => {
          const mStart = startOfMonth(month);
          const cStart = startOfWeek(mStart, { weekStartsOn: 0 });
          const cEnd = endOfWeek(addMonths(mStart, 1), { weekStartsOn: 0 }); // To ensure enough weeks, but we just use eachDayOfInterval up to endOfMonth's endOfWeek
          const monthDays = eachDayOfInterval({ start: cStart, end: endOfWeek(addMonths(mStart, 0).setDate(addMonths(mStart, 0).getDate() - 1) ? new Date(month.getFullYear(), month.getMonth() + 1, 0) : new Date(), { weekStartsOn: 0 }) });
          // Simpler: 
          const actualDays = eachDayOfInterval({ start: cStart, end: endOfWeek(new Date(month.getFullYear(), month.getMonth() + 1, 0), { weekStartsOn: 0 }) });

          return (
            <div key={month.toISOString()} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-hover)]/30">
                <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">
                  {format(month, 'MMMM yyyy', { locale: ptBR })}
                </h2>
              </div>
              
              <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] italic">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {actualDays.map((day, i) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const items = itemsByDate[dateStr] || [];
                  const isCurrentMonth = day.getMonth() === month.getMonth();
                  const isTodayDay = isSameDay(day, new Date());

                  return (
                    <div 
                      key={dateStr}
                      className={cn(
                        'min-h-[80px] md:min-h-[120px] p-1.5 md:p-3 border-b border-r border-[var(--border-color)] flex flex-col',
                        !isCurrentMonth && 'bg-[var(--bg-hover)]/20 opacity-30',
                        (i + 1) % 7 === 0 && 'border-r-0'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2 shrink-0">
                        <span className={cn(
                          'text-xs font-black w-6 h-6 flex items-center justify-center rounded-lg',
                          isTodayDay ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]' : 'text-[var(--text-tertiary)]'
                        )}>
                          {format(day, 'd')}
                        </span>
                        {items.length > 0 && <span className="text-[9px] font-black text-[var(--text-tertiary)] opacity-40">{items.length}</span>}
                      </div>

                      <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar pt-1">
                        {items.slice(0, 4).map((item, idx) => {
                          if (item.__type === 'conteudo_pub') {
                             return <div key={idx} className="px-1.5 py-1 text-[8px] font-black uppercase truncate tracking-widest bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] rounded">{item.title}</div>
                          }
                          if (item.__type === 'conteudo_rec') {
                             return <div key={idx} className="px-1.5 py-1 text-[8px] font-black uppercase truncate tracking-widest border border-[var(--accent-orange)] text-[var(--accent-orange)] rounded">Grav: {item.title}</div>
                          }
                          if (item.__type === 'projeto') {
                             return (
                               <div key={idx} onClick={() => onSelectProject(item)} className="px-1.5 py-1 text-[8px] font-black uppercase truncate tracking-widest border border-[var(--text-primary)] text-[var(--text-primary)] rounded cursor-pointer hover:bg-[var(--text-primary)]/10" style={{ borderColor: item.brandColor }}>
                                 {item.brand}
                               </div>
                             )
                          }
                          if (item.__type === 'agenda') {
                             const cor = item.type === 'Reunião' ? 'text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300' : 'text-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300';
                             return <div key={idx} className={cn("px-1.5 py-1 text-[8px] font-black uppercase truncate tracking-widest rounded", cor)}>{item.title}</div>
                          }
                          return null;
                        })}
                        {items.length > 4 && <div className="text-[8px] font-black text-center text-[var(--text-tertiary)] pt-1 italic">+{items.length - 4} ocultos</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 2. Cronograma
function TimelineView({ projects, onSelect }: { projects: Partnership[], onSelect: (p: Partnership) => void }) {
  const sorted = [...projects].filter(p => p.deadline).sort((a,b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-tertiary)] mb-10 text-center italic">Próximas Tarefas</h2>
      <div className="space-y-4 relative border-l-2 border-[var(--border-color)] ml-4 pl-8">
         {sorted.map(project => (
           <div key={project.id} onClick={() => onSelect(project)} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 cursor-pointer hover:bg-[var(--bg-hover)] transition-all relative group shadow-sm">
             <div className="absolute left-[-41px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-[4px] border-[var(--bg-primary)] shadow-sm" style={{ backgroundColor: project.brandColor }} />
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{project.brand}</span>
                   <h3 className="text-base font-black text-[var(--text-primary)] mt-1">{project.title}</h3>
                </div>
                <div className="flex items-center gap-4">
                   <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-widest px-3 py-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                     {project.status}
                   </span>
                   <span className="text-xs font-black text-[var(--text-primary)] opacity-50 whitespace-nowrap">
                     {format(new Date(project.deadline + 'T12:00:00'), "dd 'de' MMM")}
                   </span>
                   <ChevronRight className="w-4 h-4 text-[var(--text-primary)] opacity-20 group-hover:opacity-100 transition-all font-bold" />
                </div>
             </div>
           </div>
         ))}
      </div>
    </div>
  );
}

// 3. Projetos (Diretório)
function ProjectsDirectory({ projects, onSelect }: { projects: Partnership[], onSelect: (p: Partnership) => void }) {
  const brands = Array.from(new Set(projects.map(p => p.brand)));
  return (
    <div className="p-6 md:p-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands.map(brand => {
          const brandProjects = projects.filter(p => p.brand === brand);
          const color = brandProjects[0].brandColor;
          return (
            <div key={brand} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 shadow-sm">
               <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-[var(--border-color)]">
                 <div className="w-10 h-10 rounded-xl shadow-lg border-2 border-[var(--bg-primary)]" style={{ backgroundColor: color }} />
                 <div>
                   <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-wider">{brand}</h2>
                   <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mt-1">{brandProjects.length} ações ativas</p>
                 </div>
               </div>
               <div className="space-y-3">
                 {brandProjects.slice(0,3).map(p => (
                   <div key={p.id} onClick={() => onSelect(p)} className="flex items-center justify-between hover:bg-[var(--bg-hover)] p-2 -mx-2 rounded-xl cursor-pointer transition-colors group">
                     <span className="text-xs font-bold text-[var(--text-primary)] line-clamp-1 flex-1">{p.title}</span>
                     <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-[var(--bg-primary)] rounded-md opacity-60 group-hover:opacity-100">{p.status}</span>
                   </div>
                 ))}
                 {brandProjects.length > 3 && (
                   <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-40 text-center pt-2">+{brandProjects.length - 3} projetos</p>
                 )}
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 4. Visão Geral (Dashboard)
function DashboardOverview({ projects, onSelect }: { projects: Partnership[], onSelect: (p: Partnership) => void }) {
  return (
    <div className="h-full flex overflow-x-auto p-6 md:p-10 gap-6 custom-scrollbar pb-32">
      {PARTNERSHIP_STAGES.map(stage => {
        const stageProjects = projects.filter(p => p.status === stage);
        return (
          <div key={stage} className="w-80 shrink-0 flex flex-col h-full">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] opacity-50">{stage}</h3>
               <span className="text-[10px] font-black text-[var(--bg-primary)] bg-[var(--text-primary)] w-6 h-6 flex items-center justify-center rounded-full">
                 {stageProjects.length}
               </span>
             </div>
             <div className="flex-1 space-y-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-3xl overflow-y-auto custom-scrollbar">
                {stageProjects.map(p => (
                  <div key={p.id} onClick={() => onSelect(p)} className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)] cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1 opacity-80" style={{ backgroundColor: p.brandColor }} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] block mb-2 opacity-70 mt-1">{p.brand}</span>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] mb-3 leading-snug group-hover:text-[var(--accent-blue)] transition-colors line-clamp-2">{p.title}</h4>
                    {p.deadline && (
                       <span className="text-[9px] font-black uppercase tracking-widest bg-[var(--bg-hover)] px-2 py-1 rounded border border-[var(--border-color)] text-[var(--text-primary)]">
                         {format(new Date(p.deadline + 'T12:00:00'), 'dd/MM')}
                       </span>
                    )}
                  </div>
                ))}
                {stageProjects.length === 0 && (
                  <div className="h-full flex items-center justify-center opacity-20 flex-col gap-2 p-8">
                     <AlertCircle className="w-6 h-6 text-[var(--text-primary)]" />
                     <span className="text-[9px] font-black uppercase tracking-[0.2em] text-center text-[var(--text-primary)]">0 Projetos</span>
                  </div>
                )}
             </div>
          </div>
        );
      })}
    </div>
  );
}
