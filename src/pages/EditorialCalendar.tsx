import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Calendar as CalendarIcon,
  RotateCcw,
  Zap,
  BookOpen,
  Clock,
  Briefcase,
  LayoutDashboard,
  ChevronRight,
  ChevronLeft,
  Plus,
  AlertCircle,
  X,
  Edit3,
  ExternalLink,
  Tag,
  CalendarDays,
  Users,
  Video,
  Send,
  Star,
  Link2,
  PenTool,
  CheckCircle,
  CheckCircle2,
  BarChart2,
  Trash2,
  Archive,
  Settings,
  Info,
} from 'lucide-react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay,
  isSameMonth, isToday as dateFnsIsToday,
  parseISO, eachDayOfInterval as eachDay,
  isWithinInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, getEventDates } from '../lib/utils';
import { Content, Partnership, AgendaItem } from '../types';
import { PARTNERSHIP_STAGES, STATUS_CONFIG } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { CalendarAgendaView } from '../components/calendar/CalendarAgendaView';
import { ContentQuickPreview } from '../components/calendar/ContentQuickPreview';
import { CalendarLayerToggle } from '../components/calendar/CalendarLayerToggle';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { BottomSheetModal } from '../components/BottomSheetModal';
import { PartnershipForm } from '../components/partnerships/PartnershipForm';
import { PageGuide } from '../components/PageGuide';
import { useIsMobile } from '../hooks/useIsMobile';
import { useScrollDirection } from '../hooks/useScrollDirection';

type MainTab = 'agenda' | 'cronograma' | 'projetos' | 'visao-geral';

// Helper para pegar o componente do ícone pelo nome
export const getStatusIcon = (name: string) => {
  const icons: Record<string, React.ElementType> = {
    BookOpen,
    PenTool,
    Send,
    Video,
    Edit3,
    CheckCircle,
    ExternalLink,
    BarChart2,
  };
  return icons[name] || Star;
};



