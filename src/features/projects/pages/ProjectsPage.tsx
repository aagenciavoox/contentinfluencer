import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Handshake, DollarSign, CalendarDays } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { EMPTY } from '../../../lib/uiCopy';
import { type Projeto } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
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

const FIELD_CLASS =
  'w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)]';

const GHOST_ACTION =
  'inline-flex items-center gap-1.5 rounded-[var(--radius-input)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]';

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
            <div className="border-b border-[var(--border-color)] px-6 py-4">
              <Text variant="sectionTitle">Novo projeto</Text>
            </div>
            <div className="flex-1 stack-lg overflow-y-auto p-6">
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
                <Text variant="label" className="mb-2 block opacity-60">Cor do projeto</Text>
                {colorPicker}
              </div>
            </div>
            <div className="flex gap-3 border-t border-[var(--border-color)] px-6 py-4 pb-safe">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-[var(--radius-md)] border border-[var(--border-color)] py-3 text-xs font-semibold text-[var(--text-secondary)]"
              >
                Cancelar
              </button>
              <AppButton
                variant="primary"
                onClick={handleCreate}
                disabled={!nome.trim()}
                className="flex-1"
              >
                Criar projeto
              </AppButton>
            </div>
          </div>
        </BottomSheetModal>
      </>
    );
  }

  return (
    <PageLayout
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
      <div className="desktop-toolbar-surface mb-6 p-4 md:p-6">
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
        <div className="surface-quiet mb-6 stack-lg p-6">
          <span className="eyebrow-label">Novo projeto</span>
          <input
            autoFocus
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Nome do projeto"
            className={cn(FIELD_CLASS, 'font-semibold')}
          />
          <div className="flex flex-wrap gap-3">
            <input
              value={value}
              onChange={e => setValue(e.target.value)}
              type="number"
              placeholder="Valor (R$)"
              className={cn(FIELD_CLASS, 'min-w-[120px] flex-1')}
            />
            <input
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="Marca"
              className={cn(FIELD_CLASS, 'min-w-[140px] flex-1')}
            />
          </div>
          <div className="stack-sm">
            <span className="eyebrow-label">Cor do projeto</span>
            {colorPicker}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={!nome.trim()}
              className="rounded-[var(--radius-input)] bg-[var(--text-primary)] px-6 py-2 text-xs font-semibold text-[var(--bg-primary)] transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              Criar
            </button>
            <button onClick={handleClose} className={GHOST_ACTION}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {projetos.length === 0 ? (
        <div className="stack-lg py-24 text-center">
          <Handshake className="mx-auto h-12 w-12 opacity-10" />
          <Text variant="bodyStrong" className="text-[var(--text-tertiary)]">{EMPTY.projetos.title}</Text>
          <Text variant="meta" className="mx-auto mt-2 max-w-sm">{EMPTY.projetos.description}</Text>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-[var(--radius-input)] bg-[var(--text-primary)] px-6 py-2.5 text-xs font-semibold text-[var(--bg-primary)] transition-opacity hover:opacity-90"
          >
            Criar projeto
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <span className="eyebrow-label">
              {projetos.length} {projetos.length === 1 ? 'projeto' : 'projetos'}
            </span>
          </div>
          <div className="grid-content">
            {projetos.map(projeto => {
              const eventoCount = state.agendaItems.filter(a => a.projetoId === projeto.id).length;
              return (
                <Surface
                  key={projeto.id}
                  variant="interactive"
                  padding="md"
                  onClick={() => navigate(`/projetos/${projeto.id}`)}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: projeto.color || '#78716c' }}
                    />
                    <div className="min-w-0 flex-1">
                      <Text variant="itemTitle" className="line-clamp-2">{projeto.nome}</Text>
                      {projeto.brand ? (
                        <Text variant="meta" className="mt-0.5 block truncate">{projeto.brand}</Text>
                      ) : null}
                    </div>
                    {projeto.status ? (
                      <Badge variant="neutral" className="shrink-0">{projeto.status}</Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-[1.375rem]">
                    {projeto.value ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
                        <DollarSign className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                        {projeto.value.toLocaleString('pt-BR', { style: 'currency', currency: projeto.currency || 'BRL' })}
                      </span>
                    ) : null}
                    {eventoCount > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {eventoCount} evento{eventoCount !== 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </div>
                </Surface>
              );
            })}
          </div>
        </>
      )}
    </PageLayout>
  );
}
