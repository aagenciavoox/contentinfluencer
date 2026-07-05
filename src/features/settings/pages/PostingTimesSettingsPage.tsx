import {useState, useMemo, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {Clock, Plus, Trash2, Globe} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {AppButton} from '../../../components/ui/AppButton';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import {
  getPostingTimesForPlatform,
  WEEKDAYS_ORDERED,
  Weekday,
  WEEKDAY_LABELS,
} from '../lib/postingTimes';
import {
  replacePostingTimesForPlatform,
} from '../../../lib/database';
import type {PostingTimeEntry} from '../../../lib/database';
import {notifySaveFeedback, getErrorMessage} from '../../../lib/saveFeedback';
import {broadcastDataSync} from '../../../lib/syncBroadcast';

const MAX_TIMES_PER_DAY = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retorna true se o dia usa horários globais como fallback (sem específicos) */
function isUsingGlobalFallback(
  entries: PostingTimeEntry[],
  platformId: string | null,
  weekday: Weekday,
): boolean {
  if (platformId === null) return false;
  const specific = entries.filter(e => e.platformId === platformId && e.weekday === weekday);
  const global = entries.filter(e => e.platformId === null && e.weekday === weekday);
  return specific.length === 0 && global.length > 0;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PostingTimesSettingsPage() {
  const {state, ensureDataDomains} = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);

  const activePlatforms = useMemo(
    () => state.platforms.filter(p => p.ativo),
    [state.platforms],
  );

  const entries: PostingTimeEntry[] = state.postingTimeEntries ?? [];

  const reload = useCallback(
    () => ensureDataDomains(['schedule'], {force: true}),
    [ensureDataDomains],
  );

  async function handleAdd(weekday: Weekday, time: string) {
    if (!time) return;
    const specificEntries = entries.filter(
      e => e.platformId === selectedPlatformId && e.weekday === weekday,
    );
    if (specificEntries.length >= MAX_TIMES_PER_DAY) return;
    if (specificEntries.some(e => e.time === time)) return;
    const newTimes = [...specificEntries.map(e => e.time), time].sort();
    try {
      notifySaveFeedback({ status: 'saving', message: 'Salvando horário...' });
      await replacePostingTimesForPlatform(selectedPlatformId, weekday, newTimes);
      await reload();
      broadcastDataSync();
      notifySaveFeedback({ status: 'success', message: 'Horário salvo' });
    } catch (err) {
      notifySaveFeedback({ status: 'error', message: 'Falha ao salvar horário', detail: getErrorMessage(err) });
    }
  }

  async function handleRemove(weekday: Weekday, time: string) {
    const specificEntries = entries.filter(
      e => e.platformId === selectedPlatformId && e.weekday === weekday,
    );
    const newTimes = specificEntries.map(e => e.time).filter(t => t !== time);
    try {
      notifySaveFeedback({ status: 'saving', message: 'Removendo horário...' });
      await replacePostingTimesForPlatform(selectedPlatformId, weekday, newTimes);
      await reload();
      broadcastDataSync();
      notifySaveFeedback({ status: 'success', message: 'Horário removido' });
    } catch (err) {
      notifySaveFeedback({ status: 'error', message: 'Falha ao remover horário', detail: getErrorMessage(err) });
    }
  }

  const totalConfigured = useMemo(() => {
    return entries.filter(e =>
      selectedPlatformId === null ? e.platformId === null : e.platformId === selectedPlatformId
    ).length;
  }, [entries, selectedPlatformId]);

  const platformTabs = [
    {id: null, label: 'Global'},
    ...activePlatforms.map(p => ({id: p.id, label: p.nome})),
  ];

  const content = (
    <div className="stack-xl">
      <p className="text-sm text-[var(--text-secondary)] opacity-60">
        Configure até {MAX_TIMES_PER_DAY} horários por dia. Horários específicos de plataforma
        sobrepõem o Global. Se não houver configuração própria, o Global é usado como sugestão.
      </p>

      {/* Tabs de plataforma */}
      <div className="flex flex-wrap gap-2">
        {platformTabs.map(tab => (
          <button
            key={tab.id ?? 'global'}
            onClick={() => setSelectedPlatformId(tab.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all border',
              selectedPlatformId === tab.id
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]',
            )}
          >
            {tab.id === null && <Globe className="h-3 w-3" />}
            {tab.label}
          </button>
        ))}
      </div>

      {selectedPlatformId !== null && (
        <p className="text-xs text-[var(--text-secondary)] opacity-50">
          Dias sem horários próprios usam os horários <strong>Global</strong> como sugestão
          (exibidos tracejados).
        </p>
      )}

      {/* Grid de dias */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {WEEKDAYS_ORDERED.map(day => {
          const specificTimes = entries
            .filter(e => e.platformId === selectedPlatformId && e.weekday === day)
            .map(e => e.time)
            .sort();
          const usingFallback = isUsingGlobalFallback(entries, selectedPlatformId, day);
          const fallbackTimes = usingFallback
            ? entries.filter(e => e.platformId === null && e.weekday === day).map(e => e.time).sort()
            : [];

          return (
            <DayCard
              key={day}
              day={day}
              specificTimes={specificTimes}
              fallbackTimes={fallbackTimes}
              isFallback={usingFallback}
              onAdd={(t) => handleAdd(day, t)}
              onRemove={(t) => handleRemove(day, t)}
            />
          );
        })}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
            <button
              onClick={() => navigate('/configuracoes')}
              className="text-[var(--text-secondary)] opacity-60 hover:opacity-100"
            >
              ←
            </button>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--text-primary)] opacity-50" />
              <Text variant="pageTitle">
                Horários de Postagem
              </Text>
            </div>
          </div>
          <div className="p-4">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      variant="settings"
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
                onClick={async () => {
                  try {
                    notifySaveFeedback({ status: 'saving', message: 'Limpando horários...' });
                    for (const wd of [0, 1, 2, 3, 4, 5, 6] as Weekday[]) {
                      await replacePostingTimesForPlatform(selectedPlatformId, wd, []);
                    }
                    await reload();
                    broadcastDataSync();
                    notifySaveFeedback({ status: 'success', message: 'Horários removidos' });
                  } catch (err) {
                    notifySaveFeedback({ status: 'error', message: 'Falha ao limpar horários', detail: getErrorMessage(err) });
                  }
                }}
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
      {content}
    </PageLayout>
  );
}

