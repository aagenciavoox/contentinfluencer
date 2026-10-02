import {useMemo, useState} from 'react';
import {Globe, Pencil, Plus, Trash2} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {AppButton} from '../../../components/ui/AppButton';
import {SegmentTabs} from '../../../components/ui/SegmentTabs';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import {
  WEEKDAYS_ORDERED,
  Weekday,
  WEEKDAY_LABELS,
} from '../lib/postingTimes';
import {replacePostingTimesForPlatform} from '../../../lib/database';
import type {PostingTimeEntry} from '../../../lib/database';
import {notifySaveFeedback, getErrorMessage} from '../../../lib/saveFeedback';
import {broadcastDataSync} from '../../../lib/syncBroadcast';

const MAX_TIMES_PER_DAY = 3;
const GLOBAL_TAB_ID = 'global';
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as Weekday[];

type DayMap = Partial<Record<Weekday, string[]>>;
type ScheduleDraft = Record<string, DayMap>;

function normalizeTime(time: string) {
  return time.slice(0, 5);
}

function tabKey(platformId: string | null) {
  return platformId ?? GLOBAL_TAB_ID;
}

function entriesToDraft(entries: PostingTimeEntry[]): ScheduleDraft {
  const draft: ScheduleDraft = {};
  for (const entry of entries) {
    const key = tabKey(entry.platformId);
    const day = draft[key]?.[entry.weekday] ?? [];
    const time = normalizeTime(entry.time);
    if (!day.includes(time)) day.push(time);
    draft[key] = {...draft[key], [entry.weekday]: [...day].sort()};
  }
  return draft;
}

function timesFor(draft: ScheduleDraft, key: string, weekday: Weekday) {
  return [...(draft[key]?.[weekday] ?? [])].sort();
}

function draftsMatch(left: ScheduleDraft, right: ScheduleDraft) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    for (const weekday of WEEKDAYS) {
      if (timesFor(left, key, weekday).join('|') !== timesFor(right, key, weekday).join('|')) {
        return false;
      }
    }
  }
  return true;
}

function isUsingGlobalFallback(
  draft: ScheduleDraft,
  platformId: string | null,
  weekday: Weekday,
) {
  if (platformId === null) return false;
  const specific = timesFor(draft, tabKey(platformId), weekday);
  const global = timesFor(draft, GLOBAL_TAB_ID, weekday);
  return specific.length === 0 && global.length > 0;
}

