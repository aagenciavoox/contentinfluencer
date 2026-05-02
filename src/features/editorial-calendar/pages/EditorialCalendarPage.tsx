import {useCallback, useState} from 'react';
import {format} from 'date-fns';
import {Plus} from 'lucide-react';
import {BottomSheetModal} from '../../../components/feedback/modals/BottomSheetModal';
import {useAppContext} from '../../../context/AppContext';
import {AgendaItem, Projeto} from '../../../lib/database';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {readStoredJson, writeStoredJson} from '../../../lib/browserStorage';
import {AgendaMobileScreen} from '../../../mobile/screens/agenda/AgendaMobileScreen';
import {EditorialAgendaFilters} from '../components/filters/EditorialAgendaFilters';
import {EditorialCalendarHeader} from '../components/EditorialCalendarHeader';
import {MonthlyCalendarView} from '../components/MonthlyCalendarView';

const STORAGE_KEY = 'content-os:calendar-layers';
const DEFAULT_LAYERS = ['recordings', 'posts', 'projects', 'agenda'];

function loadLayers(): string[] {
  return readStoredJson(STORAGE_KEY, DEFAULT_LAYERS);
}

export function getStatusIcon() {
  return null;
}

export function EditorialCalendarPage() {
  const {state, dispatch} = useAppContext();
  const isMobile = useIsMobile();
  const [isAddAgendaOpen, setIsAddAgendaOpen] = useState(false);
  const [activeLayers, setActiveLayersRaw] = useState<string[]>(loadLayers);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortValue, setSortValue] = useState('proximos');

  const setActiveLayers = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    setActiveLayersRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writeStoredJson(STORAGE_KEY, next);
      return next;
    });
  }, []);

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <AgendaMobileScreen
            contents={state.contents}
            agendaItems={state.agendaItems}
            projetos={state.projetos}
            onAddAgenda={() => setIsAddAgendaOpen(true)}
          />
        </div>

        <BottomSheetModal
          open={isAddAgendaOpen}
          onClose={() => setIsAddAgendaOpen(false)}
          desktopMaxW="max-w-md"
        >
          <AddAgendaModal
            projetos={state.projetos}
            onClose={() => setIsAddAgendaOpen(false)}
            onSave={item => {
              dispatch({type: 'ADD_AGENDA_ITEM', payload: item});
              setIsAddAgendaOpen(false);
            }}
          />
        </BottomSheetModal>
      </>
    );
  }

  return (
    <div className="min-h-full bg-[var(--bg-primary)] transition-colors duration-200">
      <EditorialCalendarHeader onAddAgenda={() => setIsAddAgendaOpen(true)} />

      <div className="h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
        <div className="mx-auto max-w-[1600px] space-y-6 px-5 py-8 md:px-10">
          <EditorialAgendaFilters
            activeLayers={activeLayers}
            searchTerm={searchTerm}
            sortValue={sortValue}
            onSearchChange={setSearchTerm}
            onSortChange={setSortValue}
            onToggleLayer={layerId =>
              setActiveLayers(current =>
                current.includes(layerId)
                  ? current.filter(layer => layer !== layerId)
                  : [...current, layerId]
              )
            }
          />

          <MonthlyCalendarView
            contents={state.contents}
            agendaItems={state.agendaItems}
            projetos={state.projetos}
            activeLayers={activeLayers}
            searchTerm={searchTerm}
            sortValue={sortValue}
            monthsToShow={8}
          />
        </div>
      </div>

      <BottomSheetModal
        open={isAddAgendaOpen}
        onClose={() => setIsAddAgendaOpen(false)}
        desktopMaxW="max-w-md"
      >
        <AddAgendaModal
          projetos={state.projetos}
          onClose={() => setIsAddAgendaOpen(false)}
          onSave={item => {
            dispatch({type: 'ADD_AGENDA_ITEM', payload: item});
            setIsAddAgendaOpen(false);
          }}
        />
      </BottomSheetModal>
    </div>
  );
}

function AddAgendaModal({
  projetos,
  onSave,
  onClose,
}: {
  projetos: Projeto[];
  onSave: (item: AgendaItem) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [agendaType, setAgendaType] = useState<AgendaItem['tipo']>('Reunião');
  const [projetoId, setProjetoId] = useState('');

  const handleSave = () => {
    if (!title.trim() || !date) return;

    onSave({
      id: crypto.randomUUID(),
      userId: '',
      title: title.trim(),
      date,
      time: null,
      tipo: agendaType,
      projetoId: projetoId || null,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-5">
        <div>
          <h2 className="text-lg font-black text-[var(--text-primary)]">Novo Evento</h2>
          <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.25em] text-[var(--text-tertiary)]">
            Agenda editorial
          </p>
        </div>
        <button onClick={onClose} className="rounded-full p-2 transition-all hover:bg-[var(--bg-hover)]">
          <Plus className="h-5 w-5 rotate-45 text-[var(--text-tertiary)]" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
            Titulo do evento
          </label>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Ex: reuniao, entrega, live..."
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:ring-2 focus:ring-[var(--accent-blue)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
            Data
          </label>
          <input
            type="date"
            value={date}
            onChange={event => setDate(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
            Tipo
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['Reunião', 'Entrega', 'Publicação', 'Outro'] as AgendaItem['tipo'][]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setAgendaType(type)}
                className={`rounded-xl border px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  agendaType === type
                    ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                    : 'border-[var(--border-color)] text-[var(--text-tertiary)]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
            Projeto vinculado
          </label>
          <select
            value={projetoId}
            onChange={event => setProjetoId(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
          >
            <option value="">Sem projeto</option>
            {projetos
              .filter(projeto => !projeto.deletedAt)
              .map(projeto => (
                <option key={projeto.id} value={projeto.id}>
                  {projeto.nome}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="border-t border-[var(--border-color)] px-6 py-4">
        <button
          onClick={handleSave}
          disabled={!title.trim() || !date}
          className="w-full rounded-2xl bg-[var(--text-primary)] py-4 text-xs font-black uppercase tracking-widest text-[var(--bg-primary)] shadow-lg transition-all hover:scale-[1.01] disabled:pointer-events-none disabled:opacity-30"
        >
          Adicionar evento
        </button>
      </div>
    </div>
  );
}
