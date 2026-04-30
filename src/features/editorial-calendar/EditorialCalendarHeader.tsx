import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EditorialMainTab, EditorialTabOption } from './types';
import { DesktopPageHeader } from '../../components/layout/DesktopPageHeader';
import { AppButton } from '../../components/common/AppButton';
import { useIsMobile } from '../../hooks/useIsMobile';

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
  const isMobile = useIsMobile();

  return (
    <header className="desktop-header-sticky transition-colors duration-300">
      <div className="desktop-header-frame">
        <DesktopPageHeader
          section="Planejamento"
          title="Calendário"
          subtitle={subtitleByTab[activeTab]}
          icon={CalendarIcon}
          className="mb-0"
          actions={
            activeTab === 'agenda' ? (
              <AppButton
                variant="primary"
                size={isMobile ? 'sm' : 'md'}
                onClick={onAddAgenda}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="uppercase tracking-widest"
              >
                Novo Evento
              </AppButton>
            ) : (
              <AppButton
                variant="primary"
                size={isMobile ? 'sm' : 'md'}
                onClick={onAddProject}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="uppercase tracking-widest"
              >
                Novo Projeto
              </AppButton>
            )
          }
        >
          <div className="flex items-center gap-3 flex-wrap">
            {isMobile ? (
              <select
                value={activeTab}
                onChange={(e) => onTabChange(e.target.value as EditorialMainTab)}
                className="filter-select t-label flex-1"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>{tab.label}</option>
                ))}
              </select>
            ) : (
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
            )}
          </div>
        </DesktopPageHeader>
      </div>
    </header>
  );
}
