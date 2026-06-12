import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Clock, Plus, Trash2} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {AppButton} from '../../../components/ui/AppButton';
import {cn} from '../../../lib/utils';
import {
  DEFAULT_POSTING_TIMES,
  getPostingTimes,
  POSTING_TIMES_PREFERENCE_KEY,
  PostingTimesSettings,
  Weekday,
  WEEKDAY_LABELS,
} from '../lib/postingTimes';

const MAX_TIMES_PER_DAY = 3;
const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export function PostingTimesSettingsPage() {
  const {state, dispatch} = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const saved = getPostingTimes(state.preferences);

  // Local draft — salva só ao confirmar cada horário
  const [draft, setDraft] = useState<PostingTimesSettings>(() =>
    JSON.parse(JSON.stringify(saved)),
  );

  function updatePreference(next: PostingTimesSettings) {
    setDraft(next);
    dispatch({
      type: 'SET_PREFERENCE',
      payload: {
        key: POSTING_TIMES_PREFERENCE_KEY,
        value: next,
      },
    });
  }

  function addTime(day: Weekday, time: string) {
    if (!time) return;
    const current = (draft[day] ?? []).filter(Boolean) as string[];
    if (current.length >= MAX_TIMES_PER_DAY) return;
    if (current.includes(time)) return;
    const next = [...current, time].sort() as PostingTimesSettings[Weekday];
    updatePreference({...draft, [day]: next});
  }

  function removeTime(day: Weekday, index: number) {
    const current = (draft[day] ?? []).filter(Boolean) as string[];
    current.splice(index, 1);
    updatePreference({...draft, [day]: current as PostingTimesSettings[Weekday]});
  }

  function clearAll() {
    updatePreference({...DEFAULT_POSTING_TIMES});
  }

  const totalConfigured = WEEKDAYS.reduce(
    (acc, d) => acc + ((draft[d] ?? []).filter(Boolean).length),
    0,
  );

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <MobilePostingTimes
          draft={draft}
          onAdd={addTime}
          onRemove={removeTime}
          onBack={() => navigate('/configuracoes')}
        />
      </div>
    );
  }

  return (
    <PageLayout
      variant="settings"
      contentClassName="space-y-6"
      header={
        <DesktopPageHeader
          section="Configurações"
          title="Horários de Postagem"
          icon={Clock}
          backLabel="Configurações"
          backTo="/configuracoes"
          actions={
            totalConfigured > 0 ? (
              <AppButton
                onClick={clearAll}
                variant="ghost"
                size="sm"
                className="text-[var(--text-secondary)] opacity-60 hover:opacity-100"
              >
                Limpar tudo
              </AppButton>
            ) : undefined
          }
        />
      }
    >
        <p className="text-sm text-[var(--text-secondary)] opacity-60">
          Configure até {MAX_TIMES_PER_DAY} horários recomendados por dia. O sistema usará essas
          janelas como sugestão ao programar conteúdo.
        </p>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {WEEKDAYS.map((day) => (
            <DayCard
              key={day}
              day={day}
              times={(draft[day] ?? []).filter(Boolean) as string[]}
              onAdd={(t) => addTime(day, t)}
              onRemove={(i) => removeTime(day, i)}
            />
          ))}
        </div>
    </PageLayout>
  );
}

// ─── DayCard ────────────────────────────────────────────────────────────────

interface DayCardProps {
  day: Weekday;
  times: string[];
  onAdd: (time: string) => void;
  onRemove: (index: number) => void;
}

function DayCard({day, times, onAdd, onRemove}: DayCardProps) {
  const [input, setInput] = useState('');
  const canAdd = times.length < MAX_TIMES_PER_DAY;

  function handleAdd() {
    if (!input) return;
    onAdd(input);
    setInput('');
  }

  return (
    <div className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{WEEKDAY_LABELS[day]}</p>
        <span className="text-xs text-[var(--text-secondary)] opacity-40">
          {times.length}/{MAX_TIMES_PER_DAY}
        </span>
      </div>

      {times.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {times.map((t, i) => (
            <span
              key={t}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)]"
            >
              {t}
              <button
                onClick={() => onRemove(i)}
                className="opacity-30 hover:opacity-80 transition-opacity"
                aria-label={`Remover ${t}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {canAdd && (
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className={cn(
              'flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]',
              'px-3 py-2 text-sm font-bold text-[var(--text-primary)]',
              'focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]',
            )}
          />
          <AppButton
            onClick={handleAdd}
            variant="ghost"
            size="sm"
            disabled={!input}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Adicionar
          </AppButton>
        </div>
      )}

      {!canAdd && times.length === MAX_TIMES_PER_DAY && (
        <p className="text-xs text-[var(--text-secondary)] opacity-40">
          Máximo de {MAX_TIMES_PER_DAY} horários atingido
        </p>
      )}
    </div>
  );
}

// ─── Mobile ─────────────────────────────────────────────────────────────────

interface MobilePostingTimesProps {
  draft: PostingTimesSettings;
  onAdd: (day: Weekday, time: string) => void;
  onRemove: (day: Weekday, index: number) => void;
  onBack: () => void;
}

function MobilePostingTimes({draft, onAdd, onRemove, onBack}: MobilePostingTimesProps) {
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
        <button onClick={onBack} className="text-[var(--text-secondary)] opacity-60 hover:opacity-100">
          ←
        </button>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--text-primary)] opacity-50" />
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Horários de Postagem</h1>
        </div>
      </div>

      <div className="space-y-1 p-4">
        <p className="mb-4 text-xs text-[var(--text-secondary)] opacity-60">
          Até {MAX_TIMES_PER_DAY} horários por dia. Usados como sugestão ao programar.
        </p>
        {WEEKDAYS.map((day) => (
          <DayCard
            key={day}
            day={day}
            times={(draft[day] ?? []).filter(Boolean) as string[]}
            onAdd={(t) => onAdd(day, t)}
            onRemove={(i) => onRemove(day, i)}
          />
        ))}
      </div>
    </div>
  );
}
