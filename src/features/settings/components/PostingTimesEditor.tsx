import {useEffect, useMemo, useRef, useState} from 'react';
import {Globe, Pencil, Plus, Trash2, UserRound, X} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {AppButton} from '../../../components/ui/AppButton';
import {SelectField} from '../../../components/ui/SelectField';
import {Text} from '../../../components/ui/Text';
import {cn, tintedTextColor} from '../../../lib/utils';
import {
  WEEKDAYS_ORDERED,
  Weekday,
} from '../lib/postingTimes';
import {replacePostingTimesForPlatform} from '../../../lib/database';
import type {PostingTimeEntry} from '../../../lib/database';
import {notifySaveFeedback, getErrorMessage} from '../../../lib/saveFeedback';
import {broadcastDataSync} from '../../../lib/syncBroadcast';
import {rotuloConta} from '../../contas/lib/contas';

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

const NOME_DO_DIA: Record<Weekday, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

/**
 * Horários de postagem numa tabela por dia. A pessoa vê os horários e só altera
 * depois de editar; "Salvar alterações" grava o rascunho. O padrão geral vale
 * nos dias sem horário da conta.
 */
export function PostingTimesEditor({
  contaInicialId,
  aoSalvar,
  layout = 'painel',
  onDirtyChange,
  comecarEditando = false,
}: {
  /** Conta já escolhida na tela que abriu o editor. Null abre no padrão geral. */
  contaInicialId?: string | null;
  aoSalvar?: () => void;
  /** `pagina` mostra o título da seção; no painel lateral o título é do painel. */
  layout?: 'pagina' | 'painel';
  /** Avisa a tela quando há alteração sem salvar (para ela não ter dois botões principais). */
  onDirtyChange?: (dirty: boolean) => void;
  /** O painel de configurar já abre pronto para editar. */
  comecarEditando?: boolean;
} = {}) {
  const {state, ensureDataDomains} = useAppContext();
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(contaInicialId ?? null);
  const savedDraft = useMemo(
    () => entriesToDraft(state.postingTimeEntries ?? []),
    [state.postingTimeEntries],
  );
  const [draft, setDraft] = useState<ScheduleDraft>(savedDraft);
  const [editando, setEditando] = useState(comecarEditando);
  // Enquanto ninguém mexeu, o rascunho acompanha o que chega do servidor.
  const [touched, setTouched] = useState(false);
  const pendentesRef = useRef<Partial<Record<Weekday, string>>>({});
  const saveEpoch = useRef(0);
  const manterRascunhoSalvo = useRef(false);
  const isDirty = editando && touched && !draftsMatch(draft, savedDraft);

  useEffect(() => {
    if (editando) return;
    if (manterRascunhoSalvo.current) {
      manterRascunhoSalvo.current = false;
      return;
    }
    setDraft(savedDraft);
  }, [savedDraft, editando]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (contaInicialId === undefined) return;
    setSelectedPlatformId(contaInicialId);
  }, [contaInicialId]);

  const activePlatforms = useMemo(() => {
    const ativas = state.platforms.filter(platform => platform.ativo);
    if (!contaInicialId || ativas.some(platform => platform.id === contaInicialId)) return ativas;
    const extra = state.platforms.find(platform => platform.id === contaInicialId);
    return extra ? [extra, ...ativas] : ativas;
  }, [contaInicialId, state.platforms]);

  const selectedKey = tabKey(selectedPlatformId);
  const contaSelecionada = activePlatforms.find(platform => platform.id === selectedPlatformId) ?? null;
  const temHorarioNaAba = WEEKDAYS.some(weekday => timesFor(draft, selectedKey, weekday).length > 0);

  function updateDay(weekday: Weekday, nextTimes: string[]) {
    setTouched(true);
    setDraft(previous => ({
      ...previous,
      [selectedKey]: {
        ...previous[selectedKey],
        [weekday]: [...nextTimes].sort(),
      },
    }));
  }

  function incluirHorario(base: ScheduleDraft, weekday: Weekday, time: string): ScheduleDraft {
    const normalized = normalizeTime(time);
    if (!normalized) return base;
    const current = timesFor(base, selectedKey, weekday);
    if (current.length >= MAX_TIMES_PER_DAY || current.includes(normalized)) return base;
    return {
      ...base,
      [selectedKey]: {
        ...base[selectedKey],
        [weekday]: [...current, normalized].sort(),
      },
    };
  }

  function rascunhoPronto(base: ScheduleDraft): ScheduleDraft {
    let next = base;
    for (const weekday of WEEKDAYS) {
      const pendente = pendentesRef.current[weekday];
      if (pendente) next = incluirHorario(next, weekday, pendente);
    }
    return next;
  }

  function handleAdd(weekday: Weekday, time: string) {
    const next = incluirHorario(draft, weekday, time);
    if (next === draft) return;
    delete pendentesRef.current[weekday];
    setTouched(true);
    setDraft(next);
  }

  function handleRemove(weekday: Weekday, time: string) {
    const current = timesFor(draft, selectedKey, weekday);
    updateDay(weekday, current.filter(item => item !== normalizeTime(time)));
  }

  function handleClearTab() {
    setTouched(true);
    setDraft(previous => {
      const next = {...previous, [selectedKey]: {}};
      for (const weekday of WEEKDAYS) {
        next[selectedKey] = {...next[selectedKey], [weekday]: []};
      }
      return next;
    });
  }

  function comecarEdicao() {
    saveEpoch.current += 1;
    pendentesRef.current = {};
    setDraft(savedDraft);
    setTouched(false);
    setEditando(true);
  }

  function cancelEditing() {
    pendentesRef.current = {};
    setDraft(savedDraft);
    setTouched(false);
    setEditando(false);
  }

  async function handleSave() {
    const pronto = rascunhoPronto(draft);
    pendentesRef.current = {};
    if (draftsMatch(pronto, savedDraft)) {
      setDraft(savedDraft);
      setTouched(false);
      setEditando(false);
      return;
    }
    manterRascunhoSalvo.current = true;
    setDraft(pronto);
    setTouched(false);
    setEditando(false);
    const epoch = saveEpoch.current;
    const keys = new Set([...Object.keys(savedDraft), ...Object.keys(pronto)]);
    notifySaveFeedback({status: 'saving', message: 'Salvando horários…'});
    void (async () => {
      try {
        for (const key of keys) {
          const platformId = key === GLOBAL_TAB_ID ? null : key;
          for (const weekday of WEEKDAYS) {
            const next = timesFor(pronto, key, weekday);
            const previous = timesFor(savedDraft, key, weekday);
            if (next.join('|') === previous.join('|')) continue;
            await replacePostingTimesForPlatform(platformId, weekday, next);
          }
        }
        await ensureDataDomains(['schedule'], {force: true});
        broadcastDataSync();
        if (saveEpoch.current !== epoch) return;
        notifySaveFeedback({status: 'success', message: 'Horários salvos'});
        aoSalvar?.();
      } catch (err) {
        if (saveEpoch.current !== epoch) return;
        notifySaveFeedback({status: 'error', message: 'Não foi possível salvar os horários. Verifique sua conexão e tente novamente.', detail: getErrorMessage(err)});
        setDraft(pronto);
        setTouched(true);
        setEditando(true);
      }
    })();
  }

  const acoes = editando ? (
    <div className="flex flex-wrap items-center gap-2">
      <AppButton variant="secondary" size="sm" onClick={cancelEditing}>
        Cancelar
      </AppButton>
      <AppButton
        variant="primary"
        size="sm"
        onClick={() => void handleSave()}
      >
        Salvar alterações
      </AppButton>
    </div>
  ) : (
    <AppButton variant="secondary" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={comecarEdicao}>
      Editar
    </AppButton>
  );

  const escolha = 'inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-input)] border px-4 t-body transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';
  const escolhida = 'border-[var(--text-primary)] bg-[var(--bg-hover)] font-semibold text-[var(--text-primary)]';
  const livre = 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]';

  return (
    <div className="stack-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          {layout === 'pagina' ? <Text variant="sectionTitle" as="h2">Horários de postagem</Text> : null}
          <Text variant="secondary" className="mt-0.5 text-[var(--text-secondary)]">
            {editando
              ? `Até ${MAX_TIMES_PER_DAY} horários por dia. Nada é gravado até salvar.`
              : `Até ${MAX_TIMES_PER_DAY} horários por dia. Os dias sem horário próprio usam o padrão geral.`}
          </Text>
        </div>
        {acoes}
      </div>

      <div className="stack-sm">
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Horários de">
          <button
            type="button"
            role="radio"
            aria-checked={selectedPlatformId === null}
            onClick={() => setSelectedPlatformId(null)}
            className={cn(escolha, selectedPlatformId === null ? escolhida : livre)}
          >
            <Globe className="h-4 w-4" aria-hidden />
            Padrão geral
          </button>
          {activePlatforms.length > 0 ? (
            <SelectField
              ariaLabel="Personalizar por conta"
              selected={selectedPlatformId !== null}
              className="min-h-11 md:min-h-11"
              leadingIcon={<UserRound className="h-4 w-4 text-[var(--text-primary)]" />}
              value={selectedPlatformId ?? ''}
              onChange={value => setSelectedPlatformId(value || null)}
              options={[
                {value: '', label: 'Personalizar por conta'},
                ...activePlatforms.map(platform => ({value: platform.id, label: rotuloConta(platform)})),
              ]}
            />
          ) : null}
        </div>
        <Text variant="secondary" className="text-[var(--text-secondary)]">
          {contaSelecionada
            ? `Exceções de ${rotuloConta(contaSelecionada)}. Dias sem horário desta conta usam o padrão geral, mostrado tracejado.`
            : 'Selecione uma conta para definir exceções.'}
        </Text>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)]">
        <div className={`${LINHA_DIA} border-b border-[var(--border-color)] bg-[var(--surface-subtle)] py-2.5`} aria-hidden>
          <Text variant="label" as="span" className="text-[var(--text-secondary)]">Dia</Text>
          <Text variant="label" as="span" className="text-[var(--text-secondary)]">Horários</Text>
          <Text variant="label" as="span" className="text-right text-[var(--text-secondary)]">Limite</Text>
        </div>
        <ul>
          {WEEKDAYS_ORDERED.map(day => {
            const specificTimes = timesFor(draft, selectedKey, day);
            const usingFallback = isUsingGlobalFallback(draft, selectedPlatformId, day);
            const fallbackTimes = usingFallback ? timesFor(draft, GLOBAL_TAB_ID, day) : [];
            return (
              <DayRow
                key={`${selectedKey}:${day}`}
                day={day}
                fimDeSemana={day === 0 || day === 6}
                specificTimes={specificTimes}
                fallbackTimes={fallbackTimes}
                editando={editando}
                onPending={time => {
                  pendentesRef.current = {...pendentesRef.current, [day]: time};
                }}
                onAdd={time => handleAdd(day, time)}
                onRemove={time => handleRemove(day, time)}
              />
            );
          })}
        </ul>
      </div>

      {editando ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text variant="secondary" className="text-[var(--text-secondary)]" aria-live="polite">
            {isDirty ? 'Há alterações não salvas.' : 'Adicione ou remova horários e salve.'}
          </Text>
          <AppButton
            variant="secondary"
            size="sm"
            leftIcon={<Trash2 className="h-4 w-4" />}
            style={{color: tintedTextColor('var(--danger)')}}
            disabled={!temHorarioNaAba}
            onClick={handleClearTab}
          >
            {contaSelecionada ? `Limpar horários de ${rotuloConta(contaSelecionada)}` : 'Limpar horários'}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}

