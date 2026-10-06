import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Clock,
  Copy,
  Layers,
  Plus,
  Smile,
  X,
} from 'lucide-react';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import type { Pilar, PilarPlataforma, Platform, PostingTimeEntry, Serie } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { generateUUID } from '../../../utils/uuid';
import {
  WEEKDAYS_ORDERED,
  type Weekday,
} from '../lib/postingTimes';
import {
  createEmptyPilarPlataforma,
  formatCrossedPostingSummary,
  resolvePlatformUuid,
  shouldPersistPilarPlataforma,
} from '../lib/pilarPostingSchedule';
import { PILAR_DEFAULT_COR } from '../lib/pilarConstants';
import { EntityColorPicker, entitySwatchInk } from './EntityColorPicker';

const PILAR_QUICK_COLORS = ['#F5C543', '#FB923C', '#EF4444', '#9065B0', '#4A90D9', '#4ADE80'];

const DAY_LABEL: Record<Weekday, string> = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
  0: 'Dom',
};

export type PilarEditSavePayload = {
  pilar: Pilar;
  linkedSerieIds: string[];
};

export type PilarEditChromeState = {
  isDirty: boolean;
  canSave: boolean;
  handleSave: () => void;
  handleCancel: () => void;
};

function PlatformBrand({ platform }: { platform: string }) {
  const gradientId = useId().replace(/:/g, '');
  const normalized = platform.toLowerCase();
  if (normalized.includes('instagram')) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#FEDA75" />
            <stop offset="0.5" stopColor="#D62976" />
            <stop offset="1" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill={`url(#${gradientId})`} />
        <rect x="7" y="7" width="10" height="10" rx="3" fill="none" stroke="#fff" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="2.2" fill="none" stroke="#fff" strokeWidth="1.6" />
        <circle cx="16.2" cy="7.9" r="0.9" fill="#fff" />
      </svg>
    );
  }
  if (normalized.includes('tiktok')) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
        <rect width="24" height="24" rx="6" fill="#111111" />
        <path
          fill="#fff"
          d="M14.2 6.2c.4 1.7 1.5 2.8 3.2 3.1v2.1c-1.1.1-2.1-.2-3.2-.9v4.4c0 2.6-2 4.6-4.7 4.6S4.8 17.5 4.8 14.9s2.1-4.6 4.7-4.6c.3 0 .6 0 .9.1v2.2c-.3-.1-.6-.2-.9-.2-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5V6.2h2.2z"
        />
      </svg>
    );
  }
  if (normalized.includes('youtube')) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
        <rect width="24" height="24" rx="6" fill="#FF0000" />
        <path fill="#fff" d="M10 8.5v7l6-3.5-6-3.5z" />
      </svg>
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-hover)]">
      <Text variant="label" className="font-bold text-[var(--text-secondary)]">
        {platform.slice(0, 2).toUpperCase()}
      </Text>
    </span>
  );
}

function CardHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <Text variant="itemTitle">{title}</Text>
      {description ? (
        <Text variant="meta" className="mt-1 block text-[var(--text-secondary)]">
          {description}
        </Text>
      ) : null}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Text variant="label" className="font-medium text-[var(--text-primary)]">
      {children}
      {required ? <span className="text-[var(--brand-accent-strong)]"> *</span> : null}
    </Text>
  );
}

const inputClass =
  'ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

type PilarFormState = Pick<
  Pilar,
  | 'id'
  | 'userId'
  | 'nome'
  | 'descricao'
  | 'cor'
  | 'ativo'
  | 'frequenciaSemanal'
  | 'metaCiclo'
  | 'plataformas'
>;

