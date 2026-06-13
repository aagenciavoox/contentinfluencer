import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Handshake, ChevronRight, DollarSign } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { type Projeto } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { AppButton } from '../../../components/ui/AppButton';
import { FilterBar } from '../../../components/ui/FilterBar';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { ProjectsMobileScreen } from '../../../mobile/screens/projects/ProjectsMobileScreen';
import { generateUUID } from '../../../utils/uuid';

type StatusFilter = 'todos' | 'com_eventos' | 'sem_eventos';

const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#f43f5e', '#78716c',
];

export function ProjectsPage() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortValue, setSortValue] = useState('updatedAt:desc');
  const [showForm, setShowForm] = useState(false);

  const [nome, setNome] = useState('');
  const [brand, setBrand] = useState('');
  const [value, setValue] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);

  const projetosComEventos = new Set(state.agendaItems.map(a => a.projetoId).filter(Boolean));

  const projetos = state.projetos
    .filter(p => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      if (statusFilter === 'com_eventos' && !projetosComEventos.has(p.id)) return false;
      if (statusFilter === 'sem_eventos' && projetosComEventos.has(p.id)) return false;
      if (normalizedSearch) {
        const haystack = [p.nome, p.brand || '', p.notes || ''].join(' ').toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortValue === 'name:asc') return a.nome.localeCompare(b.nome);
      if (sortValue === 'value:desc') return (b.value || 0) - (a.value || 0);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const resetForm = () => {
    setNome('');
    setBrand('');
    setValue('');
    setColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
  };

  const handleCreate = () => {
    if (!nome.trim()) return;
    const projeto: Projeto = {
      id: generateUUID(),
      userId: user?.id || '',
      nome: nome.trim(),
      tipo: 'publi',
      status: 'pendente',
      dataInicio: null,
      dataFim: null,
      metaConteudos: null,
      bibliotecaItemId: null,
      brand: brand.trim() || null,
      brandColor: null,
      color,
      value: value ? parseFloat(value) : null,
      currency: 'BRL',
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      etapas: [],
      contentIds: [],
    };
    dispatch({ type: 'ADD_PROJETO', payload: projeto });
    resetForm();
    setShowForm(false);
  };

  const handleClose = () => { resetForm(); setShowForm(false); };

  const colorPicker = (
    <div className="flex flex-wrap gap-2">
      {PROJECT_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => setColor(c)}
          className={cn('h-7 w-7 rounded-full border-2 transition-all', color === c ? 'border-[var(--text-primary)] scale-110' : 'border-transparent opacity-50 hover:opacity-80')}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <ProjectsMobileScreen
            projetos={state.projetos}
            onOpenProject={(projectId) => navigate(`/projetos/${projectId}`)}
            onCreateProject={() => setShowForm(true)}
          />
        </div>

        <BottomSheetModal open={showForm} onClose={handleClose} desktopMaxW="max-w-xl" zIndex="z-[110]">
          <div className="flex h-full flex-col bg-[var(--bg-primary)]">
            <div className="border-b border-[var(--border-color)] px-5 py-4">
              <p className="t-section-title text-[var(--text-primary)]">Novo projeto</p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <input
                autoFocus
                value={nome}
                onChange={e => setNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Nome do projeto"
                className="w-full"
              />
              <input
                value={value}
                onChange={e => setValue(e.target.value)}
                type="number"
                placeholder="Valor (R$)"
                className="w-full"
              />
              <input
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="Marca"
                className="w-full"
              />
              <div>
                <p className="mb-2 text-xs font-semibold text-[var(--text-tertiary)] opacity-60">Cor do projeto</p>
                {colorPicker}
              </div>
            </div>
            <div className="flex gap-3 border-t border-[var(--border-color)] px-5 py-4 pb-safe">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-[1.25rem] border border-[var(--border-color)] py-3 text-xs font-semibold text-[var(--text-secondary)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!nome.trim()}
                className="button-primary flex-1 disabled:opacity-40"
              >
                Criar projeto
              </button>
            </div>
          </div>
        </BottomSheetModal>
      </>
    );
  }

  return (
    <PageLayout
      variant="settings"
      header={
        <DesktopPageHeader
          section="Gestão"
          title="Projetos"
          icon={Handshake}
          className="mb-0"
          actions={(
            <AppButton
              onClick={() => setShowForm(true)}
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              className="shrink-0"
            >
              Novo projeto
            </AppButton>
          )}
        />
      }
    >
      <div className="desktop-toolbar-surface mb-6 p-4 md:p-5">
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar projeto ou marca"
          filters={[
            {
              id: 'status',
              label: 'Status',
              value: statusFilter,
              options: [
                { label: 'Todos', value: 'todos' },
                { label: 'Com eventos', value: 'com_eventos' },
                { label: 'Sem eventos', value: 'sem_eventos' },
              ],
              onChange: value => setStatusFilter(value as StatusFilter),
            },
          ]}
          sortValue={sortValue}
          sortOptions={[
            { label: 'Atualizados', value: 'updatedAt:desc' },
            { label: 'Nome A-Z', value: 'name:asc' },
            { label: 'Maior valor', value: 'value:desc' },
          ]}
          onSortChange={setSortValue}
        />
      </div>

      {/* Form novo projeto */}
      {showForm && (
        <div className="mb-6 space-y-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-6">
          <p className="text-xs font-semibold text-[var(--text-tertiary)]">Novo Projeto</p>
          <input
            autoFocus
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Nome do projeto"
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none focus:border-[var(--text-primary)]/40"
          />
          <div className="flex flex-wrap gap-3">
            <input
              value={value}
              onChange={e => setValue(e.target.value)}
              type="number"
              placeholder="Valor (R$)"
              className="flex-1 min-w-[120px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
            />
            <input
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="Marca"
              className="flex-1 min-w-[140px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold opacity-40">Cor do projeto</p>
            {colorPicker}
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleCreate}
              disabled={!nome.trim()}
              className="rounded-xl bg-[var(--text-primary)] px-6 py-2.5 text-xs font-semibold text-[var(--bg-primary)] hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              Criar
            </button>
            <button
              onClick={handleClose}
              className="rounded-xl border border-[var(--border-color)] px-6 py-2.5 text-xs font-semibold opacity-50 hover:opacity-80 transition-opacity"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {projetos.length === 0 ? (
        <div className="space-y-4 py-24 text-center">
          <Handshake className="mx-auto h-12 w-12 opacity-10" />
          <p className="text-sm font-semibold opacity-30">Nenhum projeto ainda</p>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-[var(--radius-card)] bg-[var(--text-primary)] px-6 py-3 text-xs font-semibold text-[var(--bg-primary)] hover:opacity-90 transition-opacity"
          >
            Criar projeto
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {projetos.map(projeto => {
            const eventoCount = state.agendaItems.filter(a => a.projetoId === projeto.id).length;
            return (
              <button
                key={projeto.id}
                onClick={() => navigate(`/projetos/${projeto.id}`)}
                className="group flex w-full items-center gap-5 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-6 py-5 text-left transition-all hover:border-[var(--text-primary)]/30 hover:shadow-sm"
              >
                <div className="h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: projeto.color || '#78716c' }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{projeto.nome}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    {projeto.brand && (
                      <span className="text-xs font-semibold text-[var(--text-secondary)] opacity-60">
                        {projeto.brand}
                      </span>
                    )}
                    {projeto.value ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-[var(--text-secondary)] opacity-50">
                        <DollarSign className="h-3 w-3" />
                        {projeto.value.toLocaleString('pt-BR', { style: 'currency', currency: projeto.currency || 'BRL' })}
                      </span>
                    ) : null}
                    {eventoCount > 0 ? (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {eventoCount} evento{eventoCount !== 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-20 transition-opacity group-hover:opacity-50" />
              </button>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
