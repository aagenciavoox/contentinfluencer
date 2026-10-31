import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown,
  Copy,
  Layers,
  Plus,
} from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
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
import { EntityColorPicker, entitySwatchInk } from './EntityColorPicker';
import { isSerieColorTaken } from '../lib/serieColors';
import { OpenInfoNotice } from '../../editorial/components/OpenInfoNotice';
import { LegendaBaseField } from '../../editorial/components/legendas/LegendaBaseField';
import { LegendaVersaoField } from '../../editorial/components/legendas/LegendaVersaoField';
import { complementoDoRotulo, iconeDaConta, rotuloConta } from '../../contas/lib/contas';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
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
import { pilarEfetivoDaSerie } from '../lib/serieAgrupamento';
import { erroDoVinculo, opcoesDePai } from '../lib/serieHierarquia';
import type { FuncaoPadraoSerie, SerieTipoAgrupamento } from '../../../lib/database';
import { FUNCAO_DESCRICOES, FUNCAO_LABELS, FUNCOES } from '../../editorial/lib/funcoes';
import { useAppContext } from '../../../context/AppContext';

const SERIE_DEFAULT_COR = '#6366f1';

const UNIDADES_FREQUENCIA = [
  { value: 'semana', label: 'Semana' },
  { value: 'quinzena', label: 'Quinzena' },
  { value: 'mes', label: 'Mês' },
] as const;

/**
 * Cada tipo tem o seu formulário. Quadro herda da série o que não aparece aqui;
 * temporadas são criadas na página da série.
 */
const SECOES_POR_TIPO: Record<SerieTipoAgrupamento, readonly string[]> = {
  familia: ['serie-identidade', 'serie-organizacao', 'serie-frequencia'],
  serie: [
    'serie-identidade',
    'serie-organizacao',
    'serie-frequencia',
    'serie-modelo',
    'serie-direcionamento',
    'serie-destinos',
    'serie-legendas',
  ],
  quadro: ['serie-identidade', 'serie-organizacao', 'serie-frequencia', 'serie-modelo'],
};

const NOME_DO_TIPO: Record<SerieTipoAgrupamento, { artigo: string; exemplo: string }> = {
  familia: { artigo: 'a família', exemplo: 'Ex.: Descomplicando' },
  serie: { artigo: 'a série', exemplo: 'Ex.: Descomplicando Branbran' },
  quadro: { artigo: 'o quadro', exemplo: 'Ex.: Por onde começo?' },
};

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
  { value: 'varia', label: 'Varia por roteiro', description: 'Cada roteiro escolhe o seu.' },
];

export type SerieEditChromeState = {
  isDirty: boolean;
  canSave: boolean;
  handleSave: () => void;
  handleCancel: () => void;
};

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

const SECOES_DO_FORMULARIO = [
  { id: 'serie-identidade', label: 'Identidade' },
  { id: 'serie-organizacao', label: 'Organização' },
  { id: 'serie-frequencia', label: 'Frequência' },
  { id: 'serie-modelo', label: 'Modelo de roteiro' },
  { id: 'serie-direcionamento', label: 'Direcionamento editorial' },
  { id: 'serie-destinos', label: 'Destinos e formatos' },
  { id: 'serie-legendas', label: 'Legendas e hashtags' },
] as const;

