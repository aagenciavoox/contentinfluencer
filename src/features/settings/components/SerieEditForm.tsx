import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Copy,
  Layers,
  Plus,
} from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { CoverUploadField } from '../../library/components/CoverUploadField';
import type { Content, Pilar, Serie } from '../../../lib/database';
import { SerieProductionMetricsPanel } from './SerieProductionMetricsPanel';
import { TemplatesSettingsPage } from '../pages/TemplatesSettingsPage';
import { cn } from '../../../lib/utils';
import { generateUUID } from '../../../utils/uuid';
import { EntityColorPicker, entitySwatchInk } from './EntityColorPicker';
import { isSerieColorTaken } from '../lib/serieColors';
import { OpenInfoNotice } from '../../editorial/components/OpenInfoNotice';
import {
  collectFormatoSuggestions,
  ENERGIA_LABELS,
  ENERGIA_NIVEIS,
  FORMATO_APRESENTACAO_SUGESTOES,
  FREQUENCIAS_SERIE,
} from '../../editorial/lib/editorialOptions';
import { pilarPrincipalDaSerie } from '../../editorial/lib/pilarDaSerie';
import { getSerieOpenItems } from '../../editorial/lib/serieCompleteness';
import type { FuncaoPadraoSerie } from '../../../lib/database';
import { FUNCAO_DESCRICOES, FUNCAO_LABELS, FUNCOES } from '../../editorial/lib/funcoes';

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

