import { TextCount } from '../../../components/ui/TextCount';
import { SettingsSectionCard } from '../../../components/settings/SettingsSectionCard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  Copy,
  Layers,
  Palette,
  Plus,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { AppButton } from '../../../components/ui/AppButton';
import { DisclosureButton } from '../../../components/ui/DisclosureButton';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { TimeField } from '../../../components/ui/TimeField';
import type { Pilar, PilarPlataforma, Platform, PostingTimeEntry, Serie } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { generateUUID } from '../../../utils/uuid';
import { pilarPrincipalDaSerie } from '../../editorial/lib/pilarDaSerie';
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
import { PILAR_DEFAULT_COR, PILAR_DESCRICAO_MAX } from '../lib/pilarConstants';
import { EntityIdentity } from '../../../components/settings/EntityIdentity';
import { EntityColorPicker, entitySwatchInk } from './EntityColorPicker';
import { complementoDoRotulo, iconeDaConta, rotuloConta, rotuloDaRef } from '../../contas/lib/contas';
import { useAppContext } from '../../../context/AppContext';
import { useUnsavedChangesRegistration } from '../../../hooks/useUnsavedChangesRegistration';

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

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Text variant="label" className=" text-[var(--text-primary)]">
      {children}
      {required ? <span className="text-[var(--brand-accent-text)]"> *</span> : null}
    </Text>
  );
}