function SeriePickerMenu({
  series,
  onSelect,
}: {
  series: Serie[];
  onSelect: (serieId: string) => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-72 w-full min-w-0 overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] py-1.5 shadow-[var(--shadow-dropdown)]">
      {series.map(item => (
        <button
          key={item.id}
          type="button"
          className="flex w-full min-h-[2.75rem] items-center px-4 py-2.5 text-left hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          onClick={() => onSelect(item.id)}
        >
          <Text variant="meta" className="leading-snug text-[var(--text-primary)]">
            {item.name}
          </Text>
        </button>
      ))}
    </div>
  );
}

export function PilarEditForm({
  initial,
  platformNames,
  series,
  postingTimeEntries,
  platforms,
  initialLinkedSerieIds,
  onSave,
  onCancel,
  onChromeChange,
  lastEditLabel = null,
}: {
  initial: Partial<Pilar>;
  platformNames: string[];
  series: Serie[];
  postingTimeEntries: PostingTimeEntry[];
  platforms: Platform[];
  initialLinkedSerieIds: string[];
  onSave: (payload: PilarEditSavePayload) => void;
  onCancel: () => void;
  onChromeChange?: (state: PilarEditChromeState) => void;
  lastEditLabel?: string | null;
}) {
  const normalizePlataformas = (items: PilarPlataforma[] = []) =>
    items.map(item => ({
      ...createEmptyPilarPlataforma(item.pilarId, item.platformId),
      ...item,
      hashtags: item.hashtags || '',
      melhoresDias: item.melhoresDias ?? [],
    }));

  const initialSnapshot = useRef<{
    form: PilarFormState;
    linkedSerieIds: string[];
  }>({
    form: {
      id: initial.id || generateUUID(),
      userId: initial.userId || '',
      nome: initial.nome || '',
      descricao: initial.descricao || '',
      cor: initial.cor || PILAR_DEFAULT_COR,
      ativo: initial.ativo ?? true,
      frequenciaSemanal: initial.frequenciaSemanal ?? null,
      metaCiclo: initial.metaCiclo ?? null,
      plataformas: normalizePlataformas(initial.plataformas),
    },
    linkedSerieIds: [...initialLinkedSerieIds],
  });
  const [form, setForm] = useState(initialSnapshot.current.form);
  const [linkedSerieIds, setLinkedSerieIds] = useState<string[]>(initialSnapshot.current.linkedSerieIds);
  const [showSeriePicker, setShowSeriePicker] = useState(false);
  const [activePlatform, setActivePlatform] = useState(platformNames[0] ?? '');
  const seriePickerRef = useRef<HTMLDivElement>(null);
  const selectedPlatform = platformNames.includes(activePlatform) ? activePlatform : platformNames[0] ?? '';

  const addSerie = (serieId: string) => {
    setLinkedSerieIds(previous => [...previous, serieId]);
    setShowSeriePicker(false);
  };

  useEffect(() => {
    if (!showSeriePicker) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (seriePickerRef.current?.contains(event.target as Node)) return;
      setShowSeriePicker(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showSeriePicker]);

  const linkedSeries = useMemo(
    () => linkedSerieIds.map(id => series.find(item => item.id === id)).filter(Boolean) as Serie[],
    [linkedSerieIds, series],
  );

  const availableSeries = useMemo(
    () => series.filter(item => !linkedSerieIds.includes(item.id)),
    [linkedSerieIds, series],
  );

  const isDirty = useMemo(() => {
    const snap = initialSnapshot.current;
    if (form.nome !== snap.form.nome) return true;
    if (form.descricao !== snap.form.descricao) return true;
    if (form.cor !== snap.form.cor) return true;
    if (form.frequenciaSemanal !== snap.form.frequenciaSemanal) return true;
    if (JSON.stringify(form.plataformas) !== JSON.stringify(snap.form.plataformas)) return true;
    if (linkedSerieIds.length !== snap.linkedSerieIds.length) return true;
    return linkedSerieIds.some((id, index) => id !== snap.linkedSerieIds[index]);
  }, [form, linkedSerieIds]);

  const canSave = Boolean(form.nome.trim());

  const getPilarPlataforma = useCallback(
    (platformId: string): PilarPlataforma => {
      return (
        form.plataformas.find(item => item.platformId === platformId) ??
        createEmptyPilarPlataforma(form.id, platformId)
      );
    },
    [form.id, form.plataformas],
  );

  const updatePilarPlataforma = useCallback(
    (platformId: string, updates: Partial<PilarPlataforma>) => {
      const current = [...form.plataformas];
      const index = current.findIndex(item => item.platformId === platformId);
      const base = index >= 0 ? current[index] : createEmptyPilarPlataforma(form.id, platformId);
      const next = {...base, ...updates};

      if (!shouldPersistPilarPlataforma(next)) {
        if (index >= 0) current.splice(index, 1);
      } else if (index >= 0) {
        current[index] = next;
      } else {
        current.push(next);
      }

      setForm(previous => ({...previous, plataformas: current}));
    },
    [form.id, form.plataformas],
  );

  const updatePlatformHashtags = (platformId: string, hashtags: string) => {
    updatePilarPlataforma(platformId, {hashtags});
  };

  const adjustFrequencia = (delta: number) => {
    setForm(previous => {
      const current = previous.frequenciaSemanal;
      if (current == null) {
        if (delta < 0) return previous;
        return {...previous, frequenciaSemanal: 1};
      }
      const next = Math.min(99, Math.max(0, current + delta));
      return {...previous, frequenciaSemanal: next};
    });
  };

  const toggleMelhorDia = (platformId: string, weekday: Weekday) => {
    const existing = getPilarPlataforma(platformId);
    const melhoresDias = existing.melhoresDias.includes(weekday)
      ? existing.melhoresDias.filter(day => day !== weekday)
      : [...existing.melhoresDias, weekday].sort((left, right) => left - right);
    updatePilarPlataforma(platformId, {melhoresDias});
  };

  const handleSave = useCallback(() => {
    if (!form.nome.trim()) return;

    onSave({
      pilar: {
        id: form.id,
        userId: form.userId,
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        cor: form.cor,
        ativo: form.ativo,
        frequenciaSemanal: form.frequenciaSemanal,
        metaCiclo: form.metaCiclo,
        plataformas: platformNames
          .map(platformId => form.plataformas.find(item => item.platformId === platformId))
          .filter((item): item is PilarPlataforma => Boolean(item && shouldPersistPilarPlataforma(item)))
          .map(item => ({...item, hashtags: item.hashtags.trim()})),
        createdAt: initial.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      linkedSerieIds,
    });
  }, [form, initial.createdAt, linkedSerieIds, onSave, platformNames]);

  const onChromeChangeRef = useRef(onChromeChange);
  const handleSaveRef = useRef(handleSave);
  const onCancelRef = useRef(onCancel);
  onChromeChangeRef.current = onChromeChange;
  handleSaveRef.current = handleSave;
  onCancelRef.current = onCancel;

  useEffect(() => {
    onChromeChangeRef.current?.({
      isDirty,
      canSave,
      handleSave: () => handleSaveRef.current(),
      handleCancel: () => onCancelRef.current(),
    });
  }, [isDirty, canSave]);

  const copyHashtags = async (value: string) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  const activePlataforma = selectedPlatform ? getPilarPlataforma(selectedPlatform) : null;
  const activePlatformUuid = selectedPlatform ? resolvePlatformUuid(platforms, selectedPlatform) : null;
  const hasWindow = Boolean(activePlataforma?.janelaHorarioInicio || activePlataforma?.janelaHorarioFim);
  const scheduleHint = activePlataforma && hasWindow
    ? formatCrossedPostingSummary(
        activePlataforma,
        postingTimeEntries,
        activePlatformUuid,
        activePlataforma.melhoresDias.length > 0 ? activePlataforma.melhoresDias : WEEKDAYS_ORDERED,
      )
    : 'Defina uma janela para consultar os horários disponíveis.';

  return (
    <div className="relative w-full">
      <Surface variant="outlined" padding="md" className="mb-3 w-full">
        <div className="flex w-full items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{backgroundColor: form.cor}}
          >
            <Smile className="h-5 w-5" strokeWidth={1.75} style={{color: entitySwatchInk(form.cor)}} />
          </span>
          <Text variant="itemTitle" className="min-w-0 break-words">
            {form.nome.trim() || 'Novo pilar'}
          </Text>
        </div>
      </Surface>

      <div className="grid w-full grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.95fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <Surface variant="outlined" padding="md">
            <CardHeading
              title="Identidade"
              description="Como este pilar aparece na sua central."
            />
            <div className="stack-lg">
              <div className="stack-sm">
                <FieldLabel required>Nome</FieldLabel>
                <input
                  type="text"
                  value={form.nome}
                  onChange={event => setForm(previous => ({...previous, nome: event.target.value}))}
                  placeholder="Ex.: Humor"
                  className={inputClass}
                />
              </div>
              <div className="stack-sm">
                <FieldLabel>Cor do pilar</FieldLabel>
                <EntityColorPicker
                  variant="inline"
                  caption="name"
                  swatches={PILAR_QUICK_COLORS}
                  value={form.cor}
                  onChange={cor => setForm(previous => ({...previous, cor}))}
                />
              </div>
            </div>
          </Surface>

          <Surface variant="outlined" padding="md">
            <CardHeading
              title="Plataformas"
              description="Hashtags, dias e janela de publicação por plataforma."
            />
            {platformNames.length === 0 || !activePlataforma || !selectedPlatform ? (
              <Text variant="meta" className="text-[var(--text-tertiary)]">
                Nenhuma plataforma ativa configurada.
              </Text>
            ) : (
              <div className="stack-lg">
                <div className="flex gap-4 border-b border-[var(--border-color)]" role="tablist" aria-label="Plataformas">
                  {platformNames.map(platform => {
                    const selected = platform === selectedPlatform;
                    return (
                      <button
                        key={platform}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setActivePlatform(platform)}
                        className={cn(
                          '-mb-px inline-flex items-center gap-2 border-b-2 pb-2 text-sm font-medium focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                          selected
                            ? 'border-[var(--brand-accent-strong)] text-[var(--text-primary)]'
                            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                        )}
                      >
                        <PlatformBrand platform={platform} />
                        {platform}
                      </button>
                    );
                  })}
                </div>

                <div className="stack-sm">
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel>Hashtags</FieldLabel>
                    <button
                      type="button"
                      onClick={() => void copyHashtags(activePlataforma.hashtags)}
                      disabled={!activePlataforma.hashtags.trim()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      aria-label={`Copiar hashtags de ${selectedPlatform}`}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={activePlataforma.hashtags}
                    onChange={event => updatePlatformHashtags(selectedPlatform, event.target.value)}
                    placeholder="#hashtag1 #hashtag2"
                    className={inputClass}
                  />
                  <Text variant="meta" className="text-[var(--text-tertiary)]">
                    Separe as hashtags com espaço.
                  </Text>
                </div>

                <div className="stack-sm">
                  <FieldLabel>Melhores dias</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS_ORDERED.map(weekday => {
                      const selected = activePlataforma.melhoresDias.includes(weekday);
                      return (
                        <button
                          key={weekday}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleMelhorDia(selectedPlatform, weekday)}
                          className={cn(
                            'inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                            selected
                              ? 'border-[var(--text-primary)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
                              : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                          )}
                        >
                          {DAY_LABEL[weekday]}
                        </button>
                      );
                    })}
                  </div>
                  <Text variant="meta" className="text-[var(--text-tertiary)]">
                    Sem seleção: todos os dias com horário configurado.
                  </Text>
                </div>

                <div className="stack-sm">
                  <FieldLabel>Janela de publicação</FieldLabel>
                  <div className="grid-form">
                    <div className="stack-sm">
                      <Text variant="meta" className="text-[var(--text-secondary)]">Início</Text>
                      <input
                        type="time"
                        aria-label="Início da janela de publicação"
                        value={activePlataforma.janelaHorarioInicio ?? ''}
                        onChange={event =>
                          updatePilarPlataforma(selectedPlatform, {
                            janelaHorarioInicio: event.target.value || null,
                          })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div className="stack-sm">
                      <Text variant="meta" className="text-[var(--text-secondary)]">Fim</Text>
                      <input
                        type="time"
                        aria-label="Fim da janela de publicação"
                        value={activePlataforma.janelaHorarioFim ?? ''}
                        onChange={event =>
                          updatePilarPlataforma(selectedPlatform, {
                            janelaHorarioFim: event.target.value || null,
                          })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-[var(--radius-input)] bg-[var(--bg-hover)] px-3 py-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
                  <div className="min-w-0">
                    <Text variant="bodyStrong">Horários disponíveis</Text>
                    <Text variant="meta" className="mt-1 block text-[var(--text-secondary)]">
                      {scheduleHint}
                    </Text>
                  </div>
                </div>

                <Text variant="meta" className="text-[var(--text-tertiary)]">
                  As preferências são salvas separadamente para cada plataforma.
                </Text>
              </div>
            )}
          </Surface>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <Surface variant="outlined" padding="md">
            <CardHeading
              title="Ritmo editorial"
              description="Espaços deste pilar na semana."
            />
            <div className="stack-sm">
              <FieldLabel>Espaços por semana</FieldLabel>
              <div className="inline-flex items-stretch overflow-hidden rounded-[var(--radius-input)] border border-[var(--border-color)]">
                <button
                  type="button"
                  aria-label="Diminuir espaços por semana"
                  onClick={() => adjustFrequencia(-1)}
                  className="inline-flex h-10 w-10 items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  −
                </button>
                <span className="inline-flex h-10 min-w-10 items-center justify-center border-x border-[var(--border-color)] px-2 text-sm text-[var(--text-primary)]">
                  {form.frequenciaSemanal ?? 0}
                </span>
                <button
                  type="button"
                  aria-label="Aumentar espaços por semana"
                  onClick={() => adjustFrequencia(1)}
                  className="inline-flex h-10 w-10 items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  +
                </button>
              </div>
              <Text variant="meta" className="text-[var(--text-tertiary)]">
                O total da semana é a soma dos espaços de todos os pilares.
              </Text>
            </div>
          </Surface>

          <Surface variant="outlined" padding="md">
            <CardHeading
              title="Séries vinculadas"
              description="Séries associadas a este pilar."
            />
            <div className="stack-md">
              {linkedSeries.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-[var(--radius-input)] border border-[var(--border-color)] px-3 py-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                    <Layers className="h-4 w-4" />
                  </span>
                  <Text variant="body" className="min-w-0 flex-1 break-words">
                    {item.name}
                  </Text>
                  <button
                    type="button"
                    onClick={() => setLinkedSerieIds(previous => previous.filter(id => id !== item.id))}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    aria-label={`Remover ${item.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {availableSeries.length > 0 ? (
                <div ref={seriePickerRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSeriePicker(previous => !previous)}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <Plus className="h-4 w-4" />
                    Vincular série
                  </button>
                  {showSeriePicker ? (
                    <SeriePickerMenu series={availableSeries} onSelect={addSerie} />
                  ) : null}
                </div>
              ) : null}
              {linkedSeries.length === 0 && availableSeries.length === 0 ? (
                <Text variant="meta" className="text-[var(--text-tertiary)]">
                  Nenhuma série disponível para vincular.
                </Text>
              ) : null}
              {lastEditLabel ? (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                  <Text variant="meta" className="text-[var(--text-tertiary)]">
                    {lastEditLabel}
                  </Text>
                </div>
              ) : null}
            </div>
          </Surface>
        </aside>
      </div>
    </div>
  );
}
