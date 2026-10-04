import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  FileText,
  Hash,
  Info,
  Layers,
  Pencil,
  Smile,
} from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { CoverUploadField } from '../../library/components/CoverUploadField';
import type { Content, Pilar, Serie } from '../../../lib/database';
import { SerieProductionMetricsPanel } from './SerieProductionMetricsPanel';
import { TemplatesSettingsPage } from '../pages/TemplatesSettingsPage';
import { cn } from '../../../lib/utils';
import { generateUUID } from '../../../utils/uuid';
import { ChoiceChips } from '../../editorial/components/ChoiceChips';
import { OpenInfoNotice } from '../../editorial/components/OpenInfoNotice';
import {
  collectFormatoSuggestions,
  ENERGIA_LABELS,
  ENERGIA_NIVEIS,
  FREQUENCIAS_SERIE,
} from '../../editorial/lib/editorialOptions';
import { getSerieOpenItems } from '../../editorial/lib/serieCompleteness';
import type { FuncaoPadraoSerie } from '../../../lib/database';
import { FUNCAO_DESCRICOES, FUNCAO_LABELS, FUNCOES } from '../../editorial/lib/funcoes';
import {
  PILAR_COR_LABELS,
  PILAR_PRESET_CORES,
} from '../lib/pilarConstants';

const SERIE_DEFAULT_COR = '#6366f1';

const FUNCAO_OPTIONS: Array<{ value: FuncaoPadraoSerie; label: string; description: string }> = [
  ...FUNCOES.map(value => ({
    value,
    label: FUNCAO_LABELS[value],
    description: FUNCAO_DESCRICOES[value],
  })),
  { value: 'varia', label: 'Varia por conteúdo', description: 'Cada roteiro escolhe a sua.' },
];

export type SerieEditChromeState = {
  isDirty: boolean;
  canSave: boolean;
  handleSave: () => void;
  handleCancel: () => void;
};

function serieSlugFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'serie';
}

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

function SectionHeader({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', compact ? 'mb-3' : 'mb-4')}>
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)]',
            compact ? 'h-8 w-8' : 'h-9 w-9',
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <Text variant="label" className="font-semibold uppercase tracking-[0.06em] text-[var(--text-primary)]">
            {title}
          </Text>
          {description ? (
            <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">
              {description}
            </Text>
          ) : null}
        </div>
      </div>
      {action}
    </div>
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

