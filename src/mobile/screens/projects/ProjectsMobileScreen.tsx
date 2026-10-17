import { useMemo, useState } from 'react';
import { CircleDollarSign, FolderKanban, Plus, SearchCheck, TimerReset } from 'lucide-react';
import { normalizeProjetoTipo, type Projeto } from '../../../lib/database';
import { isProjetoEvento, isProjetoPubli, rotuloAvisoDias, rotuloProjetoTipo } from '../../../features/projects/lib/evento';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MobileFilterSelect, MobileFilterSheet } from '../../components/MobileFilterSheet';
import { Badge } from '../../../components/ui/Badge';
import { FilterChips } from '../../../components/ui/FilterChips';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';

type TipoFilter = 'todos' | 'publi' | 'parceria' | 'producao' | 'evento' | 'maratona' | 'outro';
/** Matches ProjectsPage desktop FilterBar: agenda linkage, not etapa-derived status. */
type ProjectsMobileTab = 'all' | 'com_eventos' | 'sem_eventos';

interface ProjectsMobileScreenProps {
  projetos: Projeto[];
  /** Project IDs that have at least one agenda item (same set ProjectsPage builds). */
  projectIdsWithEvents: Set<string>;
  onOpenProject: (projectId: string) => void;
  onCreateProject: () => void;
}

const TIPO_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'publi', label: 'Publi' },
  { value: 'parceria', label: 'Parceria' },
  { value: 'producao', label: 'Produção' },
  { value: 'evento', label: 'Evento' },
  { value: 'maratona', label: 'Maratona de leitura' },
  { value: 'outro', label: 'Outro' },
] as const;

const SORT_OPTIONS = [
  { value: 'updatedAt:desc', label: 'Atualizados' },
  { value: 'name:asc', label: 'Nome A–Z' },
  { value: 'value:desc', label: 'Maior valor' },
] as const;

function getProgress(projeto: Projeto) {
  if (projeto.etapas.length === 0) return 0;
  const done = projeto.etapas.filter((etapa) => etapa.status === 'concluída').length;
  return Math.round((done / projeto.etapas.length) * 100);
}

