import { BookOpen, RotateCcw, Zap } from 'lucide-react';
import { FilterBar } from '../../../../components/ui/FilterBar';
import { cn } from '../../../../lib/utils';

interface EditorialAgendaFiltersProps {
  activeLayers: string[];
  searchTerm: string;
  sortValue: string;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onToggleLayer: (layerId: string) => void;
}

const LAYER_OPTIONS = [
  { id: 'recordings', label: 'Gravacoes' },
  { id: 'posts', label: 'Postagens' },
  { id: 'partnerships', label: 'Projetos' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'rules', label: 'Regras' },
];

export function EditorialAgendaFilters({
  activeLayers,
  searchTerm,
  sortValue,
  onSearchChange,
  onSortChange,
  onToggleLayer,
}: EditorialAgendaFiltersProps) {
  return (
    <>
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por conteudo, evento ou projeto"
        filters={[
          {
            id: 'camadas',
            label: `Camadas (${activeLayers.length})`,
            type: 'custom',
            renderContent: () => (
              <div className="flex min-w-[240px] flex-col gap-2">
                {LAYER_OPTIONS.map(option => {
                  const active = activeLayers.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onToggleLayer(option.id)}
                      className={cn(
                        'flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-all',
                        active
                          ? 'border-[var(--text-primary)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
                          : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                      )}
                    >
                      <span>{option.label}</span>
                      <span className="text-xs">{active ? 'Ativo' : 'Oculto'}</span>
                    </button>
                  );
                })}
              </div>
            ),
          },
        ]}
        sortValue={sortValue}
        onSortChange={onSortChange}
        sortOptions={[
          { label: 'Proximos', value: 'proximos' },
          { label: 'Titulo A-Z', value: 'titulo:asc' },
          { label: 'Tipo A-Z', value: 'tipo:asc' },
        ]}
      />

      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Rotacao', text: 'Max 1x/Sem', icon: RotateCcw, color: 'text-orange-500' },
          { label: 'Energia', text: 'Mix Ideal', icon: Zap, color: 'text-blue-500' },
          { label: 'Temas', text: 'Mix Pilares', icon: BookOpen, color: 'text-purple-500' },
        ].map(rule => (
          <div
            key={rule.label}
            className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 shadow-sm"
          >
            <rule.icon className={cn('h-4 w-4 shrink-0', rule.color)} />
            <div>
              <span className="block text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                {rule.label}
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)]">{rule.text}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
