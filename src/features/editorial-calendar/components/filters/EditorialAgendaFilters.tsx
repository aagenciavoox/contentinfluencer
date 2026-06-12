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
  orange: {active: 'border-orange-500/50 bg-orange-500/10 text-orange-600', dot: 'bg-orange-500'},
  blue: {active: 'border-blue-500/50 bg-blue-500/10 text-blue-600', dot: 'bg-blue-500'},
  purple: {active: 'border-purple-500/50 bg-purple-500/10 text-purple-600', dot: 'bg-purple-500'},
  green: {active: 'border-green-500/50 bg-green-500/10 text-green-600', dot: 'bg-green-500'},
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
    <div className="space-y-3">
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
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all select-none',
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