export function EditorialCalendar() {
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState<MainTab>('agenda');
  const isMobile = useIsMobile();
  const scrollDirection = useScrollDirection();

  // ── Agenda state ──
  const [selectedItem, setSelectedItem] = useState<Content | Partnership | AgendaItem | null>(null);
  const [activeLayers, setActiveLayers] = useState<string[]>(['recordings', 'posts', 'partnerships', 'agenda', 'rules']);
  const [isFullEditOpen, setIsFullEditOpen] = useState(false);
  const [isAddAgendaOpen, setIsAddAgendaOpen] = useState(false);

  // ── Projetos state ──
  const [selectedProject, setSelectedProject] = useState<Partnership | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [previewProject, setPreviewProject] = useState<Partnership | null>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [formTab, setFormTab] = useState<'config' | 'agenda'>('agenda');
  const [editingBrand, setEditingBrand] = useState<{ name: string; color: string; description?: string } | null>(null);

  const openProjectEdit = (brandName: string) => {
    const firstProject = state.partnerships.find(p => p.brand === brandName);
    if (firstProject) {
      setSelectedProject(firstProject);
      setFormTab('config');
      setIsFormOpen(true);
    }
  };


  // ── Agenda handlers ──
  const handleItemClick = (item: any) => {
    if ('brand' in item) {
      openProjectModal(item as Partnership);
    } else {
      setSelectedItem(item);
    }
  };

  const handleMove = (newDate: string) => {
    if (!selectedItem || !newDate) return;
    if ('status' in selectedItem && 'pillar' in selectedItem) {
      const isPost = !!(selectedItem as Content).publishDate;
      dispatch({ type: 'UPDATE_CONTENT', payload: { ...selectedItem, [isPost ? 'publishDate' : 'recordingDate']: newDate } });
    } else if ('brand' in selectedItem) {
      dispatch({ type: 'UPDATE_PARTNERSHIP', payload: { ...selectedItem, publishDate: newDate, deadline: newDate } });
    } else if ('external' in selectedItem) {
      dispatch({ type: 'UPDATE_AGENDA', payload: { ...selectedItem, date: newDate } });
    }
    setSelectedItem(null);
  };

  const activeProjects = useMemo(() => 
    state.partnerships.filter(p => !p.archived && p.status !== 'Finalizado'), 
    [state.partnerships]
  );

  const closedProjects = useMemo(() => 
    state.partnerships.filter(p => !p.archived && p.status === 'Finalizado'),
    [state.partnerships]
  );

  const archivedProjects = useMemo(() => 
    state.partnerships.filter(p => p.archived),
    [state.partnerships]
  );

  // ── Projetos handlers ──
  const handleAddProject = (prefillBrand?: string, prefillColor?: string) => {
    if (prefillBrand) {
      const existing = state.partnerships.find(p => p.brand === prefillBrand);
      if (existing) {
        setSelectedProject(existing);
        setFormTab('agenda');
        setIsFormOpen(true);
        return;
      }
    }

    setSelectedProject({
      id: Math.random().toString(36).substr(2, 9),
      brand: prefillBrand || '',
      brandColor: prefillColor || '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      title: '',
      status: PARTNERSHIP_STAGES[0],
      createdAt: new Date().toISOString(),
    } as Partnership);
    setFormTab('agenda');
    setIsFormOpen(true);
  };

  const saveProject = (project: Partnership) => {
    let finalProject = { ...project };
    if (finalProject.status === 'Roteiro') {
      if (!finalProject.contentId) {
        const newContentId = Math.random().toString(36).substr(2, 9);
        dispatch({
          type: 'ADD_CONTENT', payload: {
            id: newContentId,
            title: `[PUB ${finalProject.brand}] ${finalProject.title}`,
            seriesId: 'none',
            pillar: 'pilar-indicacao',
            format: 'Reels',
            status: 'Pronto para Gravar',
            script: finalProject.script || '',
            notes: finalProject.notes || '',
            createdAt: new Date().toISOString(),
          } as any
        });
        finalProject.contentId = newContentId;
      } else {
        const existing = state.contents.find(c => c.id === finalProject.contentId);
        if (existing && existing.script !== finalProject.script) {
          dispatch({ type: 'UPDATE_CONTENT', payload: { ...existing, script: finalProject.script, notes: finalProject.notes } });
        }
      }
    }
    const exists = state.partnerships.find(p => p.id === finalProject.id);
    dispatch({ type: exists ? 'UPDATE_PARTNERSHIP' : 'ADD_PARTNERSHIP', payload: finalProject });
    setIsFormOpen(false);
    setPreviewProject(null);
  };

  const openProjectModal = (p: Partnership) => {
    let proj = { ...p };
    if (proj.contentId) {
      const linked = state.contents.find(c => c.id === proj.contentId);
      if (linked) proj.script = linked.script;
    }
    setPreviewProject(proj);
  };

  const openEditFromPreview = () => {
    if (!previewProject) return;
    setSelectedProject(previewProject);
    setPreviewProject(null);
    setFormTab('agenda');
    setIsFormOpen(true);
  };

  const tabs: { id: MainTab; label: string; icon: React.ElementType }[] = [
    { id: 'agenda', label: 'Agenda', icon: CalendarIcon },
    { id: 'cronograma', label: 'Cronograma', icon: Clock },
    { id: 'projetos', label: 'Projetos', icon: Briefcase },
    { id: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-full flex flex-col bg-[var(--bg-primary)] transition-colors duration-200">

      {/* ── HEADER FIXO ── */}
      <header className="px-5 md:px-10 py-5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] sticky top-0 z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-5">
          <div className="p-2.5 bg-[var(--text-primary)]/10 rounded-2xl">
            <CalendarIcon className="w-5 h-5 text-[var(--text-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Calendário</h1>
            <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-[0.25em] font-black italic">
              {activeTab === 'agenda' && 'Agenda Editorial'}
              {activeTab === 'cronograma' && 'Cronograma de Projetos'}
              {activeTab === 'projetos' && 'Diretório de Marcas'}
              {activeTab === 'visao-geral' && 'Kanban de Parcerias'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-[var(--bg-hover)] p-1 rounded-xl">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all',
                  activeTab === t.id
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] italic hover:bg-[var(--bg-primary)]/50'
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {activeTab === 'agenda' && (
            <button
              onClick={() => setIsAddAgendaOpen(true)}
              className="flex items-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md hover-action"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Evento
            </button>
          )}

          {activeTab !== 'agenda' && (
            <button
              onClick={() => handleAddProject()}
              className="flex items-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md hover-action"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Projeto
            </button>
          )}
        </div>
      </header>

      {/* ── CONTEÚDO DAS ABAS ── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ABA: AGENDA */}
          {activeTab === 'agenda' && (
            <motion.div
              key="agenda"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto custom-scrollbar"
            >
              <div className="max-w-[1600px] mx-auto py-8 px-5 md:px-10 space-y-8">
                <PageGuide
                  pageId="calendar"
                  title="Calendário de Comando"
                  description="Visão integrada do ecossistema. Controle camadas e valide regras de ouro."
                  icon={CalendarIcon}
                />

                <div className="flex flex-wrap gap-3">
                  {[
                    { label: 'Rotação', text: 'Max 1x/Sem', icon: RotateCcw, color: 'text-orange-500' },
                    { label: 'Energia', text: 'Mix Ideal', icon: Zap, color: 'text-blue-500' },
                    { label: 'Temas', text: 'Mix Pilares', icon: BookOpen, color: 'text-purple-500' },
                  ].map(rule => (
                    <div key={rule.label} className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-sm">
                      <rule.icon className={cn('w-4 h-4 shrink-0', rule.color)} />
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] block">{rule.label}</span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">{rule.text}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                  <div className="lg:col-span-1 lg:sticky lg:top-6">
                    <CalendarLayerToggle activeLayers={activeLayers} onChange={setActiveLayers} />
                  </div>
                  <div className="lg:col-span-3">
                    {isMobile ? (
                      <CalendarAgendaView 
                        contents={state.contents}
                        partnerships={state.partnerships}
                        externalEvents={state.agenda}
                        activeLayers={activeLayers}
                        onSelectContent={handleItemClick}
                      />
                    ) : (
                      <CalendarGrid activeLayers={activeLayers} onItemClick={handleItemClick} />
                    )}
                  </div>
                </div>
              </div>

              {selectedItem && !isFullEditOpen && (
                <ContentQuickPreview
                  item={selectedItem}
                  onClose={() => setSelectedItem(null)}
                  onEdit={() => {
                    if (selectedItem && 'brand' in selectedItem) {
                      setSelectedProject(selectedItem as Partnership);
                      setSelectedItem(null);
                      setIsFormOpen(true);
                    } else {
                      setIsFullEditOpen(true);
                    }
                  }}
                  onMove={handleMove}
                />
              )}

              {isFullEditOpen && selectedItem && (
                <ContentDetailModal
                  content={selectedItem as Content}
                  onClose={() => { setIsFullEditOpen(false); setSelectedItem(null); }}
                />
              )}
            </motion.div>
          )}

          {/* ABA: CRONOGRAMA */}
          {activeTab === 'cronograma' && (
            <motion.div
              key="cronograma"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto custom-scrollbar"
            >
              <TimelineView projects={activeProjects} onSelect={openProjectModal} />
            </motion.div>
          )}

          {/* ABA: PROJETOS */}
          {activeTab === 'projetos' && (
            <motion.div
              key="projetos"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto custom-scrollbar"
            >
              <ProjectsView
                projects={state.partnerships} // Here we keep all to allow viewing archived via filter (will add later if needed)
                contents={state.contents}
                agenda={state.agenda}
                onSelect={openProjectModal}
                onAddEvent={handleAddProject}
                onEditProject={openProjectEdit}
              />
            </motion.div>
          )}

          {/* ABA: VISÃO GERAL */}
          {activeTab === 'visao-geral' && (
            <motion.div
              key="visao-geral"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-x-auto overflow-y-hidden"
            >
              <DashboardOverview projects={activeProjects} onSelect={openProjectModal} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Modal de Visualização do Evento ── */}
      <AnimatePresence>
        {previewProject && (
          <EventPreviewModal
            project={previewProject}
            allProjects={activeProjects}
            allContents={state.contents}
            allAgenda={state.agenda}
            onClose={() => setPreviewProject(null)}
            onEdit={openEditFromPreview}
            onDelete={(id) => {
              dispatch({ type: 'DELETE_PARTNERSHIP', payload: id });
              // Remove agenda vinculada ao EVENTO
              state.agenda
                .filter(a => a.partnershipId === id)
                .forEach(a => dispatch({ type: 'DELETE_AGENDA', payload: a.id }));
              setPreviewProject(null);
            }}
            onArchive={(p) => {
              dispatch({ type: 'UPDATE_PARTNERSHIP', payload: p });
              setPreviewProject(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Modal Adicionar Evento Agenda ── */}
      <AnimatePresence>
        {isAddAgendaOpen && (
          <AddAgendaModal
            projects={state.partnerships}
            onSave={(item) => {
              dispatch({ type: 'ADD_AGENDA', payload: item });
              setIsAddAgendaOpen(false);
            }}
            onClose={() => setIsAddAgendaOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal de Formulário de Parceria (edição completa) */}
      <BottomSheetModal open={isFormOpen} onClose={() => setIsFormOpen(false)} desktopMaxW="max-w-2xl">
        {selectedProject && (
          <PartnershipForm
            initialData={selectedProject}
            initialTab={formTab}
            onSave={saveProject}
            onClose={() => setIsFormOpen(false)}
            onDelete={(id) => { 
              dispatch({ type: 'DELETE_PARTNERSHIP', payload: id }); 
              // Também remove eventos da agenda vinculados
              state.agenda
                .filter(a => a.partnershipId === id)
                .forEach(a => dispatch({ type: 'DELETE_AGENDA', payload: a.id }));
              setIsFormOpen(false); 
            }}
          />
        )}
      </BottomSheetModal>

    </div>
  );
}

// ── MODAL ADICIONAR EVENTO NA AGENDA ─────────────────────────────────────────
function AddAgendaModal({
  projects,
  onSave,
  onClose,
}: {
  projects: Partnership[];
  onSave: (item: AgendaItem) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<AgendaItem['type']>('Reunião');
  const [external, setExternal] = useState(false);
  const [linkedProjectId, setLinkedProjectId] = useState<string>('');

  const handleSave = () => {
    if (!title.trim() || !date) return;
    const item: AgendaItem = {
      id: Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      date,
      type,
      external,
      partnershipId: linkedProjectId || undefined,
      brandColor: selectedProject?.brandColor,
    };
    onSave(item);
  };

  const selectedProject = projects.find(p => p.id === linkedProjectId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-6 pb-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)]">
          <div>
            <h2 className="text-base font-black text-[var(--text-primary)]">Novo Evento</h2>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[var(--text-tertiary)] mt-0.5">Agenda Editorial</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-all">
            <X className="w-5 h-5 text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-5">
          {/* Título */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">Título do Evento</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Reunião com cliente, Live..."
              className="w-full text-sm bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)] placeholder:font-normal placeholder:opacity-30"
            />
          </div>

          {/* Data */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">Data</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full text-sm bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)]"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Reunião', 'Entrega', 'Publicação'] as AgendaItem['type'][]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                    type === t
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                      : 'border-[var(--border-color)] text-[var(--text-tertiary)] hover:border-[var(--text-primary)]'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Vínculo com Projeto */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60 flex items-center gap-1.5">
                <Link2 className="w-3 h-3" />
                Vincular a Projeto (opcional)
              </label>
              <select
                value={linkedProjectId}
                onChange={e => setLinkedProjectId(e.target.value)}
                className="w-full text-xs bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)] cursor-pointer"
              >
                <option value="">— Sem vínculo —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.brand} · {p.title || 'Sem título'}
                  </option>
                ))}
              </select>
              {selectedProject && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-color)]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedProject.brandColor }} />
                  <span className="text-[9px] font-bold text-[var(--text-primary)] opacity-60 uppercase tracking-widest">{selectedProject.brand}</span>
                </div>
              )}
            </div>
          )}

          {/* Compromisso Externo */}
          <button
            onClick={() => setExternal(prev => !prev)}
            className={cn(
              'w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl border text-left transition-all',
              external
                ? 'border-purple-400 bg-purple-500/5'
                : 'border-[var(--border-color)] hover:border-[var(--text-primary)]'
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all',
              external ? 'border-purple-400 bg-purple-400' : 'border-[var(--border-color)]'
            )}>
              {external && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] block">Compromisso Externo</span>
              <span className="text-[9px] text-[var(--text-tertiary)] opacity-60">Aparece destacado como evento fora da rotina</span>
            </div>
            <Users className={cn('w-4 h-4 ml-auto', external ? 'text-purple-400' : 'text-[var(--text-tertiary)] opacity-30')} />
          </button>
        </div>

        {/* Footer */}
        <div className="px-7 pb-6">
          <button
            onClick={handleSave}
            disabled={!title.trim() || !date}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg disabled:opacity-30 disabled:pointer-events-none"
          >
            <Plus className="w-4 h-4" />
            Adicionar Evento
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── MINI CALENDÁRIO (usado no EventPreviewModal) ──────────────────────────────
function MiniCalendar({
  project,
  allProjects,
  allContents,
  allAgenda,
}: {
  project: Partnership;
  allProjects: Partnership[];
  allContents: any[];
  allAgenda: any[];
}) {
  const [currentDate, setCurrentDate] = useState(
    project.startDate ? parseISO(project.startDate) :
    project.deadline ? parseISO(project.deadline) : new Date()
  );

  const eventDates = new Set(getEventDates(project));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Todos os itens por data (para mostrar ocupação e status)
  const occupiedDates = useMemo(() => {
    const map: Record<string, { count: number; statuses: string[] }> = {};
    
    // Itens deste projeto 
    getEventDates(project).forEach(d => {
      if (!map[d]) map[d] = { count: 0, statuses: [] };
      map[d].statuses.push(project.status);
    });

    allContents.forEach(c => {
      if (c.publishDate) {
        if (!map[c.publishDate]) map[c.publishDate] = { count: 0, statuses: [] };
        map[c.publishDate].count++;
      }
      if (c.recordingDate) {
        if (!map[c.recordingDate]) map[c.recordingDate] = { count: 0, statuses: [] };
        map[c.recordingDate].count++;
      }
    });
    allAgenda.forEach(a => { 
      if (!map[a.date]) map[a.date] = { count: 0, statuses: [] };
      map[a.date].count++; 
    });
    
    allProjects.filter(p => p.id !== project.id).forEach(p => {
      getEventDates(p).forEach(d => { 
        if (!map[d]) map[d] = { count: 0, statuses: [] };
        map[d].count++;
      });
    });
    return map;
  }, [allContents, allAgenda, allProjects, project]);

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2rem] overflow-hidden shadow-inner">

      {/* Nav */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)]">
        <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-all">
          <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        </button>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">
          {format(currentDate, 'MMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-all">
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 border-b border-[var(--border-color)]">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} className="py-1.5 text-center text-[8px] font-black uppercase text-[var(--text-tertiary)] opacity-40">{d}</div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isThisMonth = isSameMonth(day, monthStart);
          const isEventDay = eventDates.has(dateStr);
          const isStart = dateStr === project.startDate || (dateStr === project.deadline && !project.startDate);
          const isEnd = dateStr === project.deadline;
          const data = occupiedDates[dateStr] || { count: 0, statuses: [] };
          const occupied = data.count;
          const currentStatus = data.statuses[0];
          const statusStyle = currentStatus ? STATUS_CONFIG[currentStatus] : null;
          
          const isToday = dateFnsIsToday(day);
          // Posição 0 = Dom, 6 = Sáb (quebra de semana)
          const colPos = idx % 7;
          const isFirstCol = colPos === 0;
          const isLastCol = colPos === 6;

          // A faixa arredonda na borda esquerda se for o início do range OU o primeiro dia da semana
          const roundLeft = isStart || isFirstCol;
          // A faixa arredonda na borda direita se for o fim do range OU o último dia da semana
          const roundRight = isEnd || isLastCol;

          return (
            <div
              key={dateStr}
              className={cn(
                'h-11 flex flex-col items-center justify-center relative',
                !isThisMonth && 'opacity-20',
              )}
            >
              {/* Faixa contínua colorida do range */}
              {isEventDay && (
                <div
                  className={cn(
                    'absolute top-1 bottom-1 left-0 right-0',
                    roundLeft  && roundRight  && 'rounded-full mx-1',
                    roundLeft  && !roundRight && 'rounded-l-full ml-1',
                    !roundLeft && roundRight  && 'rounded-r-full mr-1',
                    // meio da semana: sem arredondamento
                  )}
                  style={{ backgroundColor: statusStyle ? `${statusStyle.color}20` : `${project.brandColor}28` }}
                />
              )}

              {/* Número do dia */}
              <span
                className={cn(
                  'relative z-10 w-6 h-6 flex items-center justify-center rounded-full text-[10px] leading-none font-bold',
                  // Início/Fim: círculo sólido na cor do projeto
                  isEventDay && (isStart || isEnd) && 'text-white font-black',
                  // Meio do range: número colorido
                  isEventDay && !isStart && !isEnd && 'font-black',
                  // Hoje (fora do range): ring outline
                  isToday && !isEventDay && 'ring-1 ring-[var(--text-primary)] text-[var(--text-primary)] font-black',
                  // Dias normais
                  !isEventDay && !isToday && 'text-[var(--text-tertiary)]',
                )}
                style={
                  isEventDay && (isStart || isEnd)
                    ? { backgroundColor: statusStyle ? statusStyle.color : project.brandColor }
                    : isEventDay
                    ? { color: statusStyle ? statusStyle.color : project.brandColor }
                    : {}
                }
              >
                {format(day, 'd')}
              </span>

              {/* Bolinhas cinzas: outros eventos no dia (fora do range deste projeto) */}
              {occupied > 0 && isThisMonth && !isEventDay && (
                <div className="absolute bottom-0.5 flex gap-0.5 z-20">
                  {Array.from({ length: Math.min(occupied, 3) }).map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-[var(--text-tertiary)] opacity-35" />
                  ))}
                </div>
              )}
              {/* Bolinhas na cor do projeto/status: outros eventos em dias do range */}
              {occupied > 0 && isThisMonth && isEventDay && !isStart && !isEnd && (
                <div className="absolute bottom-0.5 flex gap-0.5 z-20">
                  {Array.from({ length: Math.min(occupied, 3) }).map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full opacity-50"
                      style={{ backgroundColor: statusStyle ? statusStyle.color : project.brandColor }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MODAL DE VISUALIZAÇÃO DO EVENTO ──────────────────────────────────────────
function EventPreviewModal({
  project,
  onClose,
  onEdit,
  onDelete,
  onArchive,
}: {
  project: Partnership;
  allProjects: Partnership[];
  allContents: any[];
  allAgenda: any[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onArchive: (p: Partnership) => void;
}) {
  const eventDates = getEventDates(project);
  const durationDays = eventDates.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: project.brandColor }} />

        <div className="p-8 space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] opacity-60 block mb-2">
                {project.brand}
              </span>
              <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight leading-tight">
                {project.title}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-all shrink-0">
              <X className="w-5 h-5 text-[var(--text-tertiary)]" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">Fase</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.brandColor }} />
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">{project.status}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">Duração</span>
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">{durationDays} {durationDays === 1 ? 'dia' : 'dias'}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">Período</span>
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)]">
              <CalendarDays className="w-4 h-4 opacity-30" />
              <span>
                {project.startDate && project.deadline && project.startDate !== project.deadline
                  ? `${format(parseISO(project.startDate + 'T12:00:00'), "dd MMM", { locale: ptBR })} → ${format(parseISO(project.deadline + 'T12:00:00'), "dd MMM yyyy", { locale: ptBR })}`
                  : project.deadline
                  ? format(parseISO(project.deadline + 'T12:00:00'), "dd 'de' MMM 'de' yyyy", { locale: ptBR })
                  : '—'
                }
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={onEdit}
              className="w-full flex items-center justify-center gap-2.5 py-4 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-md"
            >
              <Edit3 className="w-4 h-4" />
              Editar Evento
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onArchive({ ...project, archived: !project.archived })}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--border-color)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] transition-all"
              >
                <Archive className="w-3.5 h-3.5" />
                {project.archived ? 'Desarquivar' : 'Arquivar'}
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Excluir este projeto permanentemente?')) {
                    onDelete(project.id);
                    onClose();
                  }
                }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/10 text-red-500 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── CRONOGRAMA ──────────────────────────────────────────────────────────────