function CardHeading({
  title,
  description,
  action,
  inline = false,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className={cn('min-w-0', inline ? 'flex flex-wrap items-baseline gap-x-2' : 'stack-sm')}>
        <Text variant="itemTitle">{title}</Text>
        {description ? (
          <Text variant="meta" className="text-[var(--text-secondary)]">
            {description}
          </Text>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function FieldLabel({
  children,
  required,
  optional,
}: {
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <Text variant="label" className="mb-1.5 block font-medium text-[var(--text-primary)]">
      {children}
      {required ? <span className="text-[var(--brand-accent-strong)]"> *</span> : null}
      {optional ? <span className="font-normal text-[var(--text-tertiary)]"> · opcional</span> : null}
    </Text>
  );
}

function SuggestField({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: readonly string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const query = value.trim().toLowerCase();
  const options = query
    ? suggestions.filter(item => item.toLowerCase().includes(query))
    : [...suggestions];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={value}
        placeholder={placeholder}
        onChange={event => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={event => {
          if (event.key === 'Escape') setOpen(false);
        }}
        className={cn(inputClass, 'pr-9')}
      />
      <button
        type="button"
        aria-label="Abrir sugestões"
        onClick={() => setOpen(current => !current)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-56 overflow-y-auto rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] py-1 shadow-[var(--shadow-dropdown)]"
        >
          {options.length > 0 ? (
            options.map(option => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                {option}
              </button>
            ))
          ) : (
            <Text variant="meta" className="block px-3 py-2 text-[var(--text-tertiary)]">
              Nenhuma sugestão. O texto digitado permanece.
            </Text>
          )}
        </div>
      ) : null}
    </div>
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
  takenColors = [],
  lastEditLabel = null,
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
  takenColors?: readonly string[];
  lastEditLabel?: string | null;
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
      pilarPrincipalId: pilarPrincipalDaSerie(initial),
      formatoApresentacao: initial.formatoApresentacao || '',
      motivoSalvar: initial.motivoSalvar || '',
      motivoEnviar: initial.motivoEnviar || '',
      plataformas: initial.plataformas || [],
    },
  });

  const [form, setForm] = useState(initialSnapshot.current.form);

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
    if (form.pilarPrincipalId !== snap.form.pilarPrincipalId) return true;
    if (form.formatoApresentacao !== snap.form.formatoApresentacao) return true;
    if (form.motivoSalvar !== snap.form.motivoSalvar) return true;
    if (form.motivoEnviar !== snap.form.motivoEnviar) return true;
    if (form.ativa !== snap.form.ativa) return true;
    if (JSON.stringify(form.plataformas) !== JSON.stringify(snap.form.plataformas)) return true;
    return false;
  }, [form]);

  const colorTaken = isSerieColorTaken(
    takenColors.map((cor, index) => ({id: `taken-${index}`, cor})),
    form.cor,
  );
  const canSave = Boolean(form.name.trim()) && !colorTaken;

  const updatePlatformHashtags = (platformId: string, hashtags: string) => {
    const current = [...form.plataformas];
    const index = current.findIndex(item => item.platformId === platformId);

    if (!hashtags) {
      if (index >= 0) current.splice(index, 1);
    } else if (index >= 0) {
      current[index] = {...current[index], hashtags};
    } else {
      current.push({serieId: form.id, platformId, hashtags});
    }

    setForm(previous => ({...previous, plataformas: current}));
  };

  const handleSave = useCallback(() => {
    if (!form.name.trim() || colorTaken) return;

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
      pilarPrincipalId: form.pilarPrincipalId,
      formatoApresentacao: form.formatoApresentacao.trim() || null,
      motivoSalvar: form.motivoSalvar.trim() || null,
      motivoEnviar: form.motivoEnviar.trim() || null,
      pilarIds: form.pilarPrincipalId ? [form.pilarPrincipalId] : [],
      plataformas: platformNames
        .map(platformId => form.plataformas.find(item => item.platformId === platformId))
        .filter((item): item is NonNullable<typeof item> => Boolean(item?.hashtags.trim()))
        .map(item => ({...item, hashtags: item.hashtags.trim()})),
      createdAt: initial.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [colorTaken, form, initial.createdAt, onSave, platformNames]);

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
  const coverPreview = /^https?:\/\//i.test(form.capaUrl.trim()) ? form.capaUrl.trim() : '';
  const openTemplateCreate = useRef<(() => void) | null>(null);
  const selectedPilar = pilares.find(item => item.id === form.pilarPrincipalId) ?? null;
  const pilarChoices = pilares.filter(item => item.ativo || item.id === form.pilarPrincipalId);
  const funcaoDescription = FUNCAO_OPTIONS.find(option => option.value === form.funcaoPadrao)?.description ?? null;
  const formatoOptions = collectFormatoSuggestions([...usedFormatoValues, form.formatoVisualPadrao]);
  const apresentacaoOptions = form.formatoApresentacao.trim()
    && !FORMATO_APRESENTACAO_SUGESTOES.some(item => item.toLowerCase() === form.formatoApresentacao.trim().toLowerCase())
    ? [form.formatoApresentacao.trim(), ...FORMATO_APRESENTACAO_SUGESTOES]
    : [...FORMATO_APRESENTACAO_SUGESTOES];
  const serieForMetrics: Serie = {
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
        pilarPrincipalId: form.pilarPrincipalId,
        formatoApresentacao: form.formatoApresentacao.trim() || null,
        motivoSalvar: form.motivoSalvar.trim() || null,
        motivoEnviar: form.motivoEnviar.trim() || null,
        pilarIds: form.pilarPrincipalId ? [form.pilarPrincipalId] : [],
        plataformas: form.plataformas,
        createdAt: initial.createdAt || new Date().toISOString(),
        updatedAt: initial.updatedAt || new Date().toISOString(),
      };

  return (
    <div className="relative w-full">
      {showOpenInfoNotice ? (
        <OpenInfoNotice
          items={getSerieOpenItems({
            pilarIds: form.pilarPrincipalId ? [form.pilarPrincipalId] : [],
            pilarPrincipalId: form.pilarPrincipalId,
            funcaoPadrao: form.funcaoPadrao,
            frequenciaRecomendada: form.frequenciaRecomendada,
            formatoVisualPadrao: form.formatoVisualPadrao,
            energiaPadrao: form.energiaPadrao,
          })}
          className="mb-3"
        />
      ) : null}
      <Surface variant="outlined" padding="md" className="mb-3 w-full">
        <div className="flex w-full items-center gap-3">
          {coverPreview ? (
            <img
              src={coverPreview}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{backgroundColor: form.cor}}
            >
              <Layers className="h-5 w-5" strokeWidth={1.75} style={{ color: entitySwatchInk(form.cor) }} />
            </span>
          )}
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Text variant="itemTitle" className="min-w-0 break-words">
              {form.name.trim() || 'Nova série'}
            </Text>
            <Badge
              className={form.ativa
                ? 'border-transparent bg-[color-mix(in_srgb,var(--accent-green)_16%,transparent)] text-[var(--accent-green)]'
                : undefined}
            >
              {form.ativa ? 'Ativa' : 'Inativa'}
            </Badge>
            <Text variant="meta" className="text-[var(--text-tertiary)]">
              ID: {slug}
            </Text>
          </div>
        </div>
      </Surface>

      <div className="grid w-full grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.95fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <Surface variant="outlined" padding="md">
            <CardHeading
              title="Identidade"
              description="Como esta série aparece na sua central."
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
                <FieldLabel>Elemento fixo</FieldLabel>
                <input
                  type="text"
                  value={form.bordao}
                  onChange={event => setForm(previous => ({...previous, bordao: event.target.value}))}
                  placeholder="Ex.: vamos destrinchar isso"
                  className={inputClass}
                />
              </div>

              <div className="grid-form">
                <div>
                  <FieldLabel>Cor da série</FieldLabel>
                  <EntityColorPicker
                    variant="inline"
                    value={form.cor}
                    unavailableColors={takenColors}
                    onChange={cor => setForm(previous => ({...previous, cor}))}
                  />
                </div>
                <div>
                  <FieldLabel optional>Capa</FieldLabel>
                  <CoverUploadField
                    appearance="series"
                    value={form.capaUrl}
                    onChange={capaUrl => setForm(previous => ({...previous, capaUrl}))}
                    itemId={form.id}
                    title={form.name.trim() || 'Série'}
                    plain
                  />
                </div>
              </div>
            </div>
          </Surface>

          <Surface variant="outlined" padding="md">
            <CardHeading
              title="Estratégia"
              description="Padrões usados ao criar conteúdos desta série."
            />

            <div className="stack-lg">
              <div className="grid-form">
                <div>
                  <FieldLabel>Pilar principal</FieldLabel>
                  <div className="relative">
                    {selectedPilar ? (
                      <span
                        className="pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                        style={{ backgroundColor: selectedPilar.cor }}
                      />
                    ) : null}
                    <select
                      aria-label="Pilar principal"
                      value={form.pilarPrincipalId ?? ''}
                      onChange={event => setForm(previous => ({
                        ...previous,
                        pilarPrincipalId: event.target.value || null,
                      }))}
                      className={cn(inputClass, selectedPilar && 'pl-8')}
                    >
                      <option value="">Escolher…</option>
                      {pilarChoices.map(item => (
                        <option key={item.id} value={item.id}>{item.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <FieldLabel>Função padrão</FieldLabel>
                  <select
                    aria-label="Função padrão"
                    value={form.funcaoPadrao ?? ''}
                    onChange={event => setForm(previous => ({
                      ...previous,
                      funcaoPadrao: (event.target.value || null) as typeof previous.funcaoPadrao,
                    }))}
                    className={inputClass}
                  >
                    <option value="">Escolher…</option>
                    {FUNCAO_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {funcaoDescription ? (
                    <Text variant="meta" className="mt-1.5 block text-[var(--text-tertiary)]">
                      {funcaoDescription}
                    </Text>
                  ) : null}
                </div>
                <div>
                  <FieldLabel>Recorrência</FieldLabel>
                  <select
                    aria-label="Recorrência"
                    value={form.frequenciaRecomendada}
                    onChange={event => setForm(previous => ({ ...previous, frequenciaRecomendada: event.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Escolher…</option>
                    {FREQUENCIAS_SERIE.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Formato de publicação</FieldLabel>
                  <SuggestField
                    id="serie-formato-publicacao"
                    value={form.formatoVisualPadrao || ''}
                    onChange={formatoVisualPadrao => setForm(previous => ({
                      ...previous,
                      formatoVisualPadrao: formatoVisualPadrao || null,
                    }))}
                    suggestions={formatoOptions}
                    placeholder="Escolher ou escrever…"
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Formato de apresentação</FieldLabel>
                <SuggestField
                  id="serie-formato-apresentacao"
                  value={form.formatoApresentacao}
                  onChange={formatoApresentacao => setForm(previous => ({ ...previous, formatoApresentacao }))}
                  suggestions={apresentacaoOptions}
                  placeholder="Escolher ou escrever…"
                />
              </div>

              <div className="grid-form">
                <div>
                  <FieldLabel optional>Motivo para salvar</FieldLabel>
                  <input
                    type="text"
                    value={form.motivoSalvar}
                    onChange={event => setForm(previous => ({ ...previous, motivoSalvar: event.target.value }))}
                    placeholder="O que faz a pessoa guardar"
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel optional>Motivo para mandar</FieldLabel>
                  <input
                    type="text"
                    value={form.motivoEnviar}
                    onChange={event => setForm(previous => ({ ...previous, motivoEnviar: event.target.value }))}
                    placeholder="O que faz a pessoa enviar"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Esforço de produção</FieldLabel>
                <div
                  role="radiogroup"
                  aria-label="Esforço de produção"
                  className="grid grid-cols-3 gap-1 rounded-[var(--radius-input)] border border-[var(--border-color)] p-1"
                >
                  {ENERGIA_NIVEIS.map(value => {
                    const selected = form.energiaPadrao === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setForm(previous => ({
                          ...previous,
                          energiaPadrao: selected ? null : value,
                        }))}
                        className={cn(
                          'rounded-[var(--radius-input)] px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                          selected
                            ? 'bg-[var(--brand-accent-soft)] text-[var(--brand-accent-strong)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                        )}
                      >
                        {ENERGIA_LABELS[value]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Surface>

          <Surface variant="outlined" padding="md">
            <CardHeading
              title="Estrutura do roteiro"
              description="Modelo base para os conteúdos da série."
              inline
            />
            <textarea
              value={form.estruturaRoteiro}
              onChange={event => setForm(previous => ({...previous, estruturaRoteiro: event.target.value}))}
              placeholder="Estrutura base para os conteúdos desta série…"
              rows={7}
              className={cn(inputClass, 'min-h-[140px] resize-y leading-relaxed')}
            />
          </Surface>

          <Surface variant="outlined" padding="md">
            <CardHeading
              title="Templates de roteiro"
              description="Templates desta série para começar um roteiro."
              inline
              action={
                <AppButton
                  variant="secondary"
                  size="sm"
                  disabled={!initial.id}
                  onClick={() => openTemplateCreate.current?.()}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Adicionar template
                </AppButton>
              }
            />
            {initial.id ? (
              <TemplatesSettingsPage
                seriesId={initial.id}
                embedded
                hideCreateButton
                emptyLabel="Nenhum template adicionado."
                onCreateReady={open => {
                  openTemplateCreate.current = open;
                }}
              />
            ) : (
              <Text variant="meta" className="block py-6 text-center text-[var(--text-tertiary)]">
                Salve a série para cadastrar templates de roteiro.
              </Text>
            )}
          </Surface>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <Surface variant="outlined" padding="md">
            <CardHeading
              title="Hashtags por plataforma"
              description="Separe as hashtags com espaço."
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
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <PlatformBrand platform={platform} />
                          <Text variant="meta" className="font-medium text-[var(--text-primary)]">
                            {platform}
                          </Text>
                        </div>
                        <button
                          type="button"
                          onClick={() => void copyHashtags(value)}
                          disabled={!value.trim()}
                          className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                          aria-label={`Copiar hashtags de ${platform}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <Text variant="meta">Copiar</Text>
                        </button>
                      </div>
                      <textarea
                        value={value}
                        onChange={event => updatePlatformHashtags(platform, event.target.value)}
                        placeholder="#hashtag1 #hashtag2"
                        rows={2}
                        className={cn(inputClass, 'min-h-[64px] resize-y leading-relaxed')}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Surface>

          <Surface variant="outlined" padding="md">
            <SerieProductionMetricsPanel
              serie={serieForMetrics}
              contents={contents}
              lastEditLabel={lastEditLabel}
              onActiveChange={ativa => setForm(previous => ({ ...previous, ativa }))}
            />
          </Surface>
        </aside>
      </div>
    </div>
  );
}