export function SerieEditForm({
  initial,
  tipo = 'serie',
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
  /** Família, série ou quadro: define as seções e o vínculo aceito. */
  tipo?: SerieTipoAgrupamento;
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
  const { state } = useAppContext();
  const [tentouSalvar, setTentouSalvar] = useState(false);
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
      tipoAgrupamento: initial.tipoAgrupamento ?? null,
      semPilar: initial.semPilar === true,
      plataformas: initial.plataformas || [],
    },
  });

  const [form, setForm] = useState(initialSnapshot.current.form);

  const isDirty = useMemo(() => {
    const snap = initialSnapshot.current;
    if (form.name !== snap.form.name) return true;
    if (form.notes !== snap.form.notes) return true;
    if (form.tipoAgrupamento !== snap.form.tipoAgrupamento) return true;
    if (form.semPilar !== snap.form.semPilar) return true;
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
  const erroVinculo = erroDoVinculo(tipo, form.parentId, form.id, series);
  const valido = Boolean(form.name.trim()) && !colorTaken && !erroVinculo;
  const erroNome = tentouSalvar && !form.name.trim() ? `Dê um nome para identificar ${NOME_DO_TIPO[tipo].artigo}.` : null;
  const erroCor = colorTaken ? 'Esta cor já está em outra série. Escolha outra.' : null;

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
    if (!form.name.trim() || colorTaken || erroVinculo) {
      // Os campos continuam como estão; o que falta aparece marcado.
      setTentouSalvar(true);
      const alvo = !form.name.trim() ? 'serie-nome' : colorTaken ? 'serie-identidade' : 'serie-organizacao';
      document.getElementById(alvo)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

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
      tipoAgrupamento: tipo,
      semPilar: !form.pilarPrincipalId && form.semPilar,
      pilarIds: form.pilarPrincipalId ? [form.pilarPrincipalId] : [],
      plataformas: contas
        .map(conta => form.plataformas.find(item => item.platformId === conta.id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item && (item.hashtags.trim() || (item.legenda ?? '').trim())))
        .map(item => ({...item, hashtags: item.hashtags.trim(), legenda: item.legenda?.trim() || null})),
      createdAt: initial.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [colorTaken, contas, erroVinculo, form, initial.createdAt, onSave, tipo]);

  useUnsavedChangesRegistration(isDirty, () => {
    if (valido) handleSaveRef.current();
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
      // O botão fica sempre ativo: com erro, o formulário marca o que falta e guarda o resto.
      canSave: true,
      handleSave: () => handleSaveRef.current(),
      handleCancel: () => onCancelRef.current(),
    });
  }, [isDirty]);

  const copyHashtags = async (value: string) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  const coverPreview = /^https?:\/\//i.test(form.capaUrl.trim()) ? form.capaUrl.trim() : '';
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
  const existe = series.some(item => item.id === form.id);
  const opcoesDoPai = opcoesDePai(tipo, form.id, series);
  // Vínculo antigo fora da ordem continua visível para poder ser trocado.
  const paiForaDaOrdem = form.parentId && !opcoesDoPai.some(item => item.id === form.parentId)
    ? series.find(item => item.id === form.parentId) ?? null
    : null;
  const mostra = (secao: string) => SECOES_POR_TIPO[tipo].includes(secao);
  const rotuloDoPai = tipo === 'quadro' ? 'Série' : 'Família';
  const nomeDoPai = form.parentId ? series.find(item => item.id === form.parentId)?.name?.trim() || null : null;
  const pilarDoPai = form.parentId ? pilarEfetivoDaSerie(form.parentId, series) : null;
  const nomePilarDoPai = pilarDoPai?.pilarId ? pilares.find(item => item.id === pilarDoPai.pilarId)?.nome ?? null : null;
  const metaCompartilhada = Boolean(form.parentId) && selecionouSobDemanda && form.frequenciaVezes === null;

  return (
    <div className="relative w-full">
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
      {tentouSalvar && !valido ? (
        <div role="alert" className="mb-3 rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--bg-elevated)] px-4 py-3">
          <Text variant="body" as="p">Corrija o que está marcado para salvar. O que você preencheu continua aqui.</Text>
        </div>
      ) : null}

      <div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
        <div className="flex min-w-0 flex-col gap-3">
          <Surface id="serie-identidade" variant="outlined" padding="md" className="scroll-mt-24">
            <CardHeading title="Identidade" />
            <div className="stack-lg">
              <div>
                <label htmlFor="serie-nome">
                  <FieldLabel required>Nome</FieldLabel>
                </label>
                <input
                  id="serie-nome"
                  type="text"
                  value={form.name}
                  aria-invalid={erroNome ? true : undefined}
                  aria-describedby={erroNome ? 'serie-nome-erro' : undefined}
                  onChange={event => setForm(previous => ({...previous, name: event.target.value}))}
                  placeholder={NOME_DO_TIPO[tipo].exemplo}
                  className={inputClass}
                  style={erroNome ? { borderColor: 'var(--danger)' } : undefined}
                />
                {erroNome ? (
                  <p id="serie-nome-erro" className="mt-1.5 t-meta" style={{ color: 'var(--danger)' }}>{erroNome}</p>
                ) : null}
              </div>

              <div className="grid-form">
                <div>
                  <FieldLabel>Cor</FieldLabel>
                  <EntityColorPicker
                    variant="inline"
                    value={form.cor}
                    unavailableColors={takenColors}
                    onChange={cor => setForm(previous => ({...previous, cor}))}
                  />
                  {erroCor ? <p className="mt-1.5 t-meta" style={{ color: 'var(--danger)' }}>{erroCor}</p> : null}
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

              <div>
                <label htmlFor="serie-jargao">
                  <FieldLabel optional>Jargão</FieldLabel>
                </label>
                <input
                  id="serie-jargao"
                  type="text"
                  value={form.bordao}
                  onChange={event => setForm(previous => ({...previous, bordao: event.target.value}))}
                  placeholder="Ex.: vamos descomplicar isso"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="serie-descricao">
                  <FieldLabel optional>Descrição</FieldLabel>
                </label>
                <textarea
                  id="serie-descricao"
                  value={form.notes}
                  onChange={event => setForm(previous => ({...previous, notes: event.target.value}))}
                  placeholder={`Do que ${NOME_DO_TIPO[tipo].artigo} trata, em uma ou duas frases.`}
                  rows={2}
                  className={cn(inputClass, 'resize-y leading-relaxed')}
                />
              </div>
            </div>
          </Surface>

          <Surface id="serie-organizacao" variant="outlined" padding="md" className="scroll-mt-24">
            <CardHeading title="Organização" />
            <div className="stack-lg">
              <div className="grid-form">
                {tipo === 'familia' ? null : (
                  <div className="col-span-full">
                    <FieldLabel required={tipo === 'quadro'}>{rotuloDoPai}</FieldLabel>
                    <SelectField
                      block
                      ariaLabel={rotuloDoPai}
                      value={form.parentId ?? ''}
                      onChange={parentId => {
                        const next = parentId || null;
                        if (next === (form.parentId ?? null)) return;
                        if (existe && (form.parentId || next)) {
                          setConfirmParent({
                            next,
                            message: form.parentId
                              ? 'Mudar de lugar pode alterar o agrupamento dos relatórios, porque a análise lê a série ao vivo. Classificação congelada permanece. Os conteúdos continuam aqui.'
                              : 'Colocar numa família pode mudar a meta e o que esta série herda dela. Os conteúdos continuam nesta série.',
                          });
                          return;
                        }
                        setForm(previous => ({ ...previous, parentId: next }));
                      }}
                      options={[
                        ...(tipo === 'serie'
                          ? [{ value: '', label: 'Nenhuma (série independente)' }]
                          : form.parentId ? [] : [{ value: '', label: 'Escolher…' }]),
                        ...(paiForaDaOrdem ? [{ value: paiForaDaOrdem.id, label: paiForaDaOrdem.name }] : []),
                        ...opcoesDoPai.map(item => ({ value: item.id, label: item.name })),
                      ]}
                    />
                    {erroVinculo && (tentouSalvar || form.parentId) ? (
                      <p className="mt-1.5 t-meta" style={{ color: 'var(--danger)' }}>{erroVinculo}</p>
                    ) : tipo === 'serie' && opcoesDoPai.length === 0 && !form.parentId ? (
                      <Text variant="meta" as="p" className="mt-1.5 text-[var(--text-tertiary)]">
                        Nenhuma família criada. A série pode ficar independente.
                      </Text>
                    ) : null}
                    {tipo === 'serie' && form.parentId && existe ? (
                      <AppButton variant="secondary" size="sm" onClick={() => setConfirmDesvincular(true)} className="mt-2">
                        Tirar da família
                      </AppButton>
                    ) : null}
                  </div>
                )}
                <div>
                  <FieldLabel>Pilar</FieldLabel>
                  <SelectField
                    block
                    ariaLabel="Pilar"
                    value={form.pilarPrincipalId ?? (form.semPilar ? '__sem' : '__herdar')}
                    leadingIcon={selectedPilar ? (
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedPilar.cor }} />
                    ) : undefined}
                    onChange={valor => setForm(previous => ({
                      ...previous,
                      pilarPrincipalId: valor === '__sem' || valor === '__herdar' ? null : valor,
                      semPilar: valor === '__sem',
                    }))}
                    options={[
                      {
                        value: '__herdar',
                        label: form.parentId
                          ? `Herdar de ${nomeDoPai || 'agrupamento superior'}${nomePilarDoPai ? ` (${nomePilarDoPai})` : ''}`
                          : 'Escolher…',
                      },
                      ...pilarChoices.map(item => ({ value: item.id, label: item.nome })),
                      { value: '__sem', label: 'Sem pilar' },
                    ]}
                  />
                  <Text variant="meta" as="p" className="mt-1.5 text-[var(--text-tertiary)]">
                    {form.pilarPrincipalId
                      ? tipo === 'familia'
                        ? 'Séries da família sem escolha própria usam este.'
                        : tipo === 'serie' ? 'Quadros sem escolha própria usam este.' : 'Pilar deste quadro.'
                      : form.semPilar
                        ? 'Fica sem pilar de propósito: não herda do agrupamento superior.'
                        : form.parentId
                          ? 'Usa o pilar do agrupamento superior enquanto não houver escolha aqui.'
                          : 'Escolha no Editorial os pilares disponíveis.'}
                  </Text>
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
                    options={[
                      { value: '', label: form.parentId ? `Herdar de ${nomeDoPai || 'agrupamento superior'}` : 'Escolher…' },
                      ...FUNCAO_OPTIONS.map(option => ({ value: option.value, label: option.label })),
                    ]}
                  />
                  {funcaoDescription ? (
                    <Text variant="meta" className="mt-1.5 block text-[var(--text-tertiary)]">
                      {funcaoDescription}
                    </Text>
                  ) : null}
                </div>
              </div>
            </div>
          </Surface>

          <Surface id="serie-frequencia" variant="outlined" padding="md" className="scroll-mt-24">
            <CardHeading title="Frequência" />
            <div className="stack-lg">
              {form.parentId ? (
                <div className="stack-sm">
                  <FieldLabel>Meta</FieldLabel>
                  <SelectField
                    block
                    ariaLabel="Meta"
                    value={metaCompartilhada ? 'compartilhada' : 'propria'}
                    onChange={valor => setForm(previous => (valor === 'compartilhada'
                      ? { ...previous, frequenciaRecomendada: 'Sob demanda', frequenciaVezes: null, frequenciaUnidade: '' }
                      : { ...previous, frequenciaRecomendada: previous.frequenciaRecomendada === 'Sob demanda' ? '' : previous.frequenciaRecomendada }))}
                    options={[
                      { value: 'compartilhada', label: `Compartilhada com ${nomeDoPai || 'o agrupamento superior'}` },
                      { value: 'propria', label: 'Meta própria' },
                    ]}
                  />
                  {metaCompartilhada ? (
                    <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                      Os conteúdos daqui contam na frequência de {nomeDoPai || 'o agrupamento superior'}.
                    </Text>
                  ) : null}
                </div>
              ) : null}
              {form.parentId && metaCompartilhada ? null : (
                <div className="col-span-full stack-sm">
                  <FieldLabel>Frequência de publicação</FieldLabel>
                  <SelectField
                    block
                    ariaLabel="Frequência de publicação"
                    value={form.frequenciaRecomendada}
                    onChange={frequenciaRecomendada => {
                      setForm(previous => ({
                        ...previous,
                        frequenciaRecomendada,
                        ...(escolhaSobDemanda(frequenciaRecomendada)
                          ? { frequenciaVezes: null, frequenciaUnidade: '' }
                          : {}),
                      }));
                    }}
                    options={[{ value: '', label: 'Escolher…' }, ...frequenciaOpcoes.map(item => ({ value: item, label: item }))]}
                  />
                  {selecionouSobDemanda && frequenciaLida.unidade === 'sob-demanda' ? (
                    <Text variant="meta" className="text-[var(--text-tertiary)]">
                      Quando houver pauta
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
                    <input
                      type="date"
                      aria-label="A partir de"
                      value={form.frequenciaAPartirDe}
                      onChange={event => setForm(previous => ({
                        ...previous,
                        frequenciaAPartirDe: event.target.value,
                      }))}
                      className={inputClass}
                    />
                  </div>
                  <Text variant="body">
                    {expectativaPeriodo == null
                      ? 'Quando houver pauta'
                      : `Neste período, a frequência pede ${expectativaPeriodo}.`}
                  </Text>
                </div>
              )}
            </div>
          </Surface>

          {mostra('serie-modelo') ? (
            <>
          <Surface id="serie-modelo" variant="outlined" padding="md" className="scroll-mt-24">
            <CardHeading
              title="Modelo de roteiro"
              description="Estrutura sugerida para os conteúdos novos. Os que já existem não mudam."
            />
            <textarea
              value={form.estruturaRoteiro}
              onChange={event => setForm(previous => ({...previous, estruturaRoteiro: event.target.value}))}
              placeholder="Estrutura base para os roteiros desta série…"
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
            </>
          ) : null}

          {mostra('serie-direcionamento') ? (
            <>
          <Surface id="serie-direcionamento" variant="outlined" padding="md" className="scroll-mt-24">
            <CardHeading title="Direcionamento editorial" />
            <div className="stack-lg">
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

            </div>
          </Surface>
            </>
          ) : null}

          {mostra('serie-destinos') ? (
            <>
          <Surface id="serie-destinos" variant="outlined" padding="md" className="scroll-mt-24">
            <CardHeading title="Destinos e formatos" />
            <div className="stack-lg">
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
                          'rounded-[var(--radius-input)] px-3 py-2 t-button focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
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
          </Surface>
            </>
          ) : null}

          {mostra('serie-legendas') ? (
            <>
          <Surface id="serie-legendas" variant="outlined" padding="md" className="scroll-mt-24 stack-md">
            <CardHeading
              title="Legendas e hashtags"
              description="Orientam os conteúdos novos. Ao salvar, só atualiza conteúdos que ainda seguem este texto e não foram publicados, e só se você confirmar."
            />
            <LegendaBaseField
              id={`serie-legenda-base-${form.id}`}
              label="Legenda-base da série"
              compact
              value={form.legendaBase}
              placeholder="Texto de origem para os roteiros novos desta série."
              onChange={legendaBase => setForm(previous => ({ ...previous, legendaBase }))}
            />
            {contas.length === 0 ? (
              <Text variant="meta">Cadastre uma conta para criar uma versão por plataforma.</Text>
            ) : (
              contas.map(conta => {
                const versao = form.plataformas.find(item => item.platformId === conta.id)?.legenda ?? '';
                const propria = versao.trim().length > 0;
                return (
                  <LegendaVersaoField
                    key={conta.id}
                    id={`serie-legenda-${conta.id}`}
                    icone={iconeDaConta(conta)}
                    rotulo={rotuloConta(conta)}
                    detalhe={complementoDoRotulo(conta)}
                    titulo="Versão desta conta"
                    estado={propria ? 'propria' : 'base'}
                    texto={propria ? versao : form.legendaBase}
                    baseVazia={!form.legendaBase.trim()}
                    nomeDaBase="legenda-base da série"
                    alcanceDaBase="Esta conta voltará a acompanhar a legenda-base da série. Roteiros novos usam esse texto. Roteiros já publicados e adaptações manuais não mudam ao salvar."
                    compact
                    onCriarPropria={() => updatePlatformLegenda(conta.id, form.legendaBase)}
                    onEditar={valor => updatePlatformLegenda(conta.id, valor)}
                    onVoltarParaBase={() => updatePlatformLegenda(conta.id, null)}
                  />
                );
              })
            )}
            <div className="stack-sm border-t border-[var(--border-color)] pt-4">
              <Text variant="label" as="p">Hashtags por conta</Text>
            {contas.length === 0 ? (
              <Text variant="meta" className="text-[var(--text-tertiary)]">
                Nenhuma conta ativa configurada.
              </Text>
            ) : (
              <div className="stack-md">
                {contas.map(conta => {
                  const value = form.plataformas.find(item => item.platformId === conta.id)?.hashtags || '';
                  return (
                    <div key={conta.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <PlatformIcon platform={iconeDaConta(conta)} className="h-4 w-4 shrink-0" />
                          <Text variant="meta" className="text-[var(--text-primary)]">
                            {rotuloConta(conta)}
                          </Text>
                        </div>
                        <AppButton
                          variant="secondary"
                          size="xs"
                          onClick={() => void copyHashtags(value)}
                          disabled={!value.trim()}
                          leftIcon={<Copy className="h-3.5 w-3.5" />}
                          className="pointer-coarse:h-11"
                          aria-label={`Copiar hashtags de ${rotuloConta(conta)}`}
                        >
                          Copiar
                        </AppButton>
                      </div>
                      <textarea
                        value={value}
                        onChange={event => updatePlatformHashtags(conta.id, event.target.value)}
                        placeholder="#hashtag1 #hashtag2"
                        rows={2}
                        className={cn(inputClass, 'min-h-[64px] resize-y leading-relaxed')}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </Surface>
            </>
          ) : null}

        </div>

        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Seções do formulário" className="hidden lg:block">
            <ul className="stack-xs">
              {SECOES_DO_FORMULARIO.filter(secao => mostra(secao.id)).map(secao => (
                <li key={secao.id}>
                  <a
                    href={`#${secao.id}`}
                    onClick={event => {
                      event.preventDefault();
                      document.getElementById(secao.id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
                    }}
                    className="block rounded-[var(--radius-sm)] px-2 py-1.5 t-secondary text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    {secao.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {existe ? (
          <Surface variant="outlined" padding="md">
            <SerieProductionMetricsPanel
              serie={serieForMetrics}
              contents={contents}
              series={state.series}
              lastEditLabel={lastEditLabel}
              onActiveChange={ativa => setForm(previous => ({ ...previous, ativa }))}
            />
          </Surface>
          ) : null}
        </aside>
      </div>

      <ConfirmModal
        open={confirmDesvincular}
        message="Desfazer o vínculo tira esta série da meta e da herança do agrupamento superior. Os conteúdos continuam nesta série. Temporadas e classificações congeladas não mudam. O agrupamento nos relatórios muda."
        confirmLabel="Desfazer vínculo"
        cancelLabel="Manter vínculo"
        onConfirm={() => {
          setForm(previous => ({ ...previous, parentId: null }));
          setConfirmDesvincular(false);
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
            ...(next && !previous.frequenciaRecomendada.trim()
              ? { frequenciaRecomendada: 'Sob demanda', frequenciaVezes: null, frequenciaUnidade: '' }
              : {}),
          }));
          setConfirmParent(null);
        }}
        onCancel={() => setConfirmParent(null)}
      />
    </div>
  );
}