function TimelineView({ projects, onSelect }: { projects: Partnership[]; onSelect: (p: Partnership) => void }) {
  const sorted = [...projects]
    .filter(p => p.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

  if (sorted.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 opacity-25 gap-4">
      <Clock className="w-12 h-12" />
      <p className="text-xs font-black uppercase tracking-[0.3em] italic">Nenhum projeto com prazo definido</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--text-tertiary)] mb-10 text-center italic">
        Ordenado por prazo
      </p>
      <div className="relative border-l-2 border-[var(--border-color)] ml-4 pl-8 space-y-4">
        {sorted.map(project => {
          const eventDates = getEventDates(project);
          const duration = eventDates.length;
          return (
            <button
              key={project.id}
              onClick={() => onSelect(project)}
              className="w-full text-left bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 hover:bg-[var(--bg-hover)] transition-all relative group shadow-sm"
            >
              <div
                className="absolute left-[-41px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-[var(--bg-primary)] shadow-sm"
                style={{ backgroundColor: project.brandColor }}
              />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">{project.brand}</span>
                  <h3 className="text-sm font-black text-[var(--text-primary)] mt-1">{project.title || 'Sem título'}</h3>
                  {duration > 1 && (
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-50">{duration} dias</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-black text-[var(--text-primary)] px-3 py-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] uppercase tracking-widest">
                    {project.status}
                  </span>
                  <span className="text-xs font-black text-[var(--text-tertiary)] whitespace-nowrap">
                    {format(new Date(project.deadline + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })}
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-40 transition-opacity" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── MINI CALENDÁRIO POR MARCA (Usado nos cards da aba Projetos) ───────────────
function BrandMiniCalendar({
  brand,
  brandColor,
  brandProjects,
  allProjects,
  allContents,
  allAgenda,
}: {
  brand: string;
  brandColor: string;
  brandProjects: Partnership[];
  allProjects: Partnership[];
  allContents: any[];
  allAgenda: any[];
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Todas as datas que têm evento DESTA marca
  const eventDates = new Set(brandProjects.flatMap(p => getEventDates(p)));
  // Inícios e fins reais (para arredondar bordas)
  const startDates = new Set(brandProjects.map(p => p.startDate || p.deadline).filter(Boolean));
  const endDates = new Set(brandProjects.map(p => p.deadline).filter(Boolean));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Ocupação e status por data
  const occupiedDates = useMemo(() => {
    const map: Record<string, { count: number; statuses: string[] }> = {};
    
    // Itens desta marca
    brandProjects.forEach(p => {
      getEventDates(p).forEach(d => {
        if (!map[d]) map[d] = { count: 0, statuses: [] };
        map[d].statuses.push(p.status);
      });
    });

    allContents.forEach(c => {
      if (c.publishDate) {
        if (!map[c.publishDate]) map[c.publishDate] = { count: 0, statuses: [] };
        map[c.publishDate].count++;
      }
      if (c.recordingDate) {
        if (!map[c.recordingDate]) map[c.recordingDate] = { count: 0, statuses: [] };
        map[c.recordingDate].count++;
      }
    });
    allAgenda.forEach(a => { 
      if (!map[a.date]) map[a.date] = { count: 0, statuses: [] };
      map[a.date].count++; 
    });
    allProjects.filter(p => p.brand !== brand).forEach(p => {
      getEventDates(p).forEach(d => { 
        if (!map[d]) map[d] = { count: 0, statuses: [] };
        map[d].count++; 
      });
    });
    return map;
  }, [allContents, allAgenda, allProjects, brand, brandProjects]);

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[1.5rem] overflow-hidden mt-4 shadow-inner">

      {/* Nav */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-color)]">
        <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-all">
          <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        </button>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">
          {format(currentDate, 'MMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-all">
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 border-b border-[var(--border-color)]">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} className="py-1.5 text-center text-[7px] font-black uppercase text-[var(--text-tertiary)] opacity-40">{d}</div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isThisMonth = isSameMonth(day, monthStart);
          const isEventDay = eventDates.has(dateStr);
          const isStart = startDates.has(dateStr);
          const isEnd = endDates.has(dateStr);
          const data = occupiedDates[dateStr] || { count: 0, statuses: [] };
          const occupied = data.count;
          // Se for evento da marca, pega o status do primeiro projeto ativo no dia
          const currentStatus = data.statuses[0];
          const statusStyle = currentStatus ? STATUS_CONFIG[currentStatus] : null;

          const isToday = dateFnsIsToday(day);
          
          const colPos = idx % 7;
          const isFirstCol = colPos === 0;
          const isLastCol = colPos === 6;

          const roundLeft = isStart || isFirstCol;
          const roundRight = isEnd || isLastCol;

          return (
            <div
              key={dateStr}
              className={cn(
                'h-9 flex flex-col items-center justify-center relative',
                !isThisMonth && 'opacity-20',
              )}
            >
              {/* Faixa contínua do range */}
              {isEventDay && (
                <div
                  className={cn(
                    'absolute top-1 bottom-1 left-0 right-0',
                    roundLeft && roundRight && 'rounded-full mx-1',
                    roundLeft && !roundRight && 'rounded-l-full ml-1',
                    !roundLeft && roundRight && 'rounded-r-full mr-1',
                  )}
                  style={{ backgroundColor: statusStyle ? `${statusStyle.color}20` : `${brandColor}28` }}
                />
              )}

              {/* Número do dia */}
              <span
                className={cn(
                  'relative z-10 w-5 h-5 flex items-center justify-center rounded-full text-[9px] leading-none font-bold',
                  isEventDay && (isStart || isEnd) && 'text-white font-black',
                  isEventDay && !isStart && !isEnd && 'font-black',
                  isToday && !isEventDay && 'ring-1 ring-[var(--text-primary)] text-[var(--text-primary)] font-black',
                  !isEventDay && !isToday && 'text-[var(--text-tertiary)]',
                )}
                style={
                  isEventDay && (isStart || isEnd)
                    ? { backgroundColor: statusStyle ? statusStyle.color : brandColor }
                    : isEventDay
                    ? { color: statusStyle ? statusStyle.color : brandColor }
                    : {}
                }
              >
                {format(day, 'd')}
              </span>

              {/* Bolinhas cinzas: outros eventos no dia (fora do range desta marca) */}
              {occupied > 0 && isThisMonth && !isEventDay && (
                <div className="absolute bottom-0.5 flex gap-0.5 z-20">
                  {Array.from({ length: Math.min(occupied, 3) }).map((_, i) => (
                    <div key={i} className="w-[3px] h-[3px] rounded-full bg-[var(--text-tertiary)]" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PROJETOS (calendário 6 meses + diretório por marca) ─────────────────────
function ProjectsView({
  projects, contents, agenda, onSelect, onAddEvent, onEditProject,
}: {
  projects: Partnership[];
  contents: any[];
  agenda: any[];
  onSelect: (p: Partnership) => void;
  onAddEvent: (brand?: string, color?: string) => void;
  onEditProject: (brandName: string) => void;
}) {
  const [filters, setFilters] = useState({ conteudos: true, agenda: true, projetos: true });
  const [view, setView] = useState<'marcas' | 'marcas_arquivadas' | 'marcas_encerradas' | 'calendario'>('marcas');
  const [expandedCals, setExpandedCals] = useState<Record<string, boolean>>({});

  const toggleCal = (brand: string) => {
    setExpandedCals(prev => ({ ...prev, [brand]: !prev[brand] }));
  };

  const currentMonthStart = startOfMonth(new Date());
  const monthsRendered = Array.from({ length: 6 }, (_, i) => addMonths(currentMonthStart, i));

  // ── Mapa de itens por data ── (projetos multi-dia ficam em TODOS os dias do range)
  const itemsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    const add = (date: string, item: any) => {
      const d = date.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(item);
    };
    if (filters.conteudos) {
      contents.forEach(c => {
        if (c.publishDate) add(c.publishDate, { ...c, __type: 'conteudo_pub' });
        if (c.recordingDate) add(c.recordingDate, { ...c, __type: 'conteudo_rec' });
      });
    }
    if (filters.projetos) {
      projects.forEach(p => {
        // replicar em todos os dias do range
        getEventDates(p).forEach(d => add(d, { ...p, __type: 'projeto' }));
      });
    }
    if (filters.agenda) {
      agenda.forEach(a => add(a.date, { ...a, __type: 'agenda' }));
    }
    return map;
  }, [contents, projects, agenda, filters]);

  const filteredProjects = useMemo(() => {
    if (view === 'marcas') return projects.filter(p => !p.archived && p.status !== 'Finalizado');
    if (view === 'marcas_arquivadas') return projects.filter(p => p.archived);
    if (view === 'marcas_encerradas') return projects.filter(p => !p.archived && p.status === 'Finalizado');
    return projects;
  }, [projects, view]);

  const brands = Array.from(new Set(filteredProjects.map(p => p.brand))).filter(Boolean);

  return (
    <div className="flex flex-col h-full">
      {/* Barra de controles */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setView('marcas')}
            className={cn(
              'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
              view === 'marcas'
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] italic hover:bg-[var(--bg-primary)]/50'
            )}
          >
            Ativas
          </button>
          <button
            onClick={() => setView('marcas_encerradas')}
            className={cn(
              'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
              view === 'marcas_encerradas'
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                : 'border-[var(--border-color)] opacity-50 hover:opacity-100'
            )}
          >
            Encerradas
          </button>
          <button
            onClick={() => setView('marcas_arquivadas')}
            className={cn(
              'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
              view === 'marcas_arquivadas'
                ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                : 'border-[var(--border-color)] opacity-50 hover:opacity-100'
            )}
          >
            Arquivadas
          </button>
          <button
            onClick={() => setView('calendario')}
            className={cn(
              'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ml-4',
              view === 'calendario'
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                : 'border-[var(--border-color)] opacity-50 hover:opacity-100'
            )}
          >
            Calendário
          </button>
        </div>

        {view === 'calendario' && (
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'conteudos', label: 'Conteúdos', active: 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/5' },
              { key: 'agenda', label: 'Agenda', active: 'border-purple-400 text-purple-600 bg-purple-500/5 dark:text-purple-400' },
              { key: 'projetos', label: 'Projetos', active: 'border-[var(--text-primary)] text-[var(--text-primary)] bg-[var(--text-primary)]/5' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilters(prev => ({ ...prev, [f.key]: !prev[f.key as keyof typeof prev] }))}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all',
                  filters[f.key as keyof typeof filters] ? f.active : 'border-[var(--border-color)] text-[var(--text-tertiary)] opacity-50'
                )}
              >{f.label}</button>
            ))}
          </div>
        )}

        {brands.length > 0 && (
          <div className="flex flex-wrap items-center gap-4">
            {brands.map(brand => {
              const p = projects.find(pr => pr.brand === brand);
              return p ? (
                <div key={brand} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.brandColor }} />
                  <span className="text-[9px] font-bold text-[var(--text-primary)] uppercase tracking-widest opacity-60">{brand}</span>
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {view.startsWith('marcas') ? (
          // ── Diretório por marca ──
          <div className="p-6 md:p-10">
            {brands.length === 0 ? (
              <div className="py-24 text-center opacity-25 flex flex-col items-center gap-4">
                <Briefcase className="w-12 h-12" />
                <p className="text-xs font-black uppercase tracking-[0.3em] italic">
                  {view === 'marcas_arquivadas' && 'Nenhuma marca arquivada'}
                  {view === 'marcas_encerradas' && 'Nenhuma marca encerrada'}
                  {view === 'marcas' && 'Nenhuma marca cadastrada'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brands.map(brand => {
                  const brandProjects = filteredProjects.filter(p => p.brand === brand);
                  const color = brandProjects[0]?.brandColor || '#888';
                  return (
                    <div key={brand} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex flex-col">
                      <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl border-2 border-[var(--bg-primary)] shadow-md" style={{ backgroundColor: color }} />
                          <div>
                            <h2 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wider">{brand}</h2>
                            <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mt-0.5">
                              {brandProjects.length} {brandProjects.length === 1 ? 'evento' : 'eventos'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => onEditProject(brand)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-[var(--border-color)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-all group w-full"
                          >
                            <Settings className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                            <span>Projeto</span>
                          </button>
                          <button
                            onClick={() => onAddEvent(brand, color)}
                            title={`Novo evento para ${brand}`}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-all group w-full"
                          >
                            <Plus className="w-3 h-3 text-[var(--accent-blue)]" />
                            <span className="text-[var(--accent-blue)]">Evento</span>
                          </button>
                          <button
                            onClick={() => toggleCal(brand)}
                            className={cn(
                              "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all w-full",
                              expandedCals[brand]
                                ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                                : "border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]"
                            )}
                          >
                            <CalendarDays className="w-3 h-3" />
                            <span>Agenda</span>
                          </button>
                        </div>
                      </div>

                      {expandedCals[brand] && (
                        <div className="mb-6">
                          <BrandMiniCalendar
                            brand={brand}
                            brandColor={color}
                            brandProjects={brandProjects}
                            allProjects={filteredProjects}
                            allContents={contents}
                            allAgenda={agenda}
                          />
                        </div>
                      )}

                      <div className="space-y-2 flex-1">
                        {brandProjects.slice(0, 4).map(p => {
                          const dur = getEventDates(p).length;
                          const stSet = STATUS_CONFIG[p.status];
                          const Icon = stSet ? getStatusIcon(stSet.icon) : null;
                          return (
                            <button
                              key={p.id}
                              onClick={() => onSelect(p)}
                              className="w-full text-left flex items-center justify-between hover-card p-2.5 -mx-2 rounded-xl transition-all group"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {stSet && Icon && (
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${stSet.color}15`, color: stSet.color }}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">{p.title || 'Sem título'}</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {dur > 1 && <span className="text-[8px] font-black text-[var(--text-tertiary)] opacity-50 uppercase tracking-widest">{dur} dias</span>}
                                    {stSet && <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: stSet.color }}>{p.status}</span>}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                            </button>
                          );
                        })}
                        {brandProjects.length > 4 && (
                          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-40 text-center pt-2">
                            +{brandProjects.length - 4} eventos
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // ── Calendário 6 meses ──
          <div className="p-6 md:p-10 space-y-12 pb-32">
            {monthsRendered.map(month => {
              const mStart = startOfMonth(month);
              const cStart = startOfWeek(mStart, { weekStartsOn: 0 });
              const actualDays = eachDayOfInterval({
                start: cStart,
                end: endOfWeek(new Date(month.getFullYear(), month.getMonth() + 1, 0), { weekStartsOn: 0 }),
              });
              return (
                <div key={month.toISOString()} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2rem] overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-[var(--border-color)]">
                    <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">
                      {format(month, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                  </div>
                  <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/30">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                      <div key={d} className="py-3 text-center text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-50">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {actualDays.map((day, i) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const items = itemsByDate[dateStr] || [];
                      const isCurrentMonth = day.getMonth() === month.getMonth();
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div
                          key={dateStr}
                          className={cn(
                            'min-h-[80px] md:min-h-[100px] p-2 border-b border-r border-[var(--border-color)] flex flex-col',
                            !isCurrentMonth && 'opacity-20',
                            (i + 1) % 7 === 0 && 'border-r-0'
                          )}
                        >
                          <span className={cn(
                            'text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-md mb-1 shrink-0',
                            isToday ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]' : 'text-[var(--text-tertiary)]'
                          )}>
                            {format(day, 'd')}
                          </span>
                          <div className="space-y-0.5 overflow-hidden">
                            {items.slice(0, 3).map((item, idx) => {
                              if (item.__type === 'conteudo_pub')
                                return <div key={idx} className="px-1 py-0.5 text-[7px] font-black uppercase truncate bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] rounded">{item.title}</div>;
                              if (item.__type === 'conteudo_rec')
                                return <div key={idx} className="px-1 py-0.5 text-[7px] font-black uppercase truncate border border-[var(--accent-orange)] text-[var(--accent-orange)] rounded">Grav: {item.title}</div>;
                              if (item.__type === 'projeto')
                                return (
                                  <div
                                    key={`${idx}-${item.id}`}
                                    onClick={() => onSelect(item)}
                                    className="px-1 py-0.5 text-[7px] font-black uppercase truncate border rounded cursor-pointer hover:opacity-80"
                                    style={{ borderColor: item.brandColor, color: item.brandColor }}
                                  >
                                    {item.title || item.brand}
                                  </div>
                                );
                              if (item.__type === 'agenda')
                                return <div key={idx} className="px-1 py-0.5 text-[7px] font-black uppercase truncate bg-purple-500/10 text-purple-500 rounded">{item.title}</div>;
                              return null;
                            })}
                            {items.length > 3 && <div className="text-[7px] font-black text-center text-[var(--text-tertiary)] opacity-40 italic">+{items.length - 3}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── VISÃO GERAL (Kanban) ─────────────────────────────────────────────────────
function DashboardOverview({ projects, onSelect }: { projects: Partnership[]; onSelect: (p: Partnership) => void }) {
  return (
    <div className="h-full flex p-6 md:p-10 gap-5 pb-32" style={{ minHeight: '100%' }}>
      {PARTNERSHIP_STAGES.map(stage => {
        const stageProjects = projects.filter(p => p.status === stage);
        return (
          <div key={stage} className="w-72 shrink-0 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50">{stage}</h3>
              <span className="text-[9px] font-black text-[var(--bg-primary)] bg-[var(--text-primary)] w-5 h-5 flex items-center justify-center rounded-full">
                {stageProjects.length}
              </span>
            </div>
            <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3 rounded-2xl overflow-y-auto custom-scrollbar space-y-3">
              {stageProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="w-full text-left bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)] hover:shadow-lg hover:-translate-y-0.5 transition-all group overflow-hidden relative"
                >
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: p.brandColor }} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] block mb-1 mt-1">{p.brand}</span>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] mb-3 leading-snug line-clamp-2">{p.title || 'Sem título'}</h4>
                  {p.deadline && (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-[var(--bg-hover)] px-2 py-1 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)]">
                      {format(new Date(p.deadline + 'T12:00:00'), 'dd/MM')}
                    </span>
                  )}
                </button>
              ))}
              {stageProjects.length === 0 && (
                <div className="h-24 flex items-center justify-center opacity-20 flex-col gap-2">
                  <AlertCircle className="w-5 h-5 text-[var(--text-primary)]" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-center">Vazio</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
