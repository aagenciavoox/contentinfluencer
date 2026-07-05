import {BookOpen, Mic2, RotateCcw, Send, CalendarDays, Zap} from 'lucide-react';
import {FilterBar} from '../../../../components/ui/FilterBar';
import {cn} from '../../../../lib/utils';

interface EditorialAgendaFiltersProps {
  activeLayers: string[];
  searchTerm: string;
  sortValue: string;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onToggleLayer: (layerId: string) => void;
}

const LAYER_OPTIONS = [
  {id: 'recordings', label: 'Gravacoes', icon: Mic2, color: 'orange'},
  {id: 'posts', label: 'Postagens', icon: Send, color: 'blue'},
  {id: 'projects', label: 'Projetos', icon: BookOpen, color: 'purple'},
  {id: 'agenda', label: 'Agenda', icon: CalendarDays, color: 'green'},
] as const;

const COLOR_MAP: Record<string, {active: string; dot: string}> = {
  orange: {active: 'border-[var(--accent-orange)]/50 bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]', dot: 'bg-[var(--accent-orange)]'},
  blue: {active: 'border-[var(--accent-blue)]/50 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]', dot: 'bg-[var(--accent-blue)]'},
  purple: {active: 'border-[var(--accent-purple)]/50 bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]', dot: 'bg-[var(--accent-purple)]'},
  green: {active: 'border-[var(--accent-green)]/50 bg-[var(--accent-green)]/10 text-[var(--accent-green)]', dot: 'bg-[var(--accent-green)]'},
};

export function EditorialAgendaFilters({
  activeLayers,
  searchTerm,
  sortValue,
  onSearchChange,
  onSortChange,
  onToggleLayer,
}: EditorialAgendaFiltersProps) {
  return (
    <div className="stack-md">
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por conteúdo, evento, projeto ou entrega"
        filters={[]}
        sortValue={sortValue}
        onSortChange={onSortChange}
        sortOptions={[
          {label: 'Próximos', value: 'proximos'},
          {label: 'Título A-Z', value: 'titulo:asc'},
          {label: 'Tipo A-Z', value: 'tipo:asc'},
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {LAYER_OPTIONS.map(option => {
          const active = activeLayers.includes(option.id);
          const colors = COLOR_MAP[option.color];
          const Icon = option.icon;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggleLayer(option.id)}
              className={cn(
                'flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-xs font-bold transition-all select-none',
                'cursor-pointer active:scale-[0.97]',
                active
                  ? colors.active
                  : 'border-[var(--border-color)] text-[var(--text-tertiary)] opacity-50 hover:opacity-80'
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{option.label}</span>
              <span
                className={cn(
                  'h-2 w-2 rounded-full transition-all',
                  active ? colors.dot : 'bg-[var(--text-tertiary)] opacity-30'
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