const inputClass =
  'ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 t-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

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
  pilares = [],
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
  pilares?: ReadonlyArray<Pick<Pilar, 'id' | 'nome'>>;
  onSave: (payload: PilarEditSavePayload) => void;
  onCancel: () => void;
  onChromeChange?: (state: PilarEditChromeState) => void;
  lastEditLabel?: string | null;
}) {
  const { state } = useAppContext();
  const referenciaId = state.editorial.redeReferenciaId;
  const seriePickerRef = useRef<HTMLDivElement>(null);
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
  const [trocaPilarPendente, setTrocaPilarPendente] = useState<{
    serieId: string;
    de: string;
    para: string;
  } | null>(null);
  const [contaAberta, setContaAberta] = useState<string | null>(
    platformNames.includes(referenciaId ?? '') ? referenciaId : platformNames[0] ?? null,
  );

  const nomeDoPilar = useCallback(
    (pilarId: string | null | undefined) => {
      if (!pilarId) return 'outro pilar';
      return pilares.find(item => item.id === pilarId)?.nome
        || (pilarId === form.id ? form.nome.trim() || 'este pilar' : 'outro pilar');
    },
    [form.id, form.nome, pilares],
  );

  const confirmarVinculo = (serieId: string) => {
    setLinkedSerieIds(previous => (previous.includes(serieId) ? previous : [...previous, serieId]));
    setTrocaPilarPendente(null);
    setShowSeriePicker(false);
  };

  const addSerie = (serieId: string) => {
    const serie = series.find(item => item.id === serieId);
    const principalAtual = serie ? pilarPrincipalDaSerie(serie) : null;
    if (principalAtual && principalAtual !== form.id) {
      setTrocaPilarPendente({
        serieId,
        de: nomeDoPilar(principalAtual),
        para: form.nome.trim() || 'este pilar',
      });
      setShowSeriePicker(false);
      return;
    }
    confirmarVinculo(serieId);
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
        frequenciaSemanal: initial.frequenciaSemanal ?? null,
        metaCiclo: initial.metaCiclo ?? null,
        plataformas: [
          ...platformNames.map(platformId => form.plataformas.find(item => item.platformId === platformId)),
          // Contas inativas não aparecem nas abas, mas o que já estava guardado nelas fica.
          ...form.plataformas.filter(item => !platformNames.includes(item.platformId)),
        ]
          .filter((item): item is PilarPlataforma => Boolean(item && shouldPersistPilarPlataforma(item)))
          .map(item => ({...item, hashtags: item.hashtags.trim()})),
        createdAt: initial.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      linkedSerieIds,
    });
  }, [form, initial.createdAt, initial.frequenciaSemanal, initial.metaCiclo, linkedSerieIds, onSave, platformNames]);

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

  useUnsavedChangesRegistration(isDirty, () => {
    if (canSave) handleSaveRef.current();
  });

  const copyHashtags = async (value: string) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative w-full">
      <Surface variant="info" padding="md" className="mb-3 w-full">
        <EntityIdentity
          name={form.nome.trim() || 'Novo pilar'}
          active={form.ativo}
          inactiveLabel="Inativo"
          icon={(
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: form.cor }}
            >
              <Palette className="h-4 w-4" strokeWidth={1.75} style={{ color: entitySwatchInk(form.cor) }} />
            </span>
          )}
        />
      </Surface>

      <div className="grid w-full grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.95fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <SettingsSectionCard padding="md" 
              title="Identidade"
              description="Como este pilar aparece na sua central."
            >
            <div className="stack-lg">
              <div className="stack-sm">
                <FieldLabel required>Nome</FieldLabel>
                <input
                  type="text"
                  aria-label="Nome do pilar"
                  value={form.nome}
                  onChange={event => setForm(previous => ({...previous, nome: event.target.value}))}
                  placeholder="Ex.: Humor"
                  className={inputClass}
                />
              </div>
              <div className="stack-sm">
                <FieldLabel>Descrição</FieldLabel>
                <textarea
                  aria-label="Descrição do pilar"
                  value={form.descricao}
                  onChange={event => setForm(previous => ({...previous, descricao: event.target.value}))}
                  maxLength={PILAR_DESCRICAO_MAX}
                  rows={3}
                  className={cn(inputClass, 'min-h-[88px] resize-y leading-relaxed')}
                />
                <TextCount value={form.descricao} limit={PILAR_DESCRICAO_MAX} />
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
          </SettingsSectionCard>

          <SettingsSectionCard padding="md" 
              title="Plataformas"
              description="Hashtags, dias e janela de publicação por conta."
            >
            {platformNames.length === 0 ? (
              <Text variant="meta" className="text-[var(--text-tertiary)]">
                Nenhuma conta ativa configurada.
              </Text>
            ) : (
              <div className="stack-sm">
                {platformNames.map(platformId => {
                  const conta = platforms.find(item => item.id === platformId);
                  const plataforma = getPilarPlataforma(platformId);
                  const aberta = contaAberta === platformId;
                  const painelId = `conta-pilar-${platformId}`;
                  const uuid = resolvePlatformUuid(platforms, platformId);
                  const temJanela = Boolean(plataforma.janelaHorarioInicio || plataforma.janelaHorarioFim);
                  const horarios = temJanela
                    ? formatCrossedPostingSummary(
                      plataforma,
                      postingTimeEntries,
                      uuid,
                      plataforma.melhoresDias.length > 0 ? plataforma.melhoresDias : WEEKDAYS_ORDERED,
                    )
                    : 'Defina uma janela para consultar os horários disponíveis.';
                  return (
                    <div key={platformId} className="rounded-[var(--radius-input)] border border-[var(--border-color)]">
                      <DisclosureButton
                        open={aberta}
                        onToggle={() => setContaAberta(atual => atual === platformId ? null : platformId)}
                        controls={painelId}
                      >
                        <PlatformIcon platform={conta ? iconeDaConta(conta) : platformId} className="h-4 w-4 shrink-0" />
                        <Text variant="body" as="span" className="min-w-0 truncate">
                          {conta ? rotuloConta(conta) : rotuloDaRef(platformId, platforms)}
                          {conta && complementoDoRotulo(conta) ? (
                            <span className="text-[var(--text-secondary)]">{` ${complementoDoRotulo(conta)}`}</span>
                          ) : null}
                        </Text>
                      </DisclosureButton>
                      {aberta ? (
                        <div id={painelId} className="stack-lg px-2 pb-3">
                          <div className="stack-sm">
                            <div className="flex items-center justify-between gap-2">
                              <FieldLabel>Hashtags</FieldLabel>
                              <AppButton
                                variant="secondary"
                                size="xs"
                                onClick={() => void copyHashtags(plataforma.hashtags)}
                                disabled={!plataforma.hashtags.trim()}
                                leftIcon={<Copy className="h-3.5 w-3.5" />}
                                aria-label={`Copiar hashtags de ${conta ? rotuloConta(conta) : platformId}`}
                              >
                                Copiar
                              </AppButton>
                            </div>
                            <input
                              type="text"
                              aria-label="Hashtags desta conta"
                              value={plataforma.hashtags}
                              onChange={event => updatePlatformHashtags(platformId, event.target.value)}
                              placeholder="#hashtag1 #hashtag2"
                              className={inputClass}
                            />
                          </div>
                          <div className="stack-sm">
                            <FieldLabel>Melhores dias</FieldLabel>
                            <div className="flex flex-wrap gap-2">
                              {WEEKDAYS_ORDERED.map(weekday => {
                                const selected = plataforma.melhoresDias.includes(weekday);
                                return (
                                  <button
                                    key={weekday}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => toggleMelhorDia(platformId, weekday)}
                                    className={cn(
                                      'inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2.5 t-label focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
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
                          </div>
                          <div className="stack-sm">
                            <FieldLabel>Janela de publicação</FieldLabel>
                            <div className="grid-form">
                              <TimeField
                                ariaLabel="Início da janela de publicação"
                                value={plataforma.janelaHorarioInicio ?? ''}
                                onChange={value => updatePilarPlataforma(platformId, { janelaHorarioInicio: value || null })}
                              />
                              <TimeField
                                ariaLabel="Fim da janela de publicação"
                                value={plataforma.janelaHorarioFim ?? ''}
                                onChange={value => updatePilarPlataforma(platformId, { janelaHorarioFim: value || null })}
                              />
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5 rounded-[var(--radius-input)] bg-[var(--bg-hover)] px-3 py-3">
                            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
                            <Text variant="meta" className="text-[var(--text-secondary)]">{horarios}</Text>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </SettingsSectionCard>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <SettingsSectionCard padding="md" 
              title="Séries vinculadas"
              description="Vincular aqui muda o pilar principal da série."
            >
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
                    className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 t-body-strong text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
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
          </SettingsSectionCard>
        </aside>
      </div>
      <ConfirmModal
        open={Boolean(trocaPilarPendente)}
        message={
          trocaPilarPendente
            ? `A série “${series.find(item => item.id === trocaPilarPendente.serieId)?.name ?? 'esta série'}” tem ${trocaPilarPendente.de} como pilar principal. Trocar para ${trocaPilarPendente.para}?`
            : ''
        }
        confirmLabel="Trocar pilar"
        cancelLabel="Manter"
        onConfirm={() => {
          if (trocaPilarPendente) confirmarVinculo(trocaPilarPendente.serieId);
        }}
        onCancel={() => setTrocaPilarPendente(null)}
      />
    </div>
  );
}