// ─── DayCard ─────────────────────────────────────────────────────────────────

interface DayCardProps {
  day: Weekday;
  specificTimes: string[];
  fallbackTimes: string[];
  isFallback: boolean;
  onAdd: (time: string) => void;
  onRemove: (time: string) => void;
}

function DayCard({day, specificTimes, fallbackTimes, isFallback, onAdd, onRemove}: DayCardProps) {
  const [input, setInput] = useState('');
  const canAdd = specificTimes.length < MAX_TIMES_PER_DAY;
  const displayTimes = specificTimes.length > 0 ? specificTimes : fallbackTimes;

  function handleAdd() {
    if (!input) return;
    onAdd(input);
    setInput('');
  }

  return (
    <div className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-6 py-4 stack-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{WEEKDAY_LABELS[day]}</p>
        <div className="flex items-center gap-2">
          {isFallback && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)] opacity-40">
              <Globe className="h-2.5 w-2.5" />
              global
            </span>
          )}
          <span className="text-xs text-[var(--text-secondary)] opacity-40">
            {specificTimes.length}/{MAX_TIMES_PER_DAY}
          </span>
        </div>
      </div>

      {displayTimes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {displayTimes.map(t => {
            const isOwn = specificTimes.includes(t);
            return (
              <span
                key={t}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold',
                  isOwn
                    ? 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                    : 'border-dashed border-[var(--border-color)] bg-transparent text-[var(--text-secondary)] opacity-40',
                )}
              >
                {t}
                {isOwn && (
                  <button
                    onClick={() => onRemove(t)}
                    className="opacity-30 hover:opacity-80 transition-opacity"
                    aria-label={`Remover ${t}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
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

      {!canAdd && (
        <p className="text-xs text-[var(--text-secondary)] opacity-40">
          {`Maximo de ${MAX_TIMES_PER_DAY} horarios atingido`}
        </p>
      )}
    </div>
  );
}
