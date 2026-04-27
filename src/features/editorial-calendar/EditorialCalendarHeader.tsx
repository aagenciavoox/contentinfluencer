import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EditorialMainTab, EditorialTabOption } from './types';

interface EditorialCalendarHeaderProps {
  activeTab: EditorialMainTab;
  tabs: EditorialTabOption[];
  onTabChange: (tab: EditorialMainTab) => void;
  onAddAgenda: () => void;
  onAddProject: () => void;
}

const subtitleByTab: Record<EditorialMainTab, string> = {
  agenda: 'Agenda Editorial',
  cronograma: 'Cronograma de Projetos',
  projetos: 'Diretório de Marcas',
  'visao-geral': 'Kanban de Parcerias',
};

export function EditorialCalendarHeader({
  activeTab,
  tabs,
  onTabChange,
  onAddAgenda,
  onAddProject,
}: EditorialCalendarHeaderProps) {
  return (
    <header className="px-5 md:px-10 py-5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] sticky top-0 z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-5">
        <div className="p-2.5 bg-[var(--text-primary)]/10 rounded-2xl">
          <CalendarIcon className="w-5 h-5 text-[var(--text-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Calendário</h1>
          <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-[0.25em] font-black italic">
            {subtitleByTab[activeTab]}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-[var(--bg-hover)] p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all',
                activeTab === tab.id
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] italic hover:bg-[var(--bg-primary)]/50'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'agenda' ? (
          <button
            type="button"
            onClick={onAddAgenda}
            className="flex items-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md hover-action"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Evento
          </button>
        ) : (
          <button
            type="button"
            onClick={onAddProject}
            className="flex items-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md hover-action"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Projeto
          </button>
        )}
      </div>
    </header>
  );
}
