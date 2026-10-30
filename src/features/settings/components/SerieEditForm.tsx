import { SettingsSectionCard } from '../../../components/settings/SettingsSectionCard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ChevronDown,
  Copy,
  Layers,
  Plus,
} from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { MultiFilterChips } from '../../../components/ui/MultiFilterChips';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Surface } from '../../../components/ui/Surface';
import { SelectField } from '../../../components/ui/SelectField';
import { TagSelect } from '../../../components/ui/TagSelect';
import { Text } from '../../../components/ui/Text';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { CoverUploadField } from '../../library/components/CoverUploadField';
import { normalizeFormatoList, type Content, type Pilar, type Platform, type Serie } from '../../../lib/database';
import { SerieProductionMetricsPanel } from './SerieProductionMetricsPanel';
import { TemplatesSettingsPage } from '../pages/TemplatesSettingsPage';
import { cn } from '../../../lib/utils';
import { useUnsavedChangesRegistration } from '../../../hooks/useUnsavedChangesRegistration';
import { generateUUID } from '../../../utils/uuid';
import { EntityIdentity } from '../../../components/settings/EntityIdentity';
import { EntityColorPicker, entitySwatchInk } from './EntityColorPicker';
import { isSerieColorTaken } from '../lib/serieColors';
import { OpenInfoNotice } from '../../editorial/components/OpenInfoNotice';
import { LegendaBaseField } from '../../editorial/components/legendas/LegendaBaseField';
import { LegendaVersaoField } from '../../editorial/components/legendas/LegendaVersaoField';
import { complementoDoRotulo, iconeDaConta, rotuloConta } from '../../contas/lib/contas';
import { DisclosureButton } from '../../../components/ui/DisclosureButton';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { PropertyDatePicker } from '../../../components/ui/PropertyDatePicker';
import {
  collectFormatoSuggestions,
  ENERGIA_LABELS,
  ENERGIA_NIVEIS,
  FORMATO_APRESENTACAO_SUGESTOES,
  FREQUENCIAS_SERIE,
} from '../../editorial/lib/editorialOptions';
import { expectativaNoIntervalo, lerFrequencia } from '../../editorial/lib/frequenciaSerie';
import { semanaDe } from '../../editorial/lib/periodoEditorial';
import { pilarPrincipalDaSerie } from '../../editorial/lib/pilarDaSerie';
import { getSerieOpenItems } from '../../editorial/lib/serieCompleteness';
import { formariaCicloParent } from '../../editorial/lib/serieArvore';
import { acharTemporadaPorNome, temporadasDoEscopo } from '../../editorial/lib/temporadas';
import type { FuncaoPadraoSerie } from '../../../lib/database';
import { FUNCAO_DESCRICOES, FUNCAO_LABELS, FUNCOES } from '../../editorial/lib/funcoes';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { lerAbaEdicaoSerie, type AbaEdicaoSerie } from '../lib/serieEditAba';

const SERIE_DEFAULT_COR = '#6366f1';

const UNIDADES_FREQUENCIA = [
  { value: 'semana', label: 'Semana' },
  { value: 'quinzena', label: 'Quinzena' },
  { value: 'mes', label: 'Mês' },
] as const;

function escolhaSobDemanda(value: string): boolean {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') === 'sob demanda';
}

function diaFrequencia(value: string | null | undefined): string {
  const candidato = value?.trim().slice(0, 10) ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(candidato) ? candidato : '';
}

function parseVezes(raw: string): number | null {
  if (!raw.trim()) return null;
  if (!/^\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

function opcoesFrequencia(atual: string): string[] {
  const valor = atual.trim();
  if (!valor || (FREQUENCIAS_SERIE as readonly string[]).includes(valor)) {
    return [...FREQUENCIAS_SERIE];
  }
  return [valor, ...FREQUENCIAS_SERIE];
}

const FUNCAO_OPTIONS: Array<{ value: FuncaoPadraoSerie; label: string; description: string }> = [
  ...FUNCOES.map(value => ({
    value,
    label: FUNCAO_LABELS[value],
    description: FUNCAO_DESCRICOES[value],
  })),
  { value: 'varia', label: 'Varia por conteúdo', description: 'Cada roteiro escolhe o seu.' },
];

export type SerieEditChromeState = {
  isDirty: boolean;
  canSave: boolean;
  handleSave: () => void;
  handleCancel: () => void;
};

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
    <Text variant="label" className="mb-1.5 block text-[var(--text-primary)]">
      {children}
      {required ? <span className="text-[var(--brand-accent-text)]"> *</span> : null}
      {optional ? <span className="font-normal text-[var(--text-tertiary)]"> · opcional</span> : null}
    </Text>
  );
}

