import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Clock,
  Copy,
  Hash,
  Info,
  Layers,
  Pencil,
  Plus,
  Smile,
  Target,
  X,
} from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import type { Pilar, PilarPlataforma, Platform, PostingTimeEntry, Serie } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { generateUUID } from '../../../utils/uuid';
import {
  WEEKDAY_SHORT,
  WEEKDAYS_ORDERED,
  type Weekday,
} from '../lib/postingTimes';
import {
  createEmptyPilarPlataforma,
  formatCrossedPostingSummary,
  resolvePlatformUuid,
  shouldPersistPilarPlataforma,
} from '../lib/pilarPostingSchedule';
import {
  PILAR_COR_LABELS,
  PILAR_DEFAULT_COR,
  PILAR_DESCRICAO_MAX,
  PILAR_PRESET_CORES,
} from '../lib/pilarConstants';

type AccordionStep = 'identidade' | 'ritmo' | 'plataformas' | 'series';

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

function PlatformBrand({ platform, compact = false }: { platform: string; compact?: boolean }) {
  const normalized = platform.toLowerCase();
  const labelClass = 't-label font-bold text-white';
  const sizeClass = compact ? 'h-7 w-7' : 'h-9 w-9';
  if (normalized.includes('instagram')) {
    return (
      <span className={cn('flex shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]', sizeClass)}>
        <span className={labelClass}>IG</span>
      </span>
    );
  }
  if (normalized.includes('tiktok')) {
    return (
      <span className={cn('flex shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-[#111111]', sizeClass)}>
        <span className={labelClass}>TT</span>
      </span>
    );
  }
  if (normalized.includes('youtube')) {
    return (
      <span className={cn('flex shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-[#FF0000]', sizeClass)}>
        <span className={labelClass}>YT</span>
      </span>
    );
  }
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-[var(--bg-hover)]', sizeClass)}>
      <Text variant="label" className="font-bold text-[var(--text-secondary)]">
        {platform.slice(0, 2).toUpperCase()}
      </Text>
    </span>
  );
}