export function PostingTimesEditor() {
  const {state, ensureDataDomains} = useAppContext();
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ScheduleDraft>({});
  const [isSaving, setIsSaving] = useState(false);

  const activePlatforms = useMemo(
    () => state.platforms.filter(platform => platform.ativo),
    [state.platforms],
  );

  const savedDraft = useMemo(
    () => entriesToDraft(state.postingTimeEntries ?? []),
    [state.postingTimeEntries],
  );
  const visibleDraft = editing ? draft : savedDraft;
  const isDirty = editing && !draftsMatch(draft, savedDraft);

  const platformTabs = [
    {id: GLOBAL_TAB_ID, label: 'Global'},
    ...activePlatforms.map(platform => ({id: platform.id, label: platform.nome})),
  ];
  const selectedTabId = selectedPlatformId ?? GLOBAL_TAB_ID;
  const selectedKey = tabKey(selectedPlatformId);

  function startEditing() {
    setDraft(entriesToDraft(state.postingTimeEntries ?? []));
    setEditing(true);
  }

  function cancelEditing() {
    setDraft({});
    setEditing(false);
  }

  function updateDay(weekday: Weekday, nextTimes: string[]) {
    setDraft(previous => ({
      ...previous,
      [selectedKey]: {
        ...previous[selectedKey],
        [weekday]: [...nextTimes].sort(),
      },
    }));
  }

  function handleAdd(weekday: Weekday, time: string) {
    const normalized = normalizeTime(time);
    if (!normalized) return;
    const current = timesFor(visibleDraft, selectedKey, weekday);
    if (current.length >= MAX_TIMES_PER_DAY || current.includes(normalized)) return;
    updateDay(weekday, [...current, normalized]);
  }

  function handleRemove(weekday: Weekday, time: string) {
    const current = timesFor(visibleDraft, selectedKey, weekday);
    updateDay(weekday, current.filter(item => item !== normalizeTime(time)));
  }

  function handleClearTab() {
    setDraft(previous => {
      const next = {...previous, [selectedKey]: {}};
      for (const weekday of WEEKDAYS) {
        next[selectedKey] = {...next[selectedKey], [weekday]: []};
      }
      return next;
    });
  }

  async function handleSave() {
    const keys = new Set([...Object.keys(savedDraft), ...Object.keys(draft)]);
    setIsSaving(true);
    try {
      notifySaveFeedback({status: 'saving', message: 'Salvando horários...'});
      for (const key of keys) {
        const platformId = key === GLOBAL_TAB_ID ? null : key;
        for (const weekday of WEEKDAYS) {
          const next = timesFor(draft, key, weekday);
          const previous = timesFor(savedDraft, key, weekday);
          if (next.join('|') === previous.join('|')) continue;
          await replacePostingTimesForPlatform(platformId, weekday, next);
        }
      }
      await ensureDataDomains(['schedule'], {force: true});
      broadcastDataSync();
      notifySaveFeedback({status: 'success', message: 'Horários salvos'});
      setEditing(false);
      setDraft({});
    } catch (err) {
      notifySaveFeedback({status: 'error', message: 'Os horários não foram salvos', detail: getErrorMessage(err)});
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="stack-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Text variant="body" className="max-w-2xl text-[var(--text-secondary)]">
          {editing
            ? `Até ${MAX_TIMES_PER_DAY} horários por dia. As mudanças ficam nesta tela até você salvar.`
            : 'Horários sugeridos por dia. Um horário da plataforma substitui o Global naquele dia.'}
        </Text>
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <AppButton variant="ghost" size="sm" onClick={handleClearTab} disabled={isSaving}>
                Limpar aba
              </AppButton>
              <AppButton variant="secondary" size="sm" onClick={cancelEditing} disabled={isSaving}>
                Cancelar
              </AppButton>
              <AppButton variant="primary" size="sm" onClick={() => void handleSave()} disabled={!isDirty || isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar'}
              </AppButton>
            </>
          ) : (
            <AppButton
              variant="secondary"
              size="sm"
              onClick={startEditing}
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
            >
              Editar
            </AppButton>
          )}
        </div>
      </div>

      <SegmentTabs
        options={platformTabs}
        value={selectedTabId}
        onChange={id => setSelectedPlatformId(id === GLOBAL_TAB_ID ? null : id)}
        className="flex flex-wrap"
      />

      {selectedPlatformId !== null ? (
        <Text variant="meta" className="text-[var(--text-secondary)]">
          Dias sem horário próprio usam o Global, mostrado tracejado.
        </Text>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {WEEKDAYS_ORDERED.map(day => {
          const specificTimes = timesFor(visibleDraft, selectedKey, day);
          const usingFallback = isUsingGlobalFallback(visibleDraft, selectedPlatformId, day);
          const fallbackTimes = usingFallback ? timesFor(visibleDraft, GLOBAL_TAB_ID, day) : [];

          return (
            <DayCard
              key={day}
              day={day}
              editing={editing}
              specificTimes={specificTimes}
              fallbackTimes={fallbackTimes}
              isFallback={usingFallback}
              onAdd={time => handleAdd(day, time)}
              onRemove={time => handleRemove(day, time)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface DayCardProps {
  day: Weekday;
  editing: boolean;
  specificTimes: string[];
  fallbackTimes: string[];
  isFallback: boolean;
  onAdd: (time: string) => void;
  onRemove: (time: string) => void;
}

function DayCard({day, editing, specificTimes, fallbackTimes, isFallback, onAdd, onRemove}: DayCardProps) {
  const [input, setInput] = useState('');
  const canAdd = specificTimes.length < MAX_TIMES_PER_DAY;
  const displayTimes = specificTimes.length > 0 ? specificTimes : fallbackTimes;

  function handleAdd() {
    if (!input) return;
    onAdd(input);
    setInput('');
  }

  return (
    <div className="stack-md rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-6 py-4">
      <div className="flex items-center justify-between">
        <Text variant="bodyStrong">{WEEKDAY_LABELS[day]}</Text>
        <div className="flex items-center gap-2">
          {isFallback ? (
            <span className="flex items-center gap-1 text-[var(--text-secondary)]">
              <Globe className="h-2.5 w-2.5" />
              <Text variant="meta">global</Text>
            </span>
          ) : null}
          {editing ? (
            <Text variant="meta" className="text-[var(--text-secondary)]">
              {specificTimes.length}/{MAX_TIMES_PER_DAY}
            </Text>
          ) : null}
        </div>
      </div>

      {displayTimes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {displayTimes.map(time => {
            const isOwn = specificTimes.includes(time);
            return (
              <span
                key={time}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold',
                  isOwn
                    ? 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                    : 'border-dashed border-[var(--border-color)] bg-transparent text-[var(--text-secondary)]',
                )}
              >
                {time}
                {editing && isOwn ? (
                  <button
                    type="button"
                    onClick={() => onRemove(time)}
                    className="inline-flex min-h-9 min-w-9 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    aria-label={`Remover horário ${time}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : (
        <Text variant="meta" className="text-[var(--text-tertiary)]">
          Nenhum horário
        </Text>
      )}

      {editing && canAdd ? (
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && handleAdd()}
            aria-label={`Novo horário para ${WEEKDAY_LABELS[day]}`}
            className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
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
      ) : null}

      {editing && !canAdd ? (
        <Text variant="meta" className="text-[var(--text-secondary)]">
          Máximo de {MAX_TIMES_PER_DAY} horários atingido
        </Text>
      ) : null}
    </div>
  );
}
