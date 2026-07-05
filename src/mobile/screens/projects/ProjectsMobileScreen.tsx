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

type TipoFilter = 'todos' | 'publi' | 'producao' | 'outro';
type StatusFilter = 'todos' | 'pendente' | 'em_andamento' | 'concluido';
type ProjectsMobileTab = 'all' | 'active' | 'deadline';

interface ProjectsMobileScreenProps {
  projetos: Projeto[];
  onOpenProject: (projectId: string) => void;
  onCreateProject: () => void;
}

const TIPO_LABELS: Record<Exclude<TipoFilter, 'todos'>, string> = {
  publi: 'Publi',
  producao: 'Producao',
  outro: 'Outro',
};

const STATUS_LABELS: Record<Exclude<StatusFilter, 'todos'>, string> = {
  pendente: 'Em aberto',
  em_andamento: 'Em andamento',
  concluido: 'Concluido',
};

function getProjectStatus(projeto: Projeto): Exclude<StatusFilter, 'todos'> {
  if (projeto.etapas.length === 0) return 'pendente';

  const todas = projeto.etapas.length;
  const concluidas = projeto.etapas.filter((etapa) => etapa.status === 'concluída').length;

  if (concluidas === todas) return 'concluido';
  if (projeto.etapas.some((etapa) => etapa.status === 'em_andamento')) return 'em_andamento';
  return 'pendente';
}

function getProgress(projeto: Projeto) {
  if (projeto.etapas.length === 0) return 0;
  const done = projeto.etapas.filter((etapa) => etapa.status === 'concluída').length;
  return Math.round((done / projeto.etapas.length) * 100);
}

function getDueSoonCount(projetos: Projeto[]) {
  const limit = new Date();
  limit.setDate(limit.getDate() + 14);

  return projetos.filter((projeto) => {
    if (!projeto.dataFim) return false;
    const deadline = new Date(projeto.dataFim);
    return deadline >= new Date() && deadline <= limit && getProjectStatus(projeto) !== 'concluido';
  }).length;
}

export function ProjectsMobileScreen({
  projetos,
  onOpenProject,
  onCreateProject,
}: ProjectsMobileScreenProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ProjectsMobileTab>('all');
  const [typeFilter, setTypeFilter] = useState<TipoFilter>('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [sortValue, setSortValue] = useState('deadline:asc');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const activeProjectsCount = useMemo(
    () => projetos.filter((projeto) => getProjectStatus(projeto) === 'em_andamento').length,
    [projetos]
  );

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...projetos]
      .filter((projeto) => {
        if (activeTab === 'active' && getProjectStatus(projeto) !== 'em_andamento') return false;
        if (activeTab === 'deadline' && !projeto.dataFim) return false;
        if (typeFilter !== 'todos' && normalizeProjetoTipo(projeto.tipo) !== typeFilter) return false;
        if (statusFilter !== 'todos' && getProjectStatus(projeto) !== statusFilter) return false;

        if (normalizedSearch) {
          const haystack = [projeto.nome, projeto.brand || '', projeto.notes || ''].join(' ').toLowerCase();
          if (!haystack.includes(normalizedSearch)) return false;
        }

        return true;
      })
      .sort((left, right) => {
        if (sortValue === 'deadline:asc') {
          if (!left.dataFim && !right.dataFim) return 0;
          if (!left.dataFim) return 1;
          if (!right.dataFim) return -1;
          return left.dataFim.localeCompare(right.dataFim);
        }

        if (sortValue === 'deadline:desc') {
          if (!left.dataFim && !right.dataFim) return 0;
          if (!left.dataFim) return 1;
          if (!right.dataFim) return -1;
          return right.dataFim.localeCompare(left.dataFim);
        }

        if (sortValue === 'name:asc') return left.nome.localeCompare(right.nome);
        if (sortValue === 'value:desc') return (right.value || 0) - (left.value || 0);
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
  }, [activeTab, projetos, search, sortValue, statusFilter, typeFilter]);

  const focusAction = (
    <AppButton variant="primary" fullWidth onClick={onCreateProject} leftIcon={<Plus className="h-4 w-4" />}>
      Novo projeto
    </AppButton>
  );

  return (
    <div className="stack-xl">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <MobileSectionHeader
          icon={FolderKanban}
          tone="green"
          title="Projetos abertos"
          description="Datas, valor e contexto em cards leves para consulta rapida."
        />

        <div className="grid-metrics-3">
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Total</p>
            <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{projetos.length}</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Ativos</p>
            <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{activeProjectsCount}</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Datas</p>
            <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{getDueSoonCount(projetos)}</p>
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
            { value: 'active', label: 'Ativos', count: activeProjectsCount },
            { value: 'deadline', label: 'Datas', count: getDueSoonCount(projetos) },
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
              const status = getProjectStatus(projeto);
              const progress = getProgress(projeto);

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
                        {STATUS_LABELS[status]}
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
          <span className="t-label text-[var(--text-tertiary)]">Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="todos">Todos</option>
            <option value="pendente">Em aberto</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluido</option>
          </select>
        </label>

        <label className="block stack-sm">
          <span className="t-label text-[var(--text-tertiary)]">Ordenacao</span>
          <select value={sortValue} onChange={(event) => setSortValue(event.target.value)}>
            <option value="deadline:asc">Data combinada crescente</option>
            <option value="deadline:desc">Data combinada decrescente</option>
            <option value="name:asc">Nome A-Z</option>
            <option value="value:desc">Maior valor</option>
            <option value="updatedAt:desc">Atualizados</option>
          </select>
        </label>

        <AppButton
          variant="primary"
          fullWidth
          onClick={() => {
            setTypeFilter('todos');
            setStatusFilter('todos');
            setSortValue('deadline:asc');
            setIsFilterSheetOpen(false);
          }}
        >
          Limpar filtros
        </AppButton>
      </MobileFilterSheet>
    </div>
  );
}