function AccordionSection({
  step,
  title,
  description,
  icon,
  open,
  onToggle,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Surface variant="outlined" padding="none" className="overflow-hidden bg-[var(--bg-secondary)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Text variant="meta" className="tabular-nums text-[var(--text-tertiary)]">
              {step}.
            </Text>
            <Text variant="label" className="font-semibold uppercase tracking-[0.06em] text-[var(--text-primary)]">
              {title}
            </Text>
          </div>
          {description ? (
            <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">
              {description}
            </Text>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'mt-1 h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {open ? <div className="border-t border-[var(--border-color)] px-4 py-4">{children}</div> : null}
    </Surface>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Text variant="label" className="mb-1.5 block font-medium text-[var(--text-primary)]">
      {children}
      {required ? <span className="text-[var(--accent-pink)]"> *</span> : null}
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
  const [openStep, setOpenStep] = useState<AccordionStep>('identidade');
  const seriePickerRef = useRef<HTMLDivElement>(null);

  const toggleStep = (step: AccordionStep) => {
    setOpenStep(current => (current === step ? current : step));
  };

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

  const updateFrequenciaSemanal = (value: string) => {
    const parsed = value.trim() === '' ? null : Number.parseInt(value, 10);
    const frequenciaSemanal = Number.isFinite(parsed) ? parsed : null;
    setForm(previous => ({ ...previous, frequenciaSemanal }));
  };

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
    updatePilarPlataforma(platformId, {hashtags: hashtags.trim()});
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
          .filter((item): item is PilarPlataforma => Boolean(item && shouldPersistPilarPlataforma(item))),
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

  const selectedColorLabel = PILAR_COR_LABELS[form.cor] || 'Personalizada';
  const showDirtyFooter = isDirty;

  return (
    <div className={cn('relative w-full', showDirtyFooter && 'pb-28')}>
      <Surface variant="outlined" padding="md" className="mb-3 w-full bg-[var(--bg-secondary)]">
        <div className="flex w-full items-start gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full md:h-16 md:w-16"
            style={{backgroundColor: form.cor}}
          >
            <Smile className="h-7 w-7 text-[var(--text-primary)] opacity-80 md:h-8 md:w-8" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <Text variant="pageTitle" className="min-w-0 break-words">
                {form.nome.trim() || 'Novo pilar'}
              </Text>
              <Pencil className="mt-1 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
            </div>
          </div>
        </div>
      </Surface>

      <div className="flex w-full flex-col gap-3">
        <AccordionSection
          step={1}
          title="Identidade"
          description="Defina os atributos que representam este pilar."
          icon={<Smile className="h-4 w-4" />}
          open={openStep === 'identidade'}
          onToggle={() => toggleStep('identidade')}
        >
          <div className="stack-lg">
            <div>
              <FieldLabel required>Nome</FieldLabel>
              <input
                type="text"
                value={form.nome}
                onChange={event => setForm(previous => ({...previous, nome: event.target.value}))}
                placeholder="Ex.: Humor"
                className={inputClass}
              />
            </div>

            <div>
              <FieldLabel>Cor</FieldLabel>
              <div className="flex flex-wrap items-center gap-2">
                {PILAR_PRESET_CORES.map(color => {
                  const selected = form.cor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm(previous => ({...previous, cor: color}))}
                      className={cn(
                        'relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                        selected ? 'border-[var(--text-primary)] scale-105' : 'border-transparent hover:scale-105',
                      )}
                      style={{backgroundColor: color}}
                      aria-label={`Cor ${PILAR_COR_LABELS[color] || color}`}
                    >
                      {selected ? <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" strokeWidth={3} /> : null}
                    </button>
                  );
                })}
              </div>
              <Text variant="meta" className="mt-1.5 text-[var(--text-tertiary)]">
                {selectedColorLabel}
              </Text>
            </div>

            <div>
              <FieldLabel>Descrição</FieldLabel>
              <textarea
                value={form.descricao}
                onChange={event =>
                  setForm(previous => ({
                    ...previous,
                    descricao: event.target.value.slice(0, PILAR_DESCRICAO_MAX),
                  }))
                }
                placeholder="Em que conteúdos aparece?"
                rows={3}
                className={cn(inputClass, 'min-h-[88px] resize-none leading-relaxed')}
              />
              <div className="mt-1 flex items-center justify-end">
                <Text variant="meta" className="shrink-0 tabular-nums text-[var(--text-tertiary)]">
                  {form.descricao.length}/{PILAR_DESCRICAO_MAX}
                </Text>
              </div>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          step={2}
          title="Ritmo editorial"
          description="Espaços deste pilar na semana."
          icon={<Target className="h-4 w-4" />}
          open={openStep === 'ritmo'}
          onToggle={() => toggleStep('ritmo')}
        >
            <div className="stack-lg">
              <div>
                <FieldLabel>Espaços por semana</FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={form.frequenciaSemanal ?? ''}
                  onChange={event => updateFrequenciaSemanal(event.target.value)}
                  placeholder="Ex.: 2"
                  className={inputClass}
                />
                <Text variant="meta" className="mt-1 text-[var(--text-tertiary)]">
                  Espaços deste pilar na semana. O total da semana é a soma dos pilares.
                </Text>
              </div>
            </div>
        </AccordionSection>

        <AccordionSection
          step={3}
          title="Plataformas"
          description="Hashtags, melhores dias e janela cruzada com os horários configurados."
          icon={<Hash className="h-4 w-4 text-[var(--accent-green)]" />}
          open={openStep === 'plataformas'}
          onToggle={() => toggleStep('plataformas')}
        >
            {platformNames.length === 0 ? (
              <Text variant="meta" className="text-[var(--text-tertiary)]">
                Nenhuma plataforma ativa configurada.
              </Text>
            ) : (
              <div className="stack-xl">
                {platformNames.map(platform => {
                  const plataforma = getPilarPlataforma(platform);
                  const platformUuid = resolvePlatformUuid(platforms, platform);
                  const previewDays =
                    plataforma.melhoresDias.length > 0 ? plataforma.melhoresDias : WEEKDAYS_ORDERED;
                  const summary = formatCrossedPostingSummary(
                    plataforma,
                    postingTimeEntries,
                    platformUuid,
                    previewDays,
                  );

                  return (
                    <div
                      key={platform}
                      className="rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] p-3"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <PlatformBrand platform={platform} compact />
                        <Text variant="meta" className="font-medium text-[var(--text-primary)]">
                          {platform}
                        </Text>
                      </div>

                      <div className="stack-md">
                        <div>
                          <FieldLabel>Hashtags</FieldLabel>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={plataforma.hashtags}
                              onChange={event => updatePlatformHashtags(platform, event.target.value)}
                              placeholder="#hashtag1 #hashtag2"
                              className={inputClass}
                            />
                            <button
                              type="button"
                              onClick={() => void copyHashtags(plataforma.hashtags)}
                              disabled={!plataforma.hashtags.trim()}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                              aria-label={`Copiar hashtags de ${platform}`}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <FieldLabel>Melhores dias</FieldLabel>
                          <div className="flex flex-wrap gap-1.5">
                            {WEEKDAYS_ORDERED.map(weekday => {
                              const selected = plataforma.melhoresDias.includes(weekday);
                              return (
                                <button
                                  key={`${platform}-${weekday}`}
                                  type="button"
                                  onClick={() => toggleMelhorDia(platform, weekday)}
                                  className={cn(
                                    'rounded-[var(--radius-pill)] border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                                    selected
                                      ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                                      : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]',
                                  )}
                                >
                                  {WEEKDAY_SHORT[weekday]}
                                </button>
                              );
                            })}
                          </div>
                          <Text variant="meta" className="mt-1 text-[var(--text-tertiary)]">
                            Vazio = todos os dias com horário configurado.
                          </Text>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <FieldLabel>Janela início</FieldLabel>
                            <input
                              type="time"
                              value={plataforma.janelaHorarioInicio ?? ''}
                              onChange={event =>
                                updatePilarPlataforma(platform, {
                                  janelaHorarioInicio: event.target.value || null,
                                })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <FieldLabel>Janela fim</FieldLabel>
                            <input
                              type="time"
                              value={plataforma.janelaHorarioFim ?? ''}
                              onChange={event =>
                                updatePilarPlataforma(platform, {
                                  janelaHorarioFim: event.target.value || null,
                                })
                              }
                              className={inputClass}
                            />
                          </div>
                        </div>

                        <div className="rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2.5">
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                            <Text variant="label" className="text-[var(--text-tertiary)]">
                              Cruzamento com horários
                            </Text>
                          </div>
                          <Text variant="meta" className="text-[var(--text-secondary)]">
                            {summary}
                          </Text>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </AccordionSection>

        <AccordionSection
          step={4}
          title="Séries vinculadas"
          description="Associe séries editoriais a este pilar."
          icon={<Layers className="h-4 w-4" />}
          open={openStep === 'series'}
          onToggle={() => toggleStep('series')}
        >
            <div className="flex flex-col items-start gap-2">
              {linkedSeries.map(item => (
                <span
                  key={item.id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--border-color)] bg-[var(--bg-hover)] py-1 pl-3 pr-1.5 text-sm font-medium text-[var(--text-primary)]"
                >
                  <span className="min-w-0 break-words">{item.name}</span>
                  <button
                    type="button"
                    onClick={() => setLinkedSerieIds(previous => previous.filter(id => id !== item.id))}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    aria-label={`Remover ${item.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {availableSeries.length > 0 ? (
                <div ref={seriePickerRef} className="relative w-full">
                  <button
                    type="button"
                    onClick={() => setShowSeriePicker(previous => !previous)}
                    className="inline-flex min-h-[2rem] w-full items-center justify-center gap-1 rounded-[var(--radius-pill)] border border-dashed border-[var(--border-strong)] px-3 py-1 font-medium text-[var(--text-secondary)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <Text variant="meta" className="font-medium">
                      Vincular série
                    </Text>
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
            </div>
        </AccordionSection>
      </div>

      {showDirtyFooter ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 pb-safe">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex min-w-0 items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
              <div className="min-w-0">
                <Text variant="bodyStrong">Alterações não salvas</Text>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <AppButton variant="secondary" size="sm" onClick={onCancel}>
                Cancelar
              </AppButton>
              <AppButton variant="primary" size="sm" onClick={handleSave} disabled={!canSave}>
                Salvar alterações
              </AppButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