/** Várias escolhas em chips, mais um campo para um valor próprio. */
function MultiChoiceField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: readonly string[];
}) {
  const [draft, setDraft] = useState('');
  const chips = normalizeFormatoList([...options, ...value]);
  const addDraft = () => {
    const next = draft.trim();
    if (!next) return;
    onChange(normalizeFormatoList([...value, next]));
    setDraft('');
  };
  return (
    <div className="stack-sm">
      <MultiFilterChips
        value={value}
        onChange={next => onChange(normalizeFormatoList(next))}
        options={chips.map(item => ({ id: item, label: item }))}
        ariaLabel={label}
      />
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          placeholder="Outro formato…"
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addDraft();
            }
          }}
          className={inputClass}
        />
        <AppButton variant="secondary" size="sm" onClick={addDraft} disabled={!draft.trim()}>
          Adicionar
        </AppButton>
      </div>
    </div>
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
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--radius-input)] p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
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
                className="flex w-full items-center px-3 py-2 text-left t-body text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
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
  'ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 t-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

type AbaCadastro = AbaEdicaoSerie;

export function SerieEditForm({
  initial,
  contas,
  pilares,
  series = [],
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
  contas: Platform[];
  pilares: Pilar[];
  /** Catálogo para “Faz parte de”. */
  series?: readonly Serie[];
  contents?: Content[];
  onSave: (serie: Serie) => void;
  onCancel: () => void;
  onChromeChange?: (state: SerieEditChromeState) => void;
  usedFormatoValues?: Array<string | null | undefined>;
  showOpenInfoNotice?: boolean;
  takenColors?: readonly string[];
  lastEditLabel?: string | null;
}) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const abaNaUrl = lerAbaEdicaoSerie(searchParams.get('aba'));
  const [aba, setAba] = useState<AbaCadastro>(abaNaUrl);

  useEffect(() => {
    setAba(abaNaUrl);
  }, [abaNaUrl]);
  const [mostrarAgrupar, setMostrarAgrupar] = useState(Boolean(initial.parentId));
  const [mostrarTemporadas, setMostrarTemporadas] = useState(Boolean(initial.usaTemporadas));
  const [novaTemporadaNome, setNovaTemporadaNome] = useState('');
  const referenciaId = state.editorial.redeReferenciaId;
  const [contaAberta, setContaAberta] = useState<string | null>(
    contas.some(conta => conta.id === referenciaId) ? referenciaId : contas[0]?.id ?? null,
  );
  const initialSnapshot = useRef({
    form: {
      id: initial.id || generateUUID(),
      userId: initial.userId || '',
      name: initial.name || '',
      template: initial.template || '',
      notes: initial.notes || '',
      slotPadrao: initial.slotPadrao || null,
      formatoVisualPadrao: normalizeFormatoList(initial.formatoVisualPadrao),
      estruturaRoteiro: initial.estruturaRoteiro || '',
      bordao: initial.bordao || '',
      cor: initial.cor || SERIE_DEFAULT_COR,
      capaUrl: initial.capaUrl || '',
      ativa: initial.ativa ?? true,
      frequenciaRecomendada: initial.frequenciaRecomendada || '',
      frequenciaVezes: initial.frequenciaVezes ?? null,
      frequenciaUnidade: initial.frequenciaUnidade?.trim() || '',
      frequenciaAPartirDe: diaFrequencia(initial.frequenciaAPartirDe),
      funcaoPadrao: initial.funcaoPadrao || null,
      energiaPadrao: initial.energiaPadrao || null,
      pilarPrincipalId: pilarPrincipalDaSerie(initial),
      formatoApresentacao: normalizeFormatoList(initial.formatoApresentacao),
      motivoSalvar: initial.motivoSalvar || '',
      motivoEnviar: initial.motivoEnviar || '',
      legendaBase: initial.legendaBase || '',
      parentId: initial.parentId ?? null,
      usaTemporadas: initial.usaTemporadas === true,
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
    if (form.frequenciaVezes !== snap.form.frequenciaVezes) return true;
    if (form.frequenciaUnidade !== snap.form.frequenciaUnidade) return true;
    if (form.frequenciaAPartirDe !== snap.form.frequenciaAPartirDe) return true;
    if (JSON.stringify(form.formatoVisualPadrao) !== JSON.stringify(snap.form.formatoVisualPadrao)) return true;
    if (form.funcaoPadrao !== snap.form.funcaoPadrao) return true;
    if (form.energiaPadrao !== snap.form.energiaPadrao) return true;
    if (form.pilarPrincipalId !== snap.form.pilarPrincipalId) return true;
    if (JSON.stringify(form.formatoApresentacao) !== JSON.stringify(snap.form.formatoApresentacao)) return true;
    if (form.motivoSalvar !== snap.form.motivoSalvar) return true;
    if (form.motivoEnviar !== snap.form.motivoEnviar) return true;
    if (form.legendaBase !== snap.form.legendaBase) return true;
    if (form.parentId !== snap.form.parentId) return true;
    if (form.usaTemporadas !== snap.form.usaTemporadas) return true;
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
      if (index >= 0) {
        if ((current[index].legenda ?? '').trim()) current[index] = { ...current[index], hashtags: '' };
        else current.splice(index, 1);
      }
    } else if (index >= 0) {
      current[index] = {...current[index], hashtags};
    } else {
      current.push({serieId: form.id, platformId, hashtags});
    }

    setForm(previous => ({...previous, plataformas: current}));
  };

  const updatePlatformLegenda = (platformId: string, legenda: string | null) => {
    const current = [...form.plataformas];
    const index = current.findIndex(item => item.platformId === platformId);
    const texto = legenda?.trim() ?? '';
    if (!texto) {
      if (index >= 0) {
        if (current[index].hashtags.trim()) current[index] = { ...current[index], legenda: null };
        else current.splice(index, 1);
      }
    } else if (index >= 0) {
      current[index] = { ...current[index], legenda: texto };
    } else {
      current.push({ serieId: form.id, platformId, hashtags: '', legenda: texto });
    }
    setForm(previous => ({ ...previous, plataformas: current }));
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
      frequenciaVezes: form.frequenciaVezes,
      frequenciaUnidade: form.frequenciaUnidade.trim() || null,
      frequenciaAPartirDe: form.frequenciaAPartirDe || null,
      funcaoPadrao: form.funcaoPadrao,
      energiaPadrao: form.energiaPadrao,
      pilarPrincipalId: form.pilarPrincipalId,
      formatoApresentacao: form.formatoApresentacao,
      motivoSalvar: form.motivoSalvar.trim() || null,
      motivoEnviar: form.motivoEnviar.trim() || null,
      legendaBase: form.legendaBase.trim() || null,
      parentId: form.parentId,
      usaTemporadas: form.usaTemporadas,
      pilarIds: form.pilarPrincipalId ? [form.pilarPrincipalId] : [],
      plataformas: contas
        .map(conta => form.plataformas.find(item => item.platformId === conta.id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item && (item.hashtags.trim() || (item.legenda ?? '').trim())))
        .map(item => ({...item, hashtags: item.hashtags.trim(), legenda: item.legenda?.trim() || null})),
      createdAt: initial.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [colorTaken, contas, form, initial.createdAt, onSave]);

  useUnsavedChangesRegistration(isDirty, () => {
    if (canSave) handleSaveRef.current();
  });

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

  const openTemplateCreate = useRef<(() => void) | null>(null);
  const selectedPilar = pilares.find(item => item.id === form.pilarPrincipalId) ?? null;
  const pilarChoices = pilares.filter(item => item.ativo || item.id === form.pilarPrincipalId);
  const funcaoDescription = FUNCAO_OPTIONS.find(option => option.value === form.funcaoPadrao)?.description ?? null;
  const selecionouSobDemanda = escolhaSobDemanda(form.frequenciaRecomendada);
  const frequenciaLida = lerFrequencia({
    frequenciaRecomendada: form.frequenciaRecomendada,
    vezes: form.frequenciaVezes,
    unidade: form.frequenciaUnidade,
    aPartirDe: form.frequenciaAPartirDe || null,
  });
  const mostrarFrequenciaDetalhe = !selecionouSobDemanda
    || form.frequenciaVezes !== null
    || Boolean(form.frequenciaUnidade.trim());
  const semanaAtual = semanaDe(format(new Date(), 'yyyy-MM-dd'));
  const expectativaPeriodo = expectativaNoIntervalo(frequenciaLida, semanaAtual.inicio, semanaAtual.fim);
  const frequenciaOpcoes = opcoesFrequencia(form.frequenciaRecomendada);
  const unidadeExtra = form.frequenciaUnidade.trim()
    && !UNIDADES_FREQUENCIA.some(item => item.value === form.frequenciaUnidade)
    ? form.frequenciaUnidade.trim()
    : '';
  const formatoOptions = collectFormatoSuggestions([...usedFormatoValues, ...form.formatoVisualPadrao]);
  const apresentacaoOptions = normalizeFormatoList([...FORMATO_APRESENTACAO_SUGESTOES, ...form.formatoApresentacao]);
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
        frequenciaVezes: form.frequenciaVezes,
        frequenciaUnidade: form.frequenciaUnidade.trim() || null,
        frequenciaAPartirDe: form.frequenciaAPartirDe || null,
        funcaoPadrao: form.funcaoPadrao,
        energiaPadrao: form.energiaPadrao,
        pilarPrincipalId: form.pilarPrincipalId,
        formatoApresentacao: form.formatoApresentacao,
        motivoSalvar: form.motivoSalvar.trim() || null,
        motivoEnviar: form.motivoEnviar.trim() || null,
        parentId: form.parentId,
        usaTemporadas: form.usaTemporadas,
        legendaBase: form.legendaBase.trim() || null,
        pilarIds: form.pilarPrincipalId ? [form.pilarPrincipalId] : [],
        plataformas: form.plataformas,
        createdAt: initial.createdAt || new Date().toISOString(),
        updatedAt: initial.updatedAt || new Date().toISOString(),
      };

  const [confirmDesvincular, setConfirmDesvincular] = useState(false);
  const [confirmParent, setConfirmParent] = useState<{ next: string | null; message: string } | null>(null);
  const opcoesPai = series
    .filter(item => item.id !== form.id && !formariaCicloParent(form.id, item.id, [
      ...series.map(s => s.id === form.id ? { ...s, parentId: form.parentId } : s),
    ]))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div className="relative w-full">
      <div className="mb-3">
        <SegmentTabs<AbaCadastro>
          value={aba}
          onChange={setAba}
          ariaLabel="Cadastro da série"
          options={[
            { id: 'sobre', label: 'Sobre' },
            { id: 'roteiros', label: 'Roteiros' },
            { id: 'publicacao', label: 'Publicação' },
          ]}
        />
      </div>
      {showOpenInfoNotice ? (
        <OpenInfoNotice
          items={getSerieOpenItems({
            id: form.id,
            pilarIds: form.pilarPrincipalId ? [form.pilarPrincipalId] : [],
            pilarPrincipalId: form.pilarPrincipalId,
            funcaoPadrao: form.funcaoPadrao,
            frequenciaRecomendada: form.frequenciaRecomendada,
            formatoVisualPadrao: form.formatoVisualPadrao,
            energiaPadrao: form.energiaPadrao,
          }, { series, contents })}
          className="mb-3"
        />
      ) : null}
      <Surface variant="info" padding="md" className="mb-3 w-full">
        <EntityIdentity
          name={form.name.trim() || 'Nova série'}
          active={form.ativa}
          inactiveLabel="Inativa"
          icon={(
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: form.cor }}
            >
              <Layers className="h-4 w-4" strokeWidth={1.75} style={{ color: entitySwatchInk(form.cor) }} />
            </span>
          )}
        />
      </Surface>

      <div className="grid w-full grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.95fr)]">
        <div className={cn('flex min-w-0 flex-col gap-3', aba !== 'sobre' && aba !== 'roteiros' && 'hidden')}>
          <SettingsSectionCard padding="md" className={aba !== 'sobre' ? 'hidden' : undefined}
              title="Identidade"
              description="Como esta série aparece na sua central."
            >

            <div className="stack-lg">
              <div>
                <FieldLabel required>Nome</FieldLabel>
                <input
                  type="text"
                  aria-label="Nome da série"
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
                  aria-label="Elemento fixo"
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
                    caption="name"
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
          </SettingsSectionCard>

          {aba === 'sobre' ? (
            <SettingsSectionCard padding="md" 
              title="Organização opcional"
              description="Agrupar e temporadas ficam recolhidos enquanto vazios."
            >
              <div className="stack-md">
                {!mostrarAgrupar && !form.parentId ? (
                  <AppButton variant="secondary" size="sm" onClick={() => setMostrarAgrupar(true)}>
                    Agrupar com outra série
                  </AppButton>
                ) : (
                  <div className="stack-sm">
                    <FieldLabel>Faz parte de</FieldLabel>
                    <SelectField
                      ariaLabel="Faz parte de"
                      value={form.parentId ?? ''}
                      onChange={parentId => {
                        const next = parentId || null;
                        if (next === (form.parentId ?? null)) return;
                        if (form.parentId || next) {
                          setConfirmParent({
                            next,
                            message: form.parentId
                              ? 'Mudar o pai pode alterar o agrupamento dos relatórios, porque a análise lê a série ao vivo. Classificação congelada permanece.'
                              : 'Agrupar pode mudar metas e herança deste quadro em relação ao pai. Os episódios permanecem nesta série.',
                          });
                          return;
                        }
                        setForm(previous => ({
                          ...previous,
                          parentId: next,
                        }));
                      }}
                      options={[
                        { value: '', label: 'Nenhuma (série independente)' },
                        ...opcoesPai.map(item => ({ value: item.id, label: item.name })),
                      ]}
                    />
                    {form.parentId ? (
                      <AppButton variant="secondary" size="sm" onClick={() => setConfirmDesvincular(true)}>
                        Desfazer vínculo
                      </AppButton>
                    ) : null}
                  </div>
                )}

                {!mostrarTemporadas && !form.usaTemporadas ? (
                  <AppButton variant="secondary" size="sm" onClick={() => setMostrarTemporadas(true)}>
                    Usar temporadas
                  </AppButton>
                ) : (
                  <div className="stack-sm">
                    <label className="flex items-start gap-2 t-label text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={form.usaTemporadas}
                        onChange={event => setForm(previous => ({
                          ...previous,
                          usaTemporadas: event.target.checked,
                        }))}
                      />
                      <span>
                        <Text variant="bodyStrong" as="span" className="text-inherit">Usar temporadas neste registro</Text>
                        <span className="block text-[var(--text-secondary)]">
                          Este fica o escopo das temporadas da subárvore. Desligar preserva as linhas já criadas.
                        </span>
                      </span>
                    </label>
                    {form.usaTemporadas && form.id ? (
                      <div className="stack-sm rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3">
                        <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                          Nomes neste escopo. A mesma grafia (sem maiúsculas nem espaços nas pontas) reutiliza a linha.
                        </Text>
                        <ul className="stack-xs">
                          {temporadasDoEscopo(form.id, state.temporadas).map(temp => (
                            <li key={temp.id} className="flex items-center justify-between gap-2 t-body">
                              <span>{temp.nome}</span>
                              <AppButton
                                variant="ghost"
                                size="sm"
                                onClick={() => dispatch({ type: 'DELETE_TEMPORADA', payload: temp.id })}
                              >
                                Remover
                              </AppButton>
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-2">
                          <input
                            value={novaTemporadaNome}
                            onChange={event => setNovaTemporadaNome(event.target.value)}
                            placeholder="Nova temporada…"
                            className="min-w-[12rem] flex-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 t-body"
                          />
                          <AppButton
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const nome = novaTemporadaNome.trim();
                              if (!nome || !user?.id) return;
                              const existente = acharTemporadaPorNome(form.id, nome, state.temporadas);
                              if (existente) {
                                setNovaTemporadaNome('');
                                return;
                              }
                              void dispatch({
                                type: 'ADD_TEMPORADA',
                                payload: {
                                  id: generateUUID(),
                                  userId: user.id,
                                  serieId: form.id,
                                  nome,
                                  createdAt: new Date().toISOString(),
                                },
                              });
                              setNovaTemporadaNome('');
                            }}
                          >
                            Adicionar
                          </AppButton>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </SettingsSectionCard>
          ) : null}

          <SettingsSectionCard padding="md" className={aba !== 'sobre' ? 'hidden' : undefined}
              title="Estratégia"
              description="Padrões usados ao criar conteúdos desta série."
            >

            <div className="stack-lg">
              <div className="grid-form">
                <div>
                  <FieldLabel>Pilar principal</FieldLabel>
                  <TagSelect
                    label="Pilar principal"
                    hideLabel
                    id="serie-pilar-principal"
                    maxSelections={1}
                    placeholder="Escolher…"
                    values={form.pilarPrincipalId ? [form.pilarPrincipalId] : []}
                    onChange={values => setForm(previous => ({
                      ...previous,
                      pilarPrincipalId: values[0] ?? null,
                    }))}
                    options={pilarChoices.map(item => ({ value: item.id, label: item.nome }))}
                    leadingIcon={selectedPilar ? (
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedPilar.cor }} />
                    ) : undefined}
                  />
                </div>
                <div>
                  <FieldLabel>Objetivo padrão</FieldLabel>
                  <SelectField
                    block
                    ariaLabel="Objetivo padrão"
                    value={form.funcaoPadrao ?? ''}
                    onChange={value => setForm(previous => ({
                      ...previous,
                      funcaoPadrao: (value || null) as typeof previous.funcaoPadrao,
                    }))}
                    options={[{ value: '', label: 'Escolher…' }, ...FUNCAO_OPTIONS.map(option => ({ value: option.value, label: option.label }))]}
                  />
                  {funcaoDescription ? (
                    <Text variant="meta" className="mt-1.5 block text-[var(--text-tertiary)]">
                      {funcaoDescription}
                    </Text>
                  ) : null}
                </div>
                <div className="col-span-full stack-sm">
                  <FieldLabel>Frequência de publicação</FieldLabel>
                  <SelectField
                    block
                    ariaLabel="Frequência de publicação"
                    value={form.frequenciaRecomendada.trim()
                      || (form.frequenciaVezes == null && !form.frequenciaUnidade.trim() ? 'Sob demanda' : '')}
                    onChange={frequenciaRecomendada => {
                      setForm(previous => ({
                        ...previous,
                        frequenciaRecomendada,
                        ...(escolhaSobDemanda(frequenciaRecomendada)
                          ? { frequenciaVezes: null, frequenciaUnidade: '' }
                          : {}),
                      }));
                    }}
                    options={frequenciaOpcoes.map(item => ({ value: item, label: item }))}
                  />
                  {selecionouSobDemanda && frequenciaLida.unidade === 'sob-demanda' ? (
                    <Text variant="meta" className="text-[var(--text-tertiary)]">
                      Quando houver roteiro
                    </Text>
                  ) : null}
                  {mostrarFrequenciaDetalhe ? (
                    <div className="grid-form">
                      <div>
                        <FieldLabel>Vezes</FieldLabel>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          aria-label="Vezes"
                          value={form.frequenciaVezes ?? ''}
                          onChange={event => {
                            const frequenciaVezes = parseVezes(event.target.value);
                            if (event.target.value.trim() && frequenciaVezes === null) return;
                            setForm(previous => ({ ...previous, frequenciaVezes }));
                          }}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <FieldLabel>Unidade</FieldLabel>
                        <SelectField
                          block
                          ariaLabel="Unidade"
                          value={form.frequenciaUnidade}
                          onChange={frequenciaUnidade => setForm(previous => ({
                            ...previous,
                            frequenciaUnidade,
                          }))}
                          options={[
                            { value: '', label: 'Escolher…' },
                            ...(unidadeExtra ? [{ value: unidadeExtra, label: unidadeExtra }] : []),
                            ...UNIDADES_FREQUENCIA.map(item => ({ value: item.value, label: item.label })),
                          ]}
                        />
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <FieldLabel>A partir de</FieldLabel>
                    <PropertyDatePicker
                      variant="field"
                      value={form.frequenciaAPartirDe || null}
                      onChange={value => setForm(previous => ({
                        ...previous,
                        frequenciaAPartirDe: value ?? '',
                      }))}
                    />
                  </div>
                  <Text variant="meta" className="text-[var(--text-secondary)]">
                    A frequência serve para comparar com o que já está no período. Ela não cria datas nem post-its.
                  </Text>
                  <Text variant="body">
                    {expectativaPeriodo == null
                      ? 'Quando houver roteiro'
                      : `Neste período, a frequência pede ${expectativaPeriodo}.`}
                  </Text>
                </div>
                <div>
                  <FieldLabel>Formato de publicação</FieldLabel>
                  <MultiChoiceField
                    id="serie-formato-publicacao"
                    label="Formato de publicação"
                    value={form.formatoVisualPadrao}
                    onChange={formatoVisualPadrao => setForm(previous => ({ ...previous, formatoVisualPadrao }))}
                    options={formatoOptions}
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Formato de apresentação</FieldLabel>
                <MultiChoiceField
                  id="serie-formato-apresentacao"
                  label="Formato de apresentação"
                  value={form.formatoApresentacao}
                  onChange={formatoApresentacao => setForm(previous => ({ ...previous, formatoApresentacao }))}
                  options={apresentacaoOptions}
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
                          'rounded-[var(--radius-input)] px-3 py-2 t-body-strong focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                          // Seleção é preta, como em todo o app; o rosa fica só para a ação principal.
                          selected
                            ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
                        )}
                      >
                        {ENERGIA_LABELS[value]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </SettingsSectionCard>

          <SettingsSectionCard padding="md" 
              title="Estrutura do roteiro"
              description="Modelo base para os conteúdos da série."
            >
            <textarea
              value={form.estruturaRoteiro}
              onChange={event => setForm(previous => ({...previous, estruturaRoteiro: event.target.value}))}
              placeholder="Estrutura base para os conteúdos desta série…"
              rows={7}
              className={cn(inputClass, 'min-h-[140px] resize-y leading-relaxed')}
            />
          </SettingsSectionCard>

          <SettingsSectionCard padding="md" 
              title="Templates de roteiro"
              description="Templates desta série para começar um roteiro."
              actions={
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
            >
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
          </SettingsSectionCard>
        </div>

        <aside className={cn('flex min-w-0 flex-col gap-3 lg:sticky lg:top-24 lg:self-start', aba === 'roteiros' && 'hidden')}>
          <SettingsSectionCard padding="md" className={cn('stack-sm', aba !== 'publicacao' && 'hidden')}
              title="Contas"
              description="Roteiros novos usam a legenda-base, salvo quando a conta tem a própria."
            >
            <LegendaBaseField
              id={`serie-legenda-base-${form.id}`}
              label="Legenda-base da série"
              compact
              value={form.legendaBase}
              placeholder="Texto de origem para os roteiros novos desta série."
              onChange={legendaBase => setForm(previous => ({ ...previous, legendaBase }))}
            />
            {contas.length === 0 ? (
              <Text variant="meta">Cadastre uma conta para definir legenda e hashtags.</Text>
            ) : (
              contas.map(conta => {
                const versao = form.plataformas.find(item => item.platformId === conta.id)?.legenda ?? '';
                const hashtags = form.plataformas.find(item => item.platformId === conta.id)?.hashtags || '';
                const propria = versao.trim().length > 0;
                const aberta = contaAberta === conta.id;
                const painelId = `conta-serie-${conta.id}`;
                return (
                  <div key={conta.id} className="rounded-[var(--radius-input)] border border-[var(--border-color)]">
                    <DisclosureButton
                      open={aberta}
                      onToggle={() => setContaAberta(atual => atual === conta.id ? null : conta.id)}
                      controls={painelId}
                      trailing={(
                        <Text variant="meta" as="span" className="shrink-0 whitespace-nowrap text-[var(--text-secondary)]">
                          {propria ? 'Versão própria' : 'Usando legenda-base'}
                        </Text>
                      )}
                    >
                      <PlatformIcon platform={iconeDaConta(conta)} className="h-4 w-4 shrink-0" />
                      <Text variant="body" as="span" className="min-w-0 truncate">
                        {rotuloConta(conta)}
                        {complementoDoRotulo(conta) ? (
                          <span className="text-[var(--text-secondary)]">{` ${complementoDoRotulo(conta)}`}</span>
                        ) : null}
                      </Text>
                    </DisclosureButton>
                    {aberta ? (
                      <div id={painelId} className="stack-sm px-2 pb-3">
                        <LegendaVersaoField
                          id={`serie-legenda-${conta.id}`}
                          icone={iconeDaConta(conta)}
                          rotulo={rotuloConta(conta)}
                          titulo="Legenda desta conta"
                          estado={propria ? 'propria' : 'base'}
                          texto={propria ? versao : form.legendaBase}
                          baseVazia={!form.legendaBase.trim()}
                          nomeDaBase="legenda-base da série"
                          alcanceDaBase="A conta volta a usar a legenda-base nos roteiros novos."
                          compact
                          semTitulo
                          onCriarPropria={() => updatePlatformLegenda(conta.id, form.legendaBase)}
                          onEditar={valor => updatePlatformLegenda(conta.id, valor)}
                          onVoltarParaBase={() => updatePlatformLegenda(conta.id, null)}
                        />
                        <div className="stack-xs">
                          <div className="flex items-center justify-between gap-2">
                            <Text variant="label" as="span">Hashtags</Text>
                            <AppButton
                              variant="secondary"
                              size="xs"
                              onClick={() => void copyHashtags(hashtags)}
                              disabled={!hashtags.trim()}
                              leftIcon={<Copy className="h-3.5 w-3.5" />}
                              aria-label={`Copiar hashtags de ${rotuloConta(conta)}`}
                            >
                              Copiar
                            </AppButton>
                          </div>
                          <textarea
                            aria-label="Hashtags desta conta"
                            value={hashtags}
                            onChange={event => updatePlatformHashtags(conta.id, event.target.value)}
                            placeholder="#hashtag1 #hashtag2"
                            rows={2}
                            className={cn(inputClass, 'min-h-[64px] resize-y leading-relaxed')}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </SettingsSectionCard>

          <Surface variant="outlined" padding="md" className={aba !== 'sobre' ? 'hidden' : undefined}>
            <SerieProductionMetricsPanel
              serie={serieForMetrics}
              contents={contents}
              lastEditLabel={lastEditLabel}
              onActiveChange={ativa => setForm(previous => ({ ...previous, ativa }))}
            />
          </Surface>
        </aside>
      </div>

      <ConfirmModal
        open={confirmDesvincular}
        message="Desfazer o vínculo remove esta série da meta e da herança do pai. Os episódios permanecem nesta série. Temporadas e classificações congeladas não mudam. O agrupamento nos relatórios muda."
        confirmLabel="Desfazer vínculo"
        cancelLabel="Manter vínculo"
        onConfirm={() => {
          setForm(previous => ({ ...previous, parentId: null }));
          setConfirmDesvincular(false);
          setMostrarAgrupar(false);
        }}
        onCancel={() => setConfirmDesvincular(false)}
      />
      <ConfirmModal
        open={Boolean(confirmParent)}
        message={confirmParent?.message ?? ''}
        confirmLabel="Continuar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (!confirmParent) return;
          const next = confirmParent.next;
          setForm(previous => ({
            ...previous,
            parentId: next,
          }));
          setConfirmParent(null);
        }}
        onCancel={() => setConfirmParent(null)}
      />
    </div>
  );
}
