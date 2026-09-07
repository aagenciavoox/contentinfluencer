import { useMemo, useState } from 'react';
import { CircleDollarSign, FolderKanban, Plus, SearchCheck, TimerReset } from 'lucide-react';
import { normalizeProjetoTipo, type Projeto } from '../../../lib/database';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MobileFilterSheet } from '../../components/MobileFilterSheet';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';

type TipoFilter = 'todos' | 'publi' | 'producao' | 'outro';
/** Matches ProjectsPage desktop FilterBar: agenda linkage, not etapa-derived status. */
type StatusFilter = 'todos' | 'com_eventos' | 'sem_eventos';
type ProjectsMobileTab = 'all' | 'com_eventos' | 'sem_eventos';

interface ProjectsMobileScreenProps {
  projetos: Projeto[];
  /** Project IDs that have at least one agenda item (same set ProjectsPage builds). */
  projectIdsWithEvents: Set<string>;
  onOpenProject: (projectId: string) => void;
  onCreateProject: () => void;
}

const TIPO_LABELS: Record<Exclude<TipoFilter, 'todos'>, string> = {
  publi: 'Publi',
  producao: 'Producao',
  outro: 'Outro',
};

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [sortValue, setSortValue] = useState('updatedAt:desc');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const withEventsCount = useMemo(
    () => projetos.filter((projeto) => projectIdsWithEvents.has(projeto.id)).length,
    [projectIdsWithEvents, projetos]
  );
  const withoutEventsCount = projetos.length - withEventsCount;

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const effectiveStatus: StatusFilter =
      activeTab === 'all' ? statusFilter : activeTab;

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
  }, [activeTab, projectIdsWithEvents, projetos, search, sortValue, statusFilter, typeFilter]);

  const focusAction = (
    <AppButton variant="primary" fullWidth onClick={onCreateProject} leftIcon={<Plus className="h-4 w-4" />}>
      Novo projeto
    </AppButton>
  );

  return (
    <div className="stack-lg">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <MobileSectionHeader
          icon={FolderKanban}
          tone="green"
          title="Projetos abertos"
          description="Datas, valor e contexto em cards leves para consulta rapida."
        />

        <div className="grid-metrics-3">
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Total</p>
            <Text variant="sectionTitle" as="p" className="mt-1 tabular-nums">{projetos.length}</Text>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Com eventos</p>
            <Text variant="sectionTitle" as="p" className="mt-1 tabular-nums">{withEventsCount}</Text>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Sem eventos</p>
            <Text variant="sectionTitle" as="p" className="mt-1 tabular-nums">{withoutEventsCount}</Text>
          </div>
        </div>

        <AppButton variant="primary" fullWidth onClick={onCreateProject} className="mt-4" leftIcon={<Plus className="h-4 w-4" />}>
          Criar projeto
        </AppButton>
      </section>

      <section className="stack-lg">
        <MobileSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar projeto ou marca"
          onFilterClick={() => setIsFilterSheetOpen(true)}
        />

        <MobileSegmentTabs
          tabs={[
            { value: 'all', label: 'Todos', count: projetos.length },
            { value: 'com_eventos', label: 'Com eventos', count: withEventsCount },
            { value: 'sem_eventos', label: 'Sem eventos', count: withoutEventsCount },
          ]}
          value={activeTab}
          onChange={(value) => setActiveTab(value)}
        />

        {filteredProjects.length === 0 ? (
          <EmptyState compact
            title="Nenhum projeto encontrado"
            description="Ajuste a busca ou abra um novo projeto para alimentar essa camada mobile."
            action={focusAction}
            icon={<SearchCheck className="h-8 w-8" />}
          />
        ) : (
          <div className="stack-md">
            {filteredProjects.map((projeto) => {
              const progress = getProgress(projeto);
              const hasEvents = projectIdsWithEvents.has(projeto.id);

              return (
                <MobileListCard
                  key={projeto.id}
                  onClick={() => onOpenProject(projeto.id)}
                  eyebrow={TIPO_LABELS[normalizeProjetoTipo(projeto.tipo)]}
                  title={projeto.nome}
                  description={projeto.brand || projeto.notes || 'Sem observacoes adicionais'}
                  meta={
                    <>
                      {projeto.value ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-orange)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent-orange)]">
                          <CircleDollarSign className="h-3 w-3" />
                          {projeto.value.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: projeto.currency || 'BRL',
                          })}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-green)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent-green)]">
                        <TimerReset className="h-3 w-3" />
                        {hasEvents ? 'Com eventos' : 'Sem eventos'}
                      </span>
                    </>
                  }
                  status={
                    <div className="stack-sm">
                      <div className="flex items-center justify-between">
                        <span className="t-label text-[var(--text-tertiary)]">Progresso</span>
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">{progress}%</span>
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
              );
            })}
          </div>
        )}
      </section>

      <MobileFilterSheet
        open={isFilterSheetOpen}
        title="Filtrar projetos"
        onClose={() => setIsFilterSheetOpen(false)}
      >
        <label className="block stack-sm">
          <span className="t-label text-[var(--text-tertiary)]">Tipo</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TipoFilter)}>
            <option value="todos">Todos</option>
            <option value="publi">Publi</option>
            <option value="producao">Producao</option>
            <option value="outro">Outro</option>
          </select>
        </label>

        <label className="block stack-sm">
          <span className="t-label text-[var(--text-tertiary)]">Agenda</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="todos">Todos</option>
            <option value="com_eventos">Com eventos</option>
            <option value="sem_eventos">Sem eventos</option>
          </select>
        </label>

        <label className="block stack-sm">
          <span className="t-label text-[var(--text-tertiary)]">Ordenacao</span>
          <select value={sortValue} onChange={(event) => setSortValue(event.target.value)}>
            <option value="updatedAt:desc">Atualizados</option>
            <option value="name:asc">Nome A-Z</option>
            <option value="value:desc">Maior valor</option>
          </select>
        </label>

        <AppButton
          variant="primary"
          fullWidth
          onClick={() => {
            setTypeFilter('todos');
            setStatusFilter('todos');
            setSortValue('updatedAt:desc');
            setIsFilterSheetOpen(false);
          }}
        >
          Limpar filtros
        </AppButton>
      </MobileFilterSheet>
    </div>
  );
}