export function ProjectsMobileScreen({
  projetos,
  projectIdsWithEvents,
  onOpenProject,
  onCreateProject,
}: ProjectsMobileScreenProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ProjectsMobileTab>('all');
  const [typeFilter, setTypeFilter] = useState<TipoFilter>('todos');
  const [sortValue, setSortValue] = useState('updatedAt:desc');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const withEventsCount = useMemo(
    () => projetos.filter((projeto) => projectIdsWithEvents.has(projeto.id)).length,
    [projectIdsWithEvents, projetos]
  );
  const withoutEventsCount = projetos.length - withEventsCount;

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    // Um filtro de agenda só: os chips acima da lista (o select "Agenda" da folha repetia os chips).
    const effectiveStatus = activeTab;

    return [...projetos]
      .filter((projeto) => {
        const hasEvents = projectIdsWithEvents.has(projeto.id);
        if (effectiveStatus === 'com_eventos' && !hasEvents) return false;
        if (effectiveStatus === 'sem_eventos' && hasEvents) return false;
        if (typeFilter !== 'todos' && normalizeProjetoTipo(projeto.tipo) !== typeFilter) return false;

        if (normalizedSearch) {
          const haystack = [projeto.nome, projeto.brand || '', projeto.notes || ''].join(' ').toLowerCase();
          if (!haystack.includes(normalizedSearch)) return false;
        }

        return true;
      })
      .sort((left, right) => {
        if (sortValue === 'name:asc') return left.nome.localeCompare(right.nome);
        if (sortValue === 'value:desc') return (right.value || 0) - (left.value || 0);
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
  }, [activeTab, projectIdsWithEvents, projetos, search, sortValue, typeFilter]);

  const hasActiveFilters = Boolean(search.trim()) || activeTab !== 'all' || typeFilter !== 'todos';
  const clearSearchAndFilters = () => {
    setSearch('');
    setActiveTab('all');
    setTypeFilter('todos');
  };

  return (
    <div className="stack-lg">
      {/* O cabeçalho já diz "Projetos". Os números ficam nos chips de filtro e a tela tem uma ação principal só. */}
      <section className="stack-md">
        <Text variant="secondary" className="px-1">Datas combinadas, valores e contexto de cada projeto.</Text>
        <AppButton variant="primary" fullWidth onClick={onCreateProject} leftIcon={<Plus className="h-4 w-4" />}>
          Novo projeto
        </AppButton>
      </section>

      <section className="stack-lg">
        <MobileSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar projeto ou marca"
          onFilterClick={() => setIsFilterSheetOpen(true)}
          filterLabel="Abrir filtros de projetos"
        />

        <FilterChips<ProjectsMobileTab>
          ariaLabel="Filtrar por agenda"
          options={[
            { id: 'all', label: 'Todos', count: projetos.length },
            { id: 'com_eventos', label: 'Com eventos', count: withEventsCount },
            { id: 'sem_eventos', label: 'Sem eventos', count: withoutEventsCount },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />

        {filteredProjects.length === 0 ? (
          projetos.length === 0 ? (
            <EmptyState compact
              title="Nenhum projeto ainda"
              description="Publis, parcerias e eventos ficam aqui, com datas e valores."
              icon={<FolderKanban className="h-8 w-8" />}
            />
          ) : (
            <EmptyState compact
              title="Nenhum projeto encontrado"
              description="Nada com essa busca ou filtro."
              action={
                hasActiveFilters ? (
                  <AppButton variant="secondary" onClick={clearSearchAndFilters}>
                    Limpar busca e filtros
                  </AppButton>
                ) : undefined
              }
              icon={<SearchCheck className="h-8 w-8" />}
            />
          )
        ) : (
          <div className="stack-md">
            {filteredProjects.map((projeto) => {
              const progress = getProgress(projeto);
              const hasEvents = projectIdsWithEvents.has(projeto.id);

              return (
                <div key={projeto.id} className="relative overflow-hidden rounded-[var(--radius-card-mobile)]">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1"
                    style={{ backgroundColor: projeto.color || 'var(--border-strong)' }}
                  />
                  <MobileListCard
                    onClick={() => onOpenProject(projeto.id)}
                    eyebrow={rotuloProjetoTipo(normalizeProjetoTipo(projeto.tipo), projeto.tipoPersonalizado)}
                    title={projeto.nome}
                    description={projeto.brand || projeto.notes || 'Sem observações adicionais'}
                    meta={
                      <>
                        {isProjetoPubli(projeto.tipo) && projeto.value ? (
                          <Badge variant="neutral">
                            <CircleDollarSign className="mr-1 h-3 w-3" aria-hidden />
                            {projeto.value.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: projeto.currency || 'BRL',
                            })}
                          </Badge>
                        ) : null}
                        <Badge variant="neutral">
                          <TimerReset className="mr-1 h-3 w-3" aria-hidden />
                          {hasEvents ? 'Com eventos' : 'Sem eventos'}
                        </Badge>
                        {isProjetoEvento(projeto.tipo) && projeto.avisoDias != null ? (
                          <Badge variant="neutral">{rotuloAvisoDias(projeto.avisoDias)}</Badge>
                        ) : null}
                      </>
                    }
                    status={
                      <div className="stack-sm">
                        <div className="flex items-center justify-between">
                          <Text variant="label">Progresso</Text>
                          <Text variant="meta">{progress}%</Text>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--bg-hover)]">
                          <div
                            className="h-full rounded-full bg-[var(--text-primary)] transition-[width]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <MobileFilterSheet
        open={isFilterSheetOpen}
        title="Filtrar projetos"
        onClose={() => setIsFilterSheetOpen(false)}
        onClear={() => {
          setTypeFilter('todos');
          setSortValue('updatedAt:desc');
          setIsFilterSheetOpen(false);
        }}
      >
        <MobileFilterSelect
          label="Tipo"
          value={typeFilter}
          onChange={(value) => setTypeFilter(value as TipoFilter)}
          options={TIPO_OPTIONS}
        />
        <MobileFilterSelect
          label="Ordenação"
          value={sortValue}
          onChange={setSortValue}
          options={SORT_OPTIONS}
        />
      </MobileFilterSheet>
    </div>
  );
}