export function SerieEditForm({
  initial,
  platformNames,
  pilares,
  contents = [],
  onSave,
  onCancel,
  onChromeChange,
  usedFormatoValues = [],
  showOpenInfoNotice = false,
}: {
  initial: Partial<Serie>;
  platformNames: string[];
  pilares: Pilar[];
  contents?: Content[];
  onSave: (serie: Serie) => void;
  onCancel: () => void;
  onChromeChange?: (state: SerieEditChromeState) => void;
  usedFormatoValues?: Array<string | null | undefined>;
  showOpenInfoNotice?: boolean;
}) {
  const initialSnapshot = useRef({
    form: {
      id: initial.id || generateUUID(),
      userId: initial.userId || '',
      name: initial.name || '',
      template: initial.template || '',
      notes: initial.notes || '',
      slotPadrao: initial.slotPadrao || null,
      formatoVisualPadrao: initial.formatoVisualPadrao || null,
      estruturaRoteiro: initial.estruturaRoteiro || '',
      bordao: initial.bordao || '',
      cor: initial.cor || SERIE_DEFAULT_COR,
      capaUrl: initial.capaUrl || '',
      ativa: initial.ativa ?? true,
      frequenciaRecomendada: initial.frequenciaRecomendada || '',
      funcaoPadrao: initial.funcaoPadrao || null,
      energiaPadrao: initial.energiaPadrao || null,
      plataformas: initial.plataformas || [],
    },
    linkedPilarIds: [...(initial.pilarIds || [])],
  });

  const [form, setForm] = useState(initialSnapshot.current.form);
  const [linkedPilarIds, setLinkedPilarIds] = useState<string[]>(initialSnapshot.current.linkedPilarIds);

  const isDirty = useMemo(() => {
    const snap = initialSnapshot.current;
    if (form.name !== snap.form.name) return true;
    if (form.bordao !== snap.form.bordao) return true;
    if (form.cor !== snap.form.cor) return true;
    if (form.capaUrl !== snap.form.capaUrl) return true;
    if (form.estruturaRoteiro !== snap.form.estruturaRoteiro) return true;
    if (form.frequenciaRecomendada !== snap.form.frequenciaRecomendada) return true;
    if (form.formatoVisualPadrao !== snap.form.formatoVisualPadrao) return true;
    if (form.funcaoPadrao !== snap.form.funcaoPadrao) return true;
    if (form.energiaPadrao !== snap.form.energiaPadrao) return true;
    if (JSON.stringify(form.plataformas) !== JSON.stringify(snap.form.plataformas)) return true;
    if (linkedPilarIds.length !== snap.linkedPilarIds.length) return true;
    return linkedPilarIds.some((id, index) => id !== snap.linkedPilarIds[index]);
  }, [form, linkedPilarIds]);

  const canSave = Boolean(form.name.trim());

  const updatePlatformHashtags = (platformId: string, hashtags: string) => {
    const current = [...form.plataformas];
    const index = current.findIndex(item => item.platformId === platformId);

    if (!hashtags.trim()) {
      if (index >= 0) current.splice(index, 1);
    } else if (index >= 0) {
      current[index] = {...current[index], hashtags: hashtags.trim()};
    } else {
      current.push({serieId: form.id, platformId, hashtags: hashtags.trim()});
    }

    setForm(previous => ({...previous, plataformas: current}));
  };

  const handleSave = useCallback(() => {
    if (!form.name.trim()) return;

    onSave({
      id: form.id,
      userId: form.userId,
      name: form.name.trim(),
      template: form.template,
      notes: form.notes,
      slotPadrao: form.slotPadrao,
      formatoVisualPadrao: form.formatoVisualPadrao,
      estruturaRoteiro: form.estruturaRoteiro.trim() || null,
      bordao: form.bordao.trim() || null,
      cor: form.cor,
      capaUrl: form.capaUrl.trim() || null,
      ativa: form.ativa,
      frequenciaRecomendada: form.frequenciaRecomendada.trim() || null,
      funcaoPadrao: form.funcaoPadrao,
      energiaPadrao: form.energiaPadrao,
      pilarIds: linkedPilarIds,
      plataformas: platformNames
        .map(platformId => form.plataformas.find(item => item.platformId === platformId))
        .filter((item): item is NonNullable<typeof item> => Boolean(item?.hashtags.trim())),
      createdAt: initial.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [form, initial.createdAt, linkedPilarIds, onSave, platformNames]);

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

  const slug = serieSlugFromName(form.name || 'serie');
  const selectedColorLabel = PILAR_COR_LABELS[form.cor] || 'Personalizada';
  const coverPreview = /^https?:\/\//i.test(form.capaUrl.trim()) ? form.capaUrl.trim() : '';
  const serieForMetrics: Serie | null = initial.id
    ? {
        id: form.id,
        userId: form.userId,
        name: form.name,
        template: form.template,
        notes: form.notes,
        slotPadrao: form.slotPadrao,
        formatoVisualPadrao: form.formatoVisualPadrao,
        estruturaRoteiro: form.estruturaRoteiro.trim() || null,
        bordao: form.bordao.trim() || null,
        cor: form.cor,
        capaUrl: form.capaUrl.trim() || null,
        ativa: form.ativa,
        frequenciaRecomendada: form.frequenciaRecomendada.trim() || null,
        funcaoPadrao: form.funcaoPadrao,
        energiaPadrao: form.energiaPadrao,
        pilarIds: linkedPilarIds,
        plataformas: form.plataformas,
        createdAt: initial.createdAt || new Date().toISOString(),
        updatedAt: initial.updatedAt || new Date().toISOString(),
      }
    : null;

  return (
    <div className={cn('relative w-full', isDirty && 'pb-28')}>
      {showOpenInfoNotice ? (
        <OpenInfoNotice
          items={getSerieOpenItems({
            pilarIds: linkedPilarIds,
            funcaoPadrao: form.funcaoPadrao,
            frequenciaRecomendada: form.frequenciaRecomendada,
            formatoVisualPadrao: form.formatoVisualPadrao,
            energiaPadrao: form.energiaPadrao,
          })}
          className="mb-3"
        />
      ) : null}
      <Surface variant="outlined" padding="md" className="mb-3 w-full bg-[var(--bg-secondary)]">
        <div className="flex w-full items-center gap-4">
          {coverPreview ? (
            <img
              src={coverPreview}
              alt=""
              className="h-14 w-14 shrink-0 rounded-[var(--radius-card)] object-cover md:h-16 md:w-16"
            />
          ) : (
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full md:h-16 md:w-16"
              style={{backgroundColor: form.cor}}
            >
              <Layers className="h-7 w-7 text-[var(--text-primary)] opacity-80 md:h-8 md:w-8" strokeWidth={1.5} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <Text variant="pageTitle" className="min-w-0 break-words">
                {form.name.trim() || 'Nova série'}
              </Text>
              <Pencil className="mt-1 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
            </div>
            <span className="mt-1.5 inline-flex max-w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-2 py-0.5">
              <Text variant="meta" className="break-all font-mono text-[var(--text-secondary)]">
                ID: {slug}
              </Text>
            </span>
          </div>
        </div>
      </Surface>

      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] md:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <Surface variant="outlined" padding="md" className="bg-[var(--bg-secondary)]">
            <SectionHeader
              icon={<Smile className="h-4 w-4" />}
              title="Identidade"
              description="Defina os atributos que representam esta série."
              compact
            />

            <div className="stack-lg">
              <div>
                <FieldLabel required>Nome</FieldLabel>
                <input
                  type="text"
                  value={form.name}
                  onChange={event => setForm(previous => ({...previous, name: event.target.value}))}
                  placeholder="Ex.: Destrinchando"
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel>Bordão</FieldLabel>
                <input
                  type="text"
                  value={form.bordao}
                  onChange={event => setForm(previous => ({...previous, bordao: event.target.value}))}
                  placeholder="Ex.: vamos destrinchar isso"
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

              <CoverUploadField
                value={form.capaUrl}
                onChange={capaUrl => setForm(previous => ({...previous, capaUrl}))}
                itemId={form.id}
                title={form.name.trim() || 'Série'}
                typeLabel="Série"
                description="Opcional. Envie uma imagem ou cole um link."
                compact
                plain
                urlAlwaysVisible
              />
            </div>
          </Surface>

          <Surface variant="outlined" padding="md" className="bg-[var(--bg-secondary)]">
            <SectionHeader
              icon={<Layers className="h-4 w-4" />}
              title="Estratégia"
              description="Defina os padrões que orientam os novos roteiros."
              compact
            />

            <div className="stack-lg">
              <div>
                <FieldLabel>Pilares</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {pilares.filter(item => item.ativo).map(item => {
                    const selected = linkedPilarIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setLinkedPilarIds(previous =>
                          selected ? previous.filter(id => id !== item.id) : [...previous, item.id],
                        )}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-1.5 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                          selected
                            ? 'border-[var(--text-primary)] bg-[var(--bg-hover)]'
                            : 'border-[var(--border-color)] bg-[var(--bg-secondary)]',
                        )}
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.cor }} />
                        <Text variant="meta" className="font-medium">{item.nome}</Text>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <FieldLabel>Função padrão</FieldLabel>
                <ChoiceChips
                  options={FUNCAO_OPTIONS}
                  value={form.funcaoPadrao}
                  onChange={funcaoPadrao => setForm(previous => ({ ...previous, funcaoPadrao }))}
                  label="Função padrão"
                  layout="stacked"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Frequência</FieldLabel>
                  <select
                    value={form.frequenciaRecomendada}
                    onChange={event => setForm(previous => ({ ...previous, frequenciaRecomendada: event.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Escolher…</option>
                    {FREQUENCIAS_SERIE.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Formato visual padrão</FieldLabel>
                  <input
                    list="serie-formato-suggestions"
                    value={form.formatoVisualPadrao || ''}
                    onChange={event => setForm(previous => ({
                      ...previous,
                      formatoVisualPadrao: event.target.value || null,
                    }))}
                    placeholder="Escolher ou escrever…"
                    className={inputClass}
                  />
                  <datalist id="serie-formato-suggestions">
                    {collectFormatoSuggestions(usedFormatoValues).map(item => <option key={item} value={item} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <FieldLabel>Energia padrão</FieldLabel>
                <ChoiceChips
                  options={ENERGIA_NIVEIS.map(value => ({ value, label: ENERGIA_LABELS[value] }))}
                  value={form.energiaPadrao}
                  onChange={energiaPadrao => setForm(previous => ({ ...previous, energiaPadrao }))}
                  label="Energia padrão"
                />
              </div>
            </div>
          </Surface>

          <Surface variant="outlined" padding="md" className="bg-[var(--bg-secondary)]">
            <SectionHeader
              icon={<FileText className="h-4 w-4" />}
              title="Estrutura do roteiro"
              description="Modelo base para roteiros desta série."
              compact
            />
            <textarea
              value={form.estruturaRoteiro}
              onChange={event => setForm(previous => ({...previous, estruturaRoteiro: event.target.value}))}
              placeholder="Estrutura base para roteiros desta série…"
              rows={3}
              className={cn(inputClass, 'min-h-[88px] resize-none leading-relaxed')}
            />
          </Surface>

          {serieForMetrics ? (
            <Surface variant="outlined" padding="md" className="bg-[var(--bg-secondary)]">
              <SerieProductionMetricsPanel serie={serieForMetrics} contents={contents} />
            </Surface>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-3 md:sticky md:top-24 md:self-start">
          <Surface variant="outlined" padding="md" className="bg-[var(--bg-secondary)]">
            <SectionHeader
              icon={<Hash className="h-4 w-4 text-[var(--accent-green)]" />}
              title="Hashtags por plataforma"
              description="Separe as hashtags com espaço."
              compact
            />

            {platformNames.length === 0 ? (
              <Text variant="meta" className="text-[var(--text-tertiary)]">
                Nenhuma plataforma ativa configurada.
              </Text>
            ) : (
              <div className="stack-md">
                {platformNames.map(platform => {
                  const value = form.plataformas.find(item => item.platformId === platform)?.hashtags || '';
                  return (
                    <div key={platform}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <PlatformBrand platform={platform} compact />
                        <Text variant="meta" className="font-medium text-[var(--text-primary)]">
                          {platform}
                        </Text>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={value}
                          onChange={event => updatePlatformHashtags(platform, event.target.value)}
                          placeholder="#hashtag1 #hashtag2"
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => void copyHashtags(value)}
                          disabled={!value.trim()}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                          aria-label={`Copiar hashtags de ${platform}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Surface>

        </aside>
      </div>

      <Surface variant="outlined" padding="md" className="mt-3 bg-[var(--bg-secondary)]">
        <SectionHeader
          icon={<FileText className="h-4 w-4" />}
          title="Templates de roteiro"
          description="Templates desta série para começar um roteiro."
          compact
        />
        {initial.id ? (
          <TemplatesSettingsPage seriesId={initial.id} embedded />
        ) : (
          <Text variant="meta" className="text-[var(--text-tertiary)]">
            Salve a série para cadastrar templates de roteiro.
          </Text>
        )}
      </Surface>

      {isDirty ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 md:px-6">
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