/** Dia, horários e limite. No celular, o dia fica em cima dos horários. */
const LINHA_DIA =
  'grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-x-4 gap-y-2 px-4 sm:grid-cols-[9rem_minmax(0,1fr)_3rem]';

interface DayRowProps {
  day: Weekday;
  fimDeSemana: boolean;
  specificTimes: string[];
  fallbackTimes: string[];
  editando: boolean;
  onPending: (time: string) => void;
  onAdd: (time: string) => void;
  onRemove: (time: string) => void;
}

function DayRow({day, fimDeSemana, specificTimes, fallbackTimes, editando, onPending, onAdd, onRemove}: DayRowProps) {
  const [input, setInput] = useState('');
  const canAdd = specificTimes.length < MAX_TIMES_PER_DAY;
  const nome = NOME_DO_DIA[day];

  useEffect(() => {
    if (!editando) setInput('');
  }, [editando]);

  function handleAdd() {
    if (!input) return;
    onAdd(input);
    setInput('');
  }

  return (
    <li
      className={cn(
        LINHA_DIA,
        'border-b border-[var(--border-color)] py-2 last:border-b-0',
        fimDeSemana && 'bg-[var(--bg-primary)]',
      )}
    >
      <Text variant="body" as="span" className="col-span-2 sm:col-span-1">{nome}</Text>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {specificTimes.map(time => (
          <span
            key={time}
            className={cn(
              'inline-flex h-9 items-center gap-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] t-body font-semibold tabular-nums text-[var(--text-primary)]',
              editando ? 'pl-3' : 'px-3',
            )}
          >
            {time}
            {editando ? (
              <button
                type="button"
                onClick={() => onRemove(time)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                aria-label={`Remover ${time} de ${nome}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </span>
        ))}
        {specificTimes.length === 0 && fallbackTimes.map(time => (
          <span
            key={time}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-input)] border border-dashed border-[var(--border-strong)] px-3 t-body tabular-nums text-[var(--text-secondary)]"
            title="Do padrão geral"
          >
            {time}
            <Globe className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">(padrão geral)</span>
          </span>
        ))}
        {!editando && specificTimes.length === 0 && fallbackTimes.length === 0 ? (
          <Text variant="secondary" as="span" className="text-[var(--text-secondary)]">Nenhum horário</Text>
        ) : null}
        {editando && canAdd ? (
          <>
            <input
              type="time"
              value={input}
              onChange={event => {
                setInput(event.target.value);
                onPending(event.target.value);
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAdd();
                }
              }}
              aria-label={`Novo horário para ${nome}`}
              className="h-9 w-36 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 t-body tabular-nums text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            />
            <AppButton
              onClick={handleAdd}
              variant="secondary"
              size="xs"
              className="h-9"
              disabled={!input}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              aria-label={`Adicionar horário em ${nome}`}
            >
              Adicionar
            </AppButton>
          </>
        ) : null}
      </div>
      <Text variant="secondary" as="span" className="text-right tabular-nums text-[var(--text-secondary)]">
        {specificTimes.length}/{MAX_TIMES_PER_DAY}
      </Text>
    </li>
  );
}
