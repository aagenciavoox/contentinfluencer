import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronDown,
  Copy,
} from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { ChoiceChips } from '../../../components/ui/ChoiceChips';
import { MultiFilterChips } from '../../../components/ui/MultiFilterChips';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Surface } from '../../../components/ui/Surface';
import { SelectField } from '../../../components/ui/SelectField';
import { Text } from '../../../components/ui/Text';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { CoverUploadField } from '../../library/components/CoverUploadField';
import {
  normalizeFormatoList,
  type Content,
  type FuncaoPadraoSerie,
  type Pilar,
  type Platform,
  type Serie,
  type SerieTipoAgrupamento,
  type ModoSequenciaSerie,
} from '../../../lib/database';
import { SerieProductionMetricsPanel } from './SerieProductionMetricsPanel';
import { templateToHtml } from '../../contents/lib/seriesScriptTemplate';
import { cn } from '../../../lib/utils';
import { RedeChips } from '../../planejamento/components/RedeChips';
import { normalizarRedesPostIt } from '../../planejamento/lib/redesPostIt';
import { useUnsavedChangesRegistration } from '../../../hooks/useUnsavedChangesRegistration';
import { generateUUID } from '../../../utils/uuid';
import { EntityColorPicker } from './EntityColorPicker';
import { isSerieColorTaken } from '../lib/serieColors';
import {
  AJUDA_MODO_SEQUENCIA,
  lerModoSequencia,
  ROTULO_MODO_SEQUENCIA,
} from '../lib/modoSequencia';
import { acompanhaNoGeral, comAcompanhamentoGeral } from '../../editorial/lib/acompanhamento';
import { OpenInfoNotice } from '../../editorial/components/OpenInfoNotice';
import { LegendaBaseField } from '../../editorial/components/legendas/LegendaBaseField';
import { LegendaVersaoField } from '../../editorial/components/legendas/LegendaVersaoField';
import { complementoDoRotulo, iconeDaConta, rotuloConta } from '../../contas/lib/contas';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import {
  collectFormatoSuggestions,
  ENERGIA_LABELS,
  ENERGIA_NIVEIS,
} from '../../editorial/lib/editorialOptions';
import { lerFrequencia } from '../../editorial/lib/frequenciaSerie';
import { FrequenciaChip } from '../../editorial/components/FrequenciaChip';
import type { FrequenciaGravada } from '../../editorial/lib/metaDaOnda';
import { pilarPrincipalDaSerie } from '../../editorial/lib/pilarDaSerie';
import { getSerieOpenItems, type SerieOpenItemKey } from '../../editorial/lib/serieCompleteness';
import { pilarEfetivoDaSerie } from '../lib/serieAgrupamento';
import { erroDoVinculo, opcoesDePai } from '../lib/serieHierarquia';
import { FUNCAO_DESCRICOES, FUNCAO_LABELS, FUNCOES } from '../../editorial/lib/funcoes';
import { useAppContext } from '../../../context/AppContext';
import { QuadrosETemporadasSection } from './series-detail/QuadrosETemporadasSection';

const SERIE_DEFAULT_COR = '#6366f1';

const UNIDADES_FREQUENCIA = [
  { value: 'semana', label: 'Semana' },
  { value: 'quinzena', label: 'A cada 14 dias' },
  { value: 'mes', label: 'Mês' },
] as const;

const NOME_DO_TIPO: Record<SerieTipoAgrupamento, { artigo: string; exemplo: string }> = {
  familia: { artigo: 'a família', exemplo: 'Ex.: Descomplicando' },
  serie: { artigo: 'a série', exemplo: 'Ex.: Descomplicando Branbran' },
  quadro: { artigo: 'o quadro', exemplo: 'Ex.: Cosmere sem TCC' },
};

function diaFrequencia(value: string | null | undefined): string {
  const candidato = value?.trim().slice(0, 10) ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(candidato) ? candidato : '';
}

function parseVezes(raw: string): number | null {
  if (!raw.trim()) return null;
  if (!/^\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

function unirOrientacoesIniciais(motivoSalvar?: string | null, motivoEnviar?: string | null): string {
  return [motivoSalvar?.trim(), motivoEnviar?.trim()].filter(Boolean).join('\n');
}

function formatarFrequenciaRecomendada(vezes: number | null, unidade: string): string | null {
  const u = unidade.trim().toLowerCase();
  const qtd = vezes && vezes > 0 ? vezes : 1;
  if (u === 'semana') return qtd === 1 ? 'Semanal' : `${qtd} por semana`;
  if (u === 'quinzena') return qtd === 1 ? 'Quinzenal' : `${qtd} por quinzena`;
  if (u === 'mes') return qtd === 1 ? 'Mensal' : `${qtd} por mês`;
  return null;
}

function formatarResumoMeta(vezes: number | null, unidade: string, aPartirDe: string): string {
  const qtd = vezes && vezes > 0 ? vezes : 1;
  const ep = qtd === 1 ? '1 episódio' : `${qtd} episódios`;
  const periodo = unidade === 'quinzena' ? 'a cada 14 dias' : unidade === 'mes' ? 'por mês' : 'por semana';
  let dataLabel = '';
  if (aPartirDe && /^\d{4}-\d{2}-\d{2}$/.test(aPartirDe)) {
    try {
      dataLabel = `, a partir de ${format(parseISO(aPartirDe), "d 'de' MMMM", { locale: ptBR })}`;
    } catch {
      dataLabel = '';
    }
  }
  return `${ep} ${periodo}${dataLabel}`;
}

function limparHtmlModelo(html: string): string {
  return html
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

type AbaSerie = 'publicacao' | 'definicoes';

const CAMPO_DA_PENDENCIA: Record<SerieOpenItemKey, { aba: AbaSerie; id: string }> = {
  frequencia: { aba: 'publicacao', id: 'serie-meta' },
  formato: { aba: 'publicacao', id: 'serie-formatos' },
  pilar: { aba: 'definicoes', id: 'serie-pilar' },
  funcao: { aba: 'definicoes', id: 'serie-objetivo' },
  energia: { aba: 'definicoes', id: 'serie-esforco' },
};

function focarElemento(elementId: string) {
  window.requestAnimationFrame(() => {
    const node = document.getElementById(elementId);
    if (!node) return;
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (node instanceof HTMLElement) node.focus({ preventScroll: true });
  });
}

function EditorSection({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--border-color)] pt-6 first:border-t-0 first:pt-0 stack-md">
      <div className="stack-xs">
        <Text variant="meta" className="tabular-nums text-[var(--text-tertiary)]">{index}</Text>
        <Text variant="itemTitle" as="h3">{title}</Text>
        {description ? (
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">{description}</Text>
        ) : null}
      </div>
      {children}
    </section>
  );
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

function CollapsibleSection({
  id,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Surface id={id} variant="outlined" padding="md" className="scroll-mt-24">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <div className="min-w-0 stack-xs">
          <Text variant="itemTitle">{title}</Text>
          {description ? (
            <Text variant="meta" className="text-[var(--text-secondary)]">
              {description}
            </Text>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="mt-4 border-t border-[var(--border-color)] pt-4 stack-lg">
          {children}
        </div>
      ) : null}
    </Surface>
  );
}

/** Várias escolhas em chips, mais um campo para um valor próprio. */
function MultiChoiceField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Outro formato…',
}: {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: readonly string[];
  placeholder?: string;
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
          placeholder={placeholder}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addDraft();
            }
          }}
          className={cn(inputClass, 'min-w-0 flex-1')}
        />
        <AppButton variant="secondary" size="sm" onClick={addDraft} disabled={!draft.trim()}>
          Adicionar
        </AppButton>
      </div>
    </div>
  );
}

function LinhaAjusteConta({
  contaId,
  icone,
  rotulo,
  detalhe,
  aberta,
  onToggle,
  legendaBase,
  versao,
  hashtags,
  onLegenda,
  onHashtags,
  onCopiar,
}: {
  contaId: string;
  icone: string;
  rotulo: string;
  detalhe?: string | null;
  aberta: boolean;
  onToggle: () => void;
  legendaBase: string;
  versao: string;
  hashtags: string;
  onLegenda: (valor: string | null) => void;
  onHashtags: (valor: string) => void;
  onCopiar: (valor: string) => void;
}) {
  const propria = versao.trim().length > 0;
  const estado = propria ? 'Legenda própria' : hashtags.trim() ? 'Hashtags próprias' : 'Usa a legenda-base';
  return (
    <div className="border-b border-[var(--border-color)] py-3 last:border-b-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <PlatformIcon platform={icone} className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
          <div className="min-w-0 flex-1">
            <Text variant="bodyStrong" as="p" className="truncate">{rotulo}</Text>
            <Text variant="meta" as="p" className="truncate text-[var(--text-secondary)]">
              {detalhe ? `${detalhe} · ${estado}` : estado}
            </Text>
          </div>
        </div>
        <AppButton
          variant="ghost"
          size="sm"
          className="self-start sm:shrink-0"
          aria-expanded={aberta}
          aria-controls={`ajuste-conta-${contaId}`}
          onClick={onToggle}
        >
          {aberta ? 'Ocultar' : 'Personalizar'}
        </AppButton>
      </div>
      {aberta ? (
        <div id={`ajuste-conta-${contaId}`} className="mt-3 stack-md">
          <LegendaVersaoField
            id={`serie-legenda-${contaId}`}
            icone={icone}
            rotulo={rotulo}
            detalhe={detalhe}
            titulo="Legenda desta conta"
            estado={propria ? 'propria' : 'base'}
            texto={propria ? versao : legendaBase}
            baseVazia={!legendaBase.trim()}
            nomeDaBase="legenda-base da série"
            alcanceDaBase="Esta conta voltará a acompanhar a legenda-base da série."
            compact
            ocultarCabecalho
            onCriarPropria={() => onLegenda(legendaBase)}
            onEditar={valor => onLegenda(valor)}
            onVoltarParaBase={() => onLegenda(null)}
          />
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor={`serie-hashtags-${contaId}`}>
                <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                  {`Hashtags em ${rotulo}`}
                </Text>
              </label>
              <AppButton
                variant="secondary"
                size="xs"
                onClick={() => onCopiar(hashtags)}
                disabled={!hashtags.trim()}
                leftIcon={<Copy className="h-3.5 w-3.5" />}
                aria-label={`Copiar hashtags de ${rotulo}`}
              >
                Copiar
              </AppButton>
            </div>
            <textarea
              id={`serie-hashtags-${contaId}`}
              value={hashtags}
              onChange={event => onHashtags(event.target.value)}
              placeholder="#hashtag1 #hashtag2"
              rows={2}
              className={cn(inputClass, 'min-h-[60px] resize-y leading-relaxed')}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputClass =
  'ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 t-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

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
  inModal = false,
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
  inModal?: boolean;
}) {
  const { state } = useAppContext();
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [abaSerie, setAbaSerie] = useState<AbaSerie>('publicacao');
  const focoPendente = useRef<string | null>(null);
  const [contasAbertas, setContasAbertas] = useState<Record<string, boolean>>(() => {
    const aberto: Record<string, boolean> = {};
    for (const item of initial.plataformas ?? []) {
      if (item.legenda?.trim() || item.hashtags?.trim()) aberto[item.platformId] = true;
    }
    return aberto;
  });

  const frequenciaInicial = lerFrequencia({
    frequenciaRecomendada: initial.frequenciaRecomendada,
    vezes: initial.frequenciaVezes,
    unidade: initial.frequenciaUnidade,
    aPartirDe: initial.frequenciaAPartirDe,
  });
  const temMetaInicial = frequenciaInicial.unidade !== 'sob-demanda';
  const estruturaInicial = (initial.estruturaRoteiro || initial.template || '').trim();
  const orientacoesIniciais = unirOrientacoesIniciais(initial.motivoSalvar, initial.motivoEnviar);

  const initialSnapshot = useRef({
    form: {
      id: initial.id || generateUUID(),
      userId: initial.userId || '',
      name: initial.name || '',
      template: initial.template || '',
      notes: initial.notes || '',
      slotPadrao: initial.slotPadrao || null,
      formatoVisualPadrao: normalizeFormatoList(initial.formatoVisualPadrao),
      estruturaRoteiro: estruturaInicial,
      cor: initial.cor || SERIE_DEFAULT_COR,
      capaUrl: initial.capaUrl || '',
      ativa: initial.ativa ?? true,
      temMeta: tipo === 'familia' ? false : temMetaInicial,
      frequenciaVezes: temMetaInicial ? (frequenciaInicial.vezes ?? 1) : null,
      frequenciaUnidade: (temMetaInicial ? frequenciaInicial.unidade : 'semana') as string,
      frequenciaAPartirDe: diaFrequencia(initial.frequenciaAPartirDe),
      funcaoPadrao: initial.funcaoPadrao || null,
      energiaPadrao: initial.energiaPadrao || null,
      pilarPrincipalId: pilarPrincipalDaSerie(initial),
      orientacoesEditoriais: orientacoesIniciais,
      legendaBase: initial.legendaBase || '',
      parentId: initial.parentId ?? null,
      usaTemporadas: initial.usaTemporadas === true,
      focoRedes: normalizarRedesPostIt(initial.focoRedes ?? []),
      modoSequencia: lerModoSequencia(initial.modoSequencia) ?? 'ordem_temporada',
      tipoAgrupamento: initial.tipoAgrupamento ?? null,
      semPilar: initial.semPilar === true,
      acompanharContinuidade: acompanhaNoGeral({ id: initial.id ?? '', acompanharContinuidade: initial.acompanharContinuidade, acompanhamentos: initial.acompanhamentos }),
      plataformas: initial.plataformas || [],
    },
  });

  const [form, setForm] = useState(initialSnapshot.current.form);

  const seriePai = useMemo(
    () => (form.parentId ? series.find(item => item.id === form.parentId) ?? null : null),
    [form.parentId, series],
  );

  // Modos explícitos de herança no Quadro ("Usar da série" vs "Definir outro")
  const [modoModelo, setModoModelo] = useState<'herdar' | 'nenhum' | 'proprio'>(() => {
    if (estruturaInicial) return 'proprio';
    return tipo === 'quadro' ? 'herdar' : 'nenhum';
  });
  const [templateEscolhidoId, setTemplateEscolhidoId] = useState<string>('');

  const [quadroIdentidadePropria, setQuadroIdentidadePropria] = useState<boolean>(() => {
    if (tipo !== 'quadro') return true;
    if (initial.usaCorDaSerie) return false;
    const temCapa = Boolean(initial.capaUrl?.trim());
    const corDiferente = Boolean(initial.cor && seriePai?.cor && initial.cor !== seriePai.cor);
    return temCapa || corDiferente;
  });
  const [quadroOrientacoesProprias, setQuadroOrientacoesProprias] = useState<boolean>(
    () => tipo !== 'quadro' || Boolean(orientacoesIniciais),
  );
  const [quadroFormatosProprios, setQuadroFormatosProprios] = useState<boolean>(
    () => tipo !== 'quadro' || normalizeFormatoList(initial.formatoVisualPadrao).length > 0,
  );
  const [quadroLegendaPropria, setQuadroLegendaPropria] = useState<boolean>(
    () => tipo !== 'quadro' || Boolean(initial.legendaBase?.trim()),
  );
  const [quadroContasProprias, setQuadroContasProprias] = useState<boolean>(
    () => tipo !== 'quadro' || (initial.plataformas?.length ?? 0) > 0,
  );

  const roteiroTemplates = useMemo(
    () => state.templates.filter(tpl => tpl.ativo && (tpl.type ?? 'roteiro') === 'roteiro'),
    [state.templates],
  );

  const isDirty = useMemo(() => {
    const snap = initialSnapshot.current;
    if (form.name !== snap.form.name) return true;
    if (form.notes !== snap.form.notes) return true;
    if (form.tipoAgrupamento !== snap.form.tipoAgrupamento) return true;
    if (form.semPilar !== snap.form.semPilar) return true;
    if (form.acompanharContinuidade !== snap.form.acompanharContinuidade) return true;
    if (form.cor !== snap.form.cor) return true;
    if (form.capaUrl !== snap.form.capaUrl) return true;
    if (form.estruturaRoteiro !== snap.form.estruturaRoteiro) return true;
    if (form.temMeta !== snap.form.temMeta) return true;
    if (form.frequenciaVezes !== snap.form.frequenciaVezes) return true;
    if (form.frequenciaUnidade !== snap.form.frequenciaUnidade) return true;
    if (form.frequenciaAPartirDe !== snap.form.frequenciaAPartirDe) return true;
    if (JSON.stringify(form.formatoVisualPadrao) !== JSON.stringify(snap.form.formatoVisualPadrao)) return true;
    if (form.funcaoPadrao !== snap.form.funcaoPadrao) return true;
    if (form.energiaPadrao !== snap.form.energiaPadrao) return true;
    if (form.pilarPrincipalId !== snap.form.pilarPrincipalId) return true;
    if (form.orientacoesEditoriais !== snap.form.orientacoesEditoriais) return true;
    if (form.legendaBase !== snap.form.legendaBase) return true;
    if (form.parentId !== snap.form.parentId) return true;
    if (form.usaTemporadas !== snap.form.usaTemporadas) return true;
    if (JSON.stringify(form.focoRedes) !== JSON.stringify(snap.form.focoRedes)) return true;
    if (form.modoSequencia !== snap.form.modoSequencia) return true;
    if (form.ativa !== snap.form.ativa) return true;
    if (JSON.stringify(form.plataformas) !== JSON.stringify(snap.form.plataformas)) return true;
    return false;
  }, [form]);

  const usandoCorPropria = tipo !== 'quadro' || quadroIdentidadePropria;
  const colorTaken = usandoCorPropria && isSerieColorTaken(
    takenColors.map((cor, index) => ({ id: `taken-${index}`, cor })),
    form.cor,
  );
  const erroVinculo = erroDoVinculo(tipo, form.parentId, form.id, series);
  // Ciclo de 14 dias precisa de início para saber onde cada ciclo começa.
  // Só cobra ao configurar ou mudar a meta: registro antigo pendente segue editável no resto.
  const metaInicial = initialSnapshot.current.form;
  const metaMudou = form.temMeta !== metaInicial.temMeta
    || form.frequenciaVezes !== metaInicial.frequenciaVezes
    || form.frequenciaUnidade !== metaInicial.frequenciaUnidade
    || form.frequenciaAPartirDe !== metaInicial.frequenciaAPartirDe;
  const quinzenaSemInicio = form.temMeta && form.frequenciaUnidade === 'quinzena' && !form.frequenciaAPartirDe;
  const faltaInicioQuinzena = quinzenaSemInicio && metaMudou;
  const valido = Boolean(form.name.trim()) && !colorTaken && !erroVinculo && !faltaInicioQuinzena;
  const erroNome = tentouSalvar && !form.name.trim() ? `Dê um nome para identificar ${NOME_DO_TIPO[tipo].artigo}.` : null;
  const erroCor = colorTaken ? 'Esta cor já está em outra série. Escolha outra.' : null;

  const contasDestinoIds = useMemo(
    () => form.plataformas.map(item => item.platformId),
    [form.plataformas],
  );

  const toggleContasDestino = (nextIds: string[]) => {
    const wanted = new Set(nextIds);
    const updated = contas
      .filter(conta => wanted.has(conta.id))
      .map(conta => {
        const existing = form.plataformas.find(item => item.platformId === conta.id);
        return existing ?? { serieId: form.id, platformId: conta.id, hashtags: '', legenda: null };
      });
    setForm(previous => ({ ...previous, plataformas: updated }));
  };

  const updatePlatformHashtags = (platformId: string, hashtags: string) => {
    const current = [...form.plataformas];
    const index = current.findIndex(item => item.platformId === platformId);
    if (index >= 0) {
      current[index] = { ...current[index], hashtags };
    } else if (hashtags.trim()) {
      current.push({ serieId: form.id, platformId, hashtags, legenda: null });
    }
    setForm(previous => ({ ...previous, plataformas: current }));
  };

  const updatePlatformLegenda = (platformId: string, legenda: string | null) => {
    const current = [...form.plataformas];
    const index = current.findIndex(item => item.platformId === platformId);
    const texto = legenda?.trim() ?? '';
    if (index >= 0) {
      current[index] = { ...current[index], legenda: texto || null };
    } else if (texto) {
      current.push({ serieId: form.id, platformId, hashtags: '', legenda: texto });
    }
    setForm(previous => ({ ...previous, plataformas: current }));
  };

  const buildPayload = useCallback((): Serie => {
    const now = new Date().toISOString();
    if (tipo === 'familia') {
      return {
        id: form.id,
        userId: form.userId,
        name: form.name.trim(),
        template: '',
        notes: form.notes.trim(),
        slotPadrao: null,
        formatoVisualPadrao: [],
        estruturaRoteiro: null,
        cor: form.cor,
        capaUrl: form.capaUrl.trim() || null,
        ativa: form.ativa,
        frequenciaRecomendada: null,
        frequenciaVezes: null,
        frequenciaUnidade: null,
        frequenciaAPartirDe: null,
        funcaoPadrao: null,
        energiaPadrao: null,
        pilarPrincipalId: null,
        motivoSalvar: null,
        motivoEnviar: null,
        legendaBase: null,
        parentId: null,
        usaTemporadas: false,
        tipoAgrupamento: 'familia',
        semPilar: false,
        pilarIds: [],
        plataformas: [],
        createdAt: initial.createdAt || now,
        updatedAt: now,
      };
    }

    const vezes = form.temMeta ? (form.frequenciaVezes && form.frequenciaVezes > 0 ? form.frequenciaVezes : 1) : null;
    const unidade = form.temMeta ? (form.frequenciaUnidade.trim() || 'semana') : null;
    const aPartirDe = form.temMeta ? (form.frequenciaAPartirDe || null) : null;
    const frequenciaRecomendada = form.temMeta && unidade
      ? formatarFrequenciaRecomendada(vezes, unidade)
      : tipo === 'quadro'
        ? 'Sob demanda'
        : null;

    const estruturaFinal = modoModelo === 'proprio' ? form.estruturaRoteiro.trim() : '';
    const corFinal = tipo === 'quadro' && !quadroIdentidadePropria
      ? (seriePai?.cor || form.cor)
      : form.cor;
    const capaFinal = tipo === 'quadro' && !quadroIdentidadePropria
      ? null
      : (form.capaUrl.trim() || null);
    const orientacoesFinal = tipo === 'quadro' && !quadroOrientacoesProprias
      ? null
      : (form.orientacoesEditoriais.trim() || null);
    const formatosFinal = tipo === 'quadro' && !quadroFormatosProprios
      ? []
      : form.formatoVisualPadrao;
    const legendaFinal = tipo === 'quadro' && !quadroLegendaPropria
      ? null
      : (form.legendaBase.trim() || null);
    const plataformasFinal = tipo === 'quadro' && !quadroContasProprias
      ? []
      : contas
        .map(conta => form.plataformas.find(item => item.platformId === conta.id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map(item => ({
          serieId: form.id,
          platformId: item.platformId,
          hashtags: item.hashtags.trim(),
          legenda: item.legenda?.trim() || null,
        }));

    return {
      id: form.id,
      userId: form.userId,
      name: form.name.trim(),
      template: estruturaFinal,
      notes: form.notes.trim(),
      slotPadrao: form.slotPadrao,
      formatoVisualPadrao: formatosFinal,
      estruturaRoteiro: estruturaFinal || null,
      cor: corFinal,
      capaUrl: capaFinal,
      ativa: form.ativa,
      // O status muda no menu da série; salvar o formulário mantém o que está gravado.
      ...(initial.status ? { status: initial.status } : {}),
      frequenciaRecomendada,
      frequenciaVezes: vezes,
      frequenciaUnidade: unidade,
      frequenciaAPartirDe: aPartirDe,
      funcaoPadrao: form.funcaoPadrao,
      energiaPadrao: form.energiaPadrao,
      pilarPrincipalId: form.pilarPrincipalId,
      motivoSalvar: orientacoesFinal,
      motivoEnviar: null,
      legendaBase: legendaFinal,
      parentId: form.parentId,
      usaTemporadas: form.usaTemporadas,
      focoRedes: tipo === 'quadro' ? normalizarRedesPostIt(form.focoRedes) : normalizarRedesPostIt(initial.focoRedes ?? []),
      modoSequencia: tipo === 'serie' ? lerModoSequencia(form.modoSequencia) : (initial.modoSequencia ?? null),
      tipoAgrupamento: tipo,
      semPilar: !form.pilarPrincipalId && form.semPilar,
      // Acompanhamento geral na tabela nova (coluna antiga espelhada); por conta/formato e metas seguem como estavam.
      // Série nova começa com a lista vazia: sem isso a marcação ia só para a coluna antiga e sumia ao recarregar.
      ...(() => {
        const comGeral = comAcompanhamentoGeral({
          id: form.id,
          acompanharContinuidade: initial.acompanharContinuidade,
          acompanhamentos: (initial.acompanhamentos ?? []).map(item => ({ ...item, serieId: form.id })),
        }, form.acompanharContinuidade, generateUUID);
        return {
          acompanharContinuidade: form.acompanharContinuidade,
          acompanhamentos: comGeral.acompanhamentos,
          metasPorEscopo: initial.metasPorEscopo,
        };
      })(),
      // Quadro em "Usar da série": a cor acompanha a série na hora.
      ...(tipo === 'quadro' ? { usaCorDaSerie: !quadroIdentidadePropria } : {}),
      pilarIds: form.pilarPrincipalId ? [form.pilarPrincipalId] : [],
      plataformas: plataformasFinal,
      createdAt: initial.createdAt || now,
      updatedAt: now,
    };
  }, [
    contas,
    form,
    initial.acompanhamentos,
    initial.acompanharContinuidade,
    initial.metasPorEscopo,
    initial.createdAt,
    modoModelo,
    quadroContasProprias,
    quadroFormatosProprios,
    quadroIdentidadePropria,
    quadroLegendaPropria,
    quadroOrientacoesProprias,
    seriePai?.cor,
    tipo,
  ]);

  const irParaCampoSerie = useCallback((abaAlvo: AbaSerie, elementId: string) => {
    if (abaSerie === abaAlvo) {
      focarElemento(elementId);
      return;
    }
    focoPendente.current = elementId;
    setAbaSerie(abaAlvo);
  }, [abaSerie]);

  const handleSave = useCallback(() => {
    if (!form.name.trim() || colorTaken || erroVinculo || faltaInicioQuinzena) {
      setTentouSalvar(true);
      if (tipo === 'serie') {
        if (!form.name.trim()) irParaCampoSerie('definicoes', 'serie-nome');
        else if (erroVinculo) irParaCampoSerie('definicoes', 'serie-familia');
        else if (colorTaken) irParaCampoSerie('definicoes', 'serie-cor');
        else irParaCampoSerie('publicacao', 'serie-inicio');
      } else {
        const alvo = !form.name.trim() ? 'serie-nome' : 'serie-principal';
        document.getElementById(alvo)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return;
    }
    onSave(buildPayload());
  }, [buildPayload, colorTaken, erroVinculo, faltaInicioQuinzena, form.name, irParaCampoSerie, onSave, tipo]);

  useUnsavedChangesRegistration(!inModal && isDirty, () => {
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
      canSave: true,
      handleSave: () => handleSaveRef.current(),
      handleCancel: () => onCancelRef.current(),
    });
  }, [isDirty]);

  useEffect(() => {
    const id = focoPendente.current;
    if (!id) return;
    focoPendente.current = null;
    focarElemento(id);
  }, [abaSerie]);

  const copyHashtags = async (value: string) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  const selectedPilar = pilares.find(item => item.id === form.pilarPrincipalId) ?? null;
  const pilarChoices = pilares.filter(item => item.ativo || item.id === form.pilarPrincipalId);
  const funcaoDescription = FUNCAO_OPTIONS.find(option => option.value === form.funcaoPadrao)?.description ?? null;
  const formatoOptions = collectFormatoSuggestions([...usedFormatoValues, ...form.formatoVisualPadrao]);
  const serieForMetrics = useMemo(() => buildPayload(), [buildPayload]);

  const [confirmParent, setConfirmParent] = useState<{ next: string | null; message: string } | null>(null);
  const existe = series.some(item => item.id === form.id);
  const serieSalva = series.find(item => item.id === form.id) ?? null;
  const opcoesDoPai = opcoesDePai(tipo, form.id, series);
  const paiForaDaOrdem = form.parentId && !opcoesDoPai.some(item => item.id === form.parentId)
    ? series.find(item => item.id === form.parentId) ?? null
    : null;
  const pilarDoPai = form.parentId ? pilarEfetivoDaSerie(form.parentId, series) : null;
  const nomePilarDoPai = pilarDoPai?.pilarId ? pilares.find(item => item.id === pilarDoPai.pilarId)?.nome ?? null : null;

  const selecionarModelo = (valor: string) => {
    if (valor === 'herdar' || valor === 'nenhum') {
      setModoModelo(valor);
      setTemplateEscolhidoId('');
      setForm(previous => ({ ...previous, estruturaRoteiro: '', template: '' }));
      return;
    }
    if (valor.startsWith('tpl:')) {
      const tplId = valor.slice(4);
      const tpl = roteiroTemplates.find(item => item.id === tplId);
      setModoModelo('proprio');
      setTemplateEscolhidoId(tplId);
      if (tpl) {
        const texto = limparHtmlModelo(templateToHtml(tpl));
        setForm(previous => ({ ...previous, estruturaRoteiro: texto, template: texto }));
      }
      return;
    }
    setModoModelo('proprio');
    setTemplateEscolhidoId('');
  };

  const valorSelectModelo = modoModelo === 'proprio'
    ? (templateEscolhidoId ? `tpl:${templateEscolhidoId}` : 'proprio')
    : (tipo === 'quadro' ? 'herdar' : 'nenhum');

  const renderCamposMeta = (notaAdicional?: string) => (
    <div className="stack-sm pt-1">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <FieldLabel>Quantidade</FieldLabel>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            aria-label="Quantidade"
            value={form.frequenciaVezes ?? 1}
            onChange={event => {
              const parsed = parseVezes(event.target.value);
              if (event.target.value.trim() && parsed === null) return;
              setForm(previous => ({ ...previous, frequenciaVezes: parsed ?? 1 }));
            }}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel>Período</FieldLabel>
          <SelectField
            block
            ariaLabel="Período"
            value={form.frequenciaUnidade || 'semana'}
            onChange={frequenciaUnidade => setForm(previous => ({
              ...previous,
              frequenciaUnidade: frequenciaUnidade || 'semana',
            }))}
            options={UNIDADES_FREQUENCIA.map(item => ({ value: item.value, label: item.label }))}
          />
        </div>
        <div>
          <FieldLabel optional={form.frequenciaUnidade !== 'quinzena'} required={form.frequenciaUnidade === 'quinzena'}>Data de início</FieldLabel>
          <input
            id="serie-inicio"
            type="date"
            aria-label="Data de início"
            aria-invalid={faltaInicioQuinzena ? true : undefined}
            aria-describedby={quinzenaSemInicio ? 'serie-inicio-ciclo' : undefined}
            value={form.frequenciaAPartirDe}
            onChange={event => setForm(previous => ({
              ...previous,
              frequenciaAPartirDe: event.target.value,
            }))}
            className={cn(inputClass, 'scroll-mt-28')}
            style={faltaInicioQuinzena && tentouSalvar ? { borderColor: 'var(--danger)' } : undefined}
          />
          {quinzenaSemInicio ? (
            <p
              id="serie-inicio-ciclo"
              className="mt-1.5 t-meta"
              style={{ color: faltaInicioQuinzena && tentouSalvar ? 'var(--danger)' : 'var(--text-secondary)' }}
            >
              Defina o início dos ciclos de 14 dias.
            </p>
          ) : null}
        </div>
      </div>
      <label className="flex items-center gap-2 w-fit cursor-pointer">
        <input
          type="checkbox"
          checked={form.acompanharContinuidade}
          onChange={event => setForm(previous => ({ ...previous, acompanharContinuidade: event.target.checked }))}
          className="h-4 w-4 accent-[var(--brand-accent)]"
        />
        <Text variant="body" as="span">Acompanhar continuidade na Saúde</Text>
      </label>
      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
        {formatarResumoMeta(form.frequenciaVezes, form.frequenciaUnidade || 'semana', form.frequenciaAPartirDe)}
        {notaAdicional ? ` · ${notaAdicional}` : ''}
      </Text>
    </div>
  );

  // Série já gravada: a meta é editada no chip (mesmo store do cabeçalho e da Continuidade).
  // Na criação ainda não há série para gravar, então os campos completos continuam aqui.
  const serieGravada = Boolean(initial.id && state.series.some(item => item.id === initial.id));
  const aplicarFrequencia = (frequencia: FrequenciaGravada) => {
    const campos = {
      temMeta: frequencia.vezes != null,
      frequenciaVezes: frequencia.vezes,
      frequenciaUnidade: frequencia.unidade ?? 'semana',
      frequenciaAPartirDe: frequencia.aPartirDe ?? '',
    };
    // Já gravado pelo chip: não conta como alteração pendente do formulário.
    initialSnapshot.current.form = { ...initialSnapshot.current.form, ...campos };
    setForm(previous => ({ ...previous, ...campos }));
  };
  const renderChipDaMeta = (notaAdicional?: string) => (
    <div className="stack-sm scroll-mt-28">
      <FieldLabel optional>Ritmo de episódios</FieldLabel>
      <FrequenciaChip id="serie-meta" serieId={initial.id!} className="w-fit" onSalvo={aplicarFrequencia} />
      {form.temMeta ? (
        <label className="flex items-center gap-2 w-fit cursor-pointer">
          <input
            type="checkbox"
            checked={form.acompanharContinuidade}
            onChange={event => setForm(previous => ({ ...previous, acompanharContinuidade: event.target.checked }))}
            className="h-4 w-4 accent-[var(--brand-accent)]"
          />
          <Text variant="body" as="span">Acompanhar continuidade na Saúde</Text>
        </label>
      ) : null}
      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
        O chip grava na hora, no mesmo lugar do cabeçalho da série e da Continuidade.
        {notaAdicional ? ` ${notaAdicional}` : ''}
      </Text>
    </div>
  );

  const renderBlocoModeloRoteiro = (isQuadro: boolean) => (
    <div className="stack-sm">
      <FieldLabel optional>Modelo de roteiro</FieldLabel>
      <SelectField
        block
        ariaLabel="Modelo de roteiro"
        value={valorSelectModelo}
        onChange={selecionarModelo}
        options={[
          isQuadro
            ? { value: 'herdar', label: 'Usar modelo da série' }
            : { value: 'nenhum', label: 'Sem modelo definido' },
          { value: 'proprio', label: 'Escrever estrutura própria' },
          ...roteiroTemplates.map(tpl => ({
            value: `tpl:${tpl.id}`,
            label: `Modelo: ${tpl.nome}`,
          })),
        ]}
      />
      {modoModelo === 'proprio' ? (
        <div>
          <label htmlFor={isQuadro ? 'quadro-estrutura' : 'serie-estrutura'}>
            <FieldLabel optional>Estrutura do roteiro</FieldLabel>
          </label>
          <textarea
            id={isQuadro ? 'quadro-estrutura' : 'serie-estrutura'}
            value={form.estruturaRoteiro}
            onChange={event => setForm(previous => ({
              ...previous,
              estruturaRoteiro: event.target.value,
              template: event.target.value,
            }))}
            placeholder="Estrutura sugerida para os novos episódios (ex.: Gancho → Contexto → Virada → Fechamento)…"
            rows={isQuadro ? 6 : 8}
            className={cn(inputClass, isQuadro ? 'min-h-[120px]' : 'min-h-[180px]', 'resize-y leading-relaxed')}
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="relative w-full">
      {tipo !== 'serie' && tentouSalvar && !valido ? (
        <div role="alert" className="mb-3 rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--bg-elevated)] px-4 py-3">
          <Text variant="body" as="p">Corrija o que está marcado para salvar. O que você preencheu continua aqui.</Text>
        </div>
      ) : null}

      <div className={cn('grid w-full grid-cols-1 items-start gap-4', existe && !inModal && tipo !== 'serie' && 'lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]')}>
        <div className="flex min-w-0 flex-col gap-3">
          {/* ==============================================================
              1. FAMÍLIA
             ============================================================== */}
          {tipo === 'familia' ? (
            <>
              <Surface id="serie-principal" variant="outlined" padding="md" className="scroll-mt-24 stack-lg">
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
                    onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))}
                    placeholder={NOME_DO_TIPO.familia.exemplo}
                    className={inputClass}
                    style={erroNome ? { borderColor: 'var(--danger)' } : undefined}
                  />
                  {erroNome ? (
                    <p id="serie-nome-erro" className="mt-1.5 t-meta" style={{ color: 'var(--danger)' }}>{erroNome}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="serie-descricao">
                    <FieldLabel optional>Descrição</FieldLabel>
                  </label>
                  <textarea
                    id="serie-descricao"
                    value={form.notes}
                    onChange={event => setForm(previous => ({ ...previous, notes: event.target.value }))}
                    placeholder="Conceito que conecta as séries desta família."
                    rows={3}
                    className={cn(inputClass, 'resize-y leading-relaxed')}
                  />
                </div>
              </Surface>

              <CollapsibleSection
                id="familia-aparencia"
                title="Personalizar aparência"
                description="Cor e capa da família."
                defaultOpen={Boolean(erroCor || form.capaUrl.trim())}
              >
                <div className="grid-form">
                  <div>
                    <FieldLabel>Cor</FieldLabel>
                    <EntityColorPicker
                      variant="inline"
                      value={form.cor}
                      unavailableColors={takenColors}
                      onChange={cor => setForm(previous => ({ ...previous, cor }))}
                    />
                    {erroCor ? <p className="mt-1.5 t-meta" style={{ color: 'var(--danger)' }}>{erroCor}</p> : null}
                  </div>
                  <div>
                    <FieldLabel optional>Capa</FieldLabel>
                    <CoverUploadField
                      appearance="series"
                      value={form.capaUrl}
                      onChange={capaUrl => setForm(previous => ({ ...previous, capaUrl }))}
                      itemId={form.id}
                      title={form.name.trim() || 'Família'}
                      plain
                    />
                  </div>
                </div>
              </CollapsibleSection>
            </>
          ) : null}

          {/* ==============================================================
              2. SÉRIE
             ============================================================== */}
          {tipo === 'serie' ? (
            <div className="mx-auto w-full max-w-3xl stack-lg">
              {showOpenInfoNotice ? (
                <OpenInfoNotice
                  items={getSerieOpenItems(serieForMetrics, { series, contents })}
                  description="Escolha um item para ir ao campo."
                  onItemSelect={item => {
                    const destino = CAMPO_DA_PENDENCIA[item.key];
                    irParaCampoSerie(destino.aba, destino.id);
                  }}
                />
              ) : null}
              {tentouSalvar && !valido ? (
                <div role="alert" className="rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--bg-elevated)] px-4 py-3">
                  <Text variant="body" as="p">Corrija o que está marcado para salvar. O que você preencheu continua aqui.</Text>
                </div>
              ) : null}

              <SegmentTabs<AbaSerie>
                ariaLabel="Edição da série"
                fullWidth
                value={abaSerie}
                onChange={setAbaSerie}
                options={[
                  { id: 'publicacao', label: 'Publicação' },
                  { id: 'definicoes', label: 'Definições da série' },
                ]}
              />

              <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 sm:p-6 stack-lg">
                {abaSerie === 'publicacao' ? (
                  <div role="tabpanel" aria-label="Publicação" className="stack-lg">
                    <div className="stack-xs">
                      <Text variant="sectionTitle" as="h2">Publicação</Text>
                      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                        Defina o ritmo da série e os padrões de publicação herdados pelos novos episódios.
                      </Text>
                    </div>

                    <EditorSection
                      index="01"
                      title="Ritmo e meta"
                      description="Quantidade, período e o dia em que a contagem começa."
                    >
                      {serieGravada ? renderChipDaMeta() : (<>
                      <div className="scroll-mt-28">
                        <label htmlFor="serie-meta">
                          <FieldLabel optional>Ritmo de episódios</FieldLabel>
                        </label>
                        <SelectField
                          id="serie-meta"
                          block
                          ariaLabel="Ritmo de episódios"
                          value={form.temMeta ? 'com-meta' : 'sem-meta'}
                          onChange={valor => {
                            const ativar = valor === 'com-meta';
                            setForm(previous => ({
                              ...previous,
                              temMeta: ativar,
                              frequenciaVezes: ativar ? (previous.frequenciaVezes ?? 1) : null,
                              frequenciaUnidade: ativar ? (previous.frequenciaUnidade || 'semana') : 'semana',
                            }));
                          }}
                          options={[
                            { value: 'sem-meta', label: 'Sem meta definida' },
                            { value: 'com-meta', label: 'Definir meta' },
                          ]}
                        />
                      </div>
                      {form.temMeta ? renderCamposMeta() : null}
                      </>)}
                    </EditorSection>


                    <EditorSection
                      index="02"
                      title="Modo de sequência"
                      description="Como o Planejamento prioriza o próximo episódio em Ver o que encaixa."
                    >
                      <div className="scroll-mt-28">
                        <label htmlFor="serie-modo-sequencia">
                          <FieldLabel optional>Sequência dos episódios</FieldLabel>
                        </label>
                        <SelectField
                          id="serie-modo-sequencia"
                          block
                          ariaLabel="Modo de sequência"
                          value={form.modoSequencia}
                          onChange={valor => setForm(previous => ({
                            ...previous,
                            modoSequencia: (lerModoSequencia(valor) ?? 'ordem_temporada') as ModoSequenciaSerie,
                          }))}
                          options={[
                            { value: 'intercalar', label: ROTULO_MODO_SEQUENCIA.intercalar },
                            { value: 'seguir_um', label: ROTULO_MODO_SEQUENCIA.seguir_um },
                            { value: 'ordem_temporada', label: ROTULO_MODO_SEQUENCIA.ordem_temporada },
                          ]}
                        />
                        <Text variant="meta" as="p" className="mt-1.5 text-[var(--text-secondary)]">
                          {AJUDA_MODO_SEQUENCIA[form.modoSequencia as ModoSequenciaSerie]}
                        </Text>
                      </div>
                    </EditorSection>

                    <EditorSection
                      index="03"
                      title="Destinos e formatos"
                      description="Onde a série publica e os formatos que os episódios novos recebem."
                    >
                      <div>
                        <FieldLabel optional>Contas de destino</FieldLabel>
                        {contas.length === 0 ? (
                          <Text variant="meta" className="text-[var(--text-tertiary)]">
                            Nenhuma conta ativa cadastrada.
                          </Text>
                        ) : (
                          <MultiFilterChips
                            value={contasDestinoIds}
                            onChange={toggleContasDestino}
                            options={contas.map(conta => ({ id: conta.id, label: rotuloConta(conta) }))}
                            ariaLabel="Contas de destino"
                          />
                        )}
                      </div>
                      <div id="serie-formatos" tabIndex={-1} className="scroll-mt-28 outline-none stack-sm">
                        <FieldLabel optional>Formatos habituais de publicação</FieldLabel>
                        <MultiChoiceField
                          id="serie-formato-publicacao"
                          label="Formatos habituais de publicação"
                          value={form.formatoVisualPadrao}
                          onChange={formatoVisualPadrao => setForm(previous => ({ ...previous, formatoVisualPadrao }))}
                          options={formatoOptions}
                        />
                        <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                          {form.formatoVisualPadrao[0]
                            ? `Padrão dos novos episódios: ${form.formatoVisualPadrao[0]}.`
                            : 'O primeiro formato marcado é o padrão dos novos episódios.'}
                        </Text>
                      </div>
                    </EditorSection>

                    <EditorSection
                      index="04"
                      title="Textos de publicação"
                      description="A legenda-base vale para todas as contas, até que uma delas tenha um texto próprio."
                    >
                      <LegendaBaseField
                        id={`serie-legenda-base-${form.id}`}
                        label="Legenda-base"
                        value={form.legendaBase}
                        minRows={6}
                        placeholder="Texto padrão para os novos episódios desta série."
                        onChange={legendaBase => setForm(previous => ({ ...previous, legendaBase }))}
                      />
                      <div className="stack-sm">
                        <div className="stack-xs">
                          <Text variant="itemTitle" as="h4">Ajustes por conta</Text>
                          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                            Legenda e hashtags específicas de cada conta.
                          </Text>
                        </div>
                        {contas.length === 0 ? (
                          <Text variant="meta">Cadastre uma conta para configurar legendas e hashtags por plataforma.</Text>
                        ) : (
                          <div>
                            {contas.map(conta => {
                              const item = form.plataformas.find(entry => entry.platformId === conta.id);
                              return (
                                <LinhaAjusteConta
                                  key={conta.id}
                                  contaId={conta.id}
                                  icone={iconeDaConta(conta)}
                                  rotulo={rotuloConta(conta)}
                                  detalhe={complementoDoRotulo(conta)}
                                  aberta={contasAbertas[conta.id] === true}
                                  onToggle={() => setContasAbertas(previous => ({
                                    ...previous,
                                    [conta.id]: !previous[conta.id],
                                  }))}
                                  legendaBase={form.legendaBase}
                                  versao={item?.legenda ?? ''}
                                  hashtags={item?.hashtags ?? ''}
                                  onLegenda={valor => updatePlatformLegenda(conta.id, valor)}
                                  onHashtags={valor => updatePlatformHashtags(conta.id, valor)}
                                  onCopiar={valor => { void copyHashtags(valor); }}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </EditorSection>
                  </div>
                ) : (
                  <div role="tabpanel" aria-label="Definições da série" className="stack-lg">
                    <div className="stack-xs">
                      <Text variant="sectionTitle" as="h2">Definições da série</Text>
                      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                        Personalidade, posicionamento e padrões que orientam a criação dos episódios.
                      </Text>
                    </div>

                    <EditorSection
                      index="01"
                      title="Identidade"
                      description="Como a série é reconhecida na lista e nos episódios."
                    >
                      <div className="scroll-mt-28">
                        <label htmlFor="serie-nome">
                          <FieldLabel required>Nome da série</FieldLabel>
                        </label>
                        <input
                          id="serie-nome"
                          type="text"
                          value={form.name}
                          aria-invalid={erroNome ? true : undefined}
                          aria-describedby={erroNome ? 'serie-nome-erro' : undefined}
                          onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))}
                          placeholder={NOME_DO_TIPO.serie.exemplo}
                          className={inputClass}
                          style={erroNome ? { borderColor: 'var(--danger)' } : undefined}
                        />
                        {erroNome ? (
                          <p id="serie-nome-erro" className="mt-1.5 t-meta" style={{ color: 'var(--danger)' }}>{erroNome}</p>
                        ) : null}
                      </div>

                      <div className="grid-form">
                        <div className="scroll-mt-28">
                          <label htmlFor="serie-familia">
                            <FieldLabel optional>Família</FieldLabel>
                          </label>
                          <SelectField
                            id="serie-familia"
                            block
                            ariaLabel="Família"
                            value={form.parentId ?? ''}
                            onChange={parentId => {
                              const next = parentId || null;
                              if (next === (form.parentId ?? null)) return;
                              if (existe && (form.parentId || next)) {
                                setConfirmParent({
                                  next,
                                  message: 'Mudar a família atualiza como esta série é agrupada. Os episódios e padrões desta série continuam aqui.',
                                });
                                return;
                              }
                              setForm(previous => ({ ...previous, parentId: next }));
                            }}
                            options={[
                              { value: '', label: 'Sem família' },
                              ...(paiForaDaOrdem ? [{ value: paiForaDaOrdem.id, label: paiForaDaOrdem.name }] : []),
                              ...opcoesDoPai.map(item => ({ value: item.id, label: item.name })),
                            ]}
                          />
                          {erroVinculo && (tentouSalvar || form.parentId) ? (
                            <p className="mt-1.5 t-meta" style={{ color: 'var(--danger)' }}>{erroVinculo}</p>
                          ) : null}
                        </div>

                        <div className="scroll-mt-28">
                          <label htmlFor="serie-pilar">
                            <FieldLabel optional>Pilar editorial</FieldLabel>
                          </label>
                          <SelectField
                            id="serie-pilar"
                            block
                            ariaLabel="Pilar editorial"
                            value={form.pilarPrincipalId ?? ''}
                            leadingIcon={selectedPilar ? (
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedPilar.cor }} />
                            ) : undefined}
                            onChange={valor => setForm(previous => ({
                              ...previous,
                              pilarPrincipalId: valor || null,
                              semPilar: !valor,
                            }))}
                            options={[
                              { value: '', label: 'Sem pilar' },
                              ...pilarChoices.map(item => ({ value: item.id, label: item.nome })),
                            ]}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="serie-descricao">
                          <FieldLabel optional>Descrição</FieldLabel>
                        </label>
                        <textarea
                          id="serie-descricao"
                          value={form.notes}
                          onChange={event => setForm(previous => ({ ...previous, notes: event.target.value }))}
                          placeholder="Do que a série trata, em uma ou duas frases."
                          rows={4}
                          className={cn(inputClass, 'min-h-[96px] resize-y leading-relaxed')}
                        />
                      </div>

                      <div className="grid-form">
                        <div id="serie-cor" tabIndex={-1} className="scroll-mt-28 outline-none">
                          <FieldLabel>Cor da série</FieldLabel>
                          <EntityColorPicker
                            variant="inline"
                            value={form.cor}
                            unavailableColors={takenColors}
                            onChange={cor => setForm(previous => ({ ...previous, cor }))}
                          />
                          {erroCor ? <p className="mt-1.5 t-meta" style={{ color: 'var(--danger)' }}>{erroCor}</p> : null}
                        </div>
                        <div>
                          <FieldLabel optional>Capa</FieldLabel>
                          <CoverUploadField
                            appearance="series"
                            value={form.capaUrl}
                            onChange={capaUrl => setForm(previous => ({ ...previous, capaUrl }))}
                            itemId={form.id}
                            title={form.name.trim() || 'Série'}
                            plain
                          />
                        </div>
                      </div>
                    </EditorSection>

                    <EditorSection
                      index="02"
                      title="Direção editorial"
                      description="O que os roteiros novos assumem quando ninguém escolhe outro valor."
                    >
                      <div className="scroll-mt-28">
                        <label htmlFor="serie-objetivo">
                          <FieldLabel optional>Objetivo padrão</FieldLabel>
                        </label>
                        <SelectField
                          id="serie-objetivo"
                          block
                          ariaLabel="Objetivo padrão"
                          value={form.funcaoPadrao ?? ''}
                          onChange={value => setForm(previous => ({
                            ...previous,
                            funcaoPadrao: (value || null) as typeof previous.funcaoPadrao,
                          }))}
                          options={[
                            { value: '', label: 'Sem objetivo definido' },
                            ...FUNCAO_OPTIONS.map(option => ({ value: option.value, label: option.label })),
                          ]}
                        />
                        {funcaoDescription ? (
                          <Text variant="meta" className="mt-1.5 block text-[var(--text-tertiary)]">
                            {funcaoDescription}
                          </Text>
                        ) : null}
                      </div>

                      <div id="serie-esforco" tabIndex={-1} className="scroll-mt-28 outline-none stack-sm">
                        <FieldLabel optional>Esforço de produção</FieldLabel>
                        <ChoiceChips
                          label="Esforço de produção"
                          value={form.energiaPadrao}
                          onChange={energiaPadrao => setForm(previous => ({ ...previous, energiaPadrao }))}
                          options={ENERGIA_NIVEIS.map(value => ({ value, label: ENERGIA_LABELS[value] }))}
                        />
                      </div>
                    </EditorSection>

                    <EditorSection
                      index="03"
                      title="Modelo de criação"
                      description="Estrutura e orientações copiadas para os episódios novos."
                    >
                      {renderBlocoModeloRoteiro(false)}
                      <div>
                        <label htmlFor="serie-orientacoes">
                          <FieldLabel optional>Orientações editoriais</FieldLabel>
                        </label>
                        <textarea
                          id="serie-orientacoes"
                          value={form.orientacoesEditoriais}
                          onChange={event => setForm(previous => ({ ...previous, orientacoesEditoriais: event.target.value }))}
                          placeholder="Proposta da série, motivos para salvar ou compartilhar e outros direcionamentos…"
                          rows={8}
                          className={cn(inputClass, 'min-h-[180px] resize-y leading-relaxed')}
                        />
                      </div>
                    </EditorSection>

                    <EditorSection
                      index="04"
                      title="Estrutura interna"
                      description="Quadros desta série e temporadas compartilhadas entre eles. Uma temporada reúne episódios de quadros diferentes e pode focar um grupo de redes."
                    >
                      <label className="flex w-fit cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          checked={form.usaTemporadas}
                          onChange={event => setForm(previous => ({ ...previous, usaTemporadas: event.target.checked }))}
                          className="mt-1 h-4 w-4 accent-[var(--brand-accent)]"
                        />
                        <span>
                          <Text variant="body" as="span">Usa temporadas</Text>
                          <Text variant="meta" as="span" className="mt-0.5 block text-[var(--text-secondary)]">
                            Vale para a série e para os quadros. Cada temporada pode focar um grupo de redes. A criação usa o valor já salvo.
                          </Text>
                        </span>
                      </label>
                      {serieSalva && form.usaTemporadas !== (serieSalva.usaTemporadas === true) ? (
                        <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                          Essa escolha passa a valer quando você salvar a série.
                        </Text>
                      ) : null}
                      {serieSalva ? (
                        <QuadrosETemporadasSection
                          serie={serieSalva}
                          usaTemporadasMarcado={form.usaTemporadas}
                        />
                      ) : (
                        <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                          Quadros e temporadas ficam disponíveis depois de criar a série.
                        </Text>
                      )}
                    </EditorSection>
                  </div>
                )}
              </div>

              {!inModal ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <AppButton variant="secondary" onClick={onCancel}>Cancelar</AppButton>
                  <AppButton variant="primary" onClick={handleSave}>
                    {existe ? 'Salvar alterações' : 'Criar série'}
                  </AppButton>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ==============================================================
              3. QUADRO
             ============================================================== */}
          {tipo === 'quadro' ? (
            <>
              <Surface id="serie-principal" variant="outlined" padding="md" className="scroll-mt-24 stack-lg">
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
                    onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))}
                    placeholder={NOME_DO_TIPO.quadro.exemplo}
                    className={inputClass}
                    style={erroNome ? { borderColor: 'var(--danger)' } : undefined}
                  />
                  {erroNome ? (
                    <p id="serie-nome-erro" className="mt-1.5 t-meta" style={{ color: 'var(--danger)' }}>{erroNome}</p>
                  ) : null}
                </div>

                {!form.parentId || erroVinculo ? (
                  <div>
                    <FieldLabel required>Série</FieldLabel>
                    <SelectField
                      block
                      ariaLabel="Série"
                      value={form.parentId ?? ''}
                      onChange={parentId => setForm(previous => ({ ...previous, parentId: parentId || null }))}
                      options={[
                        { value: '', label: 'Escolher…' },
                        ...opcoesDoPai.map(item => ({ value: item.id, label: item.name })),
                      ]}
                    />
                    {erroVinculo ? (
                      <p className="mt-1.5 t-meta" style={{ color: 'var(--danger)' }}>{erroVinculo}</p>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <label htmlFor="serie-descricao">
                    <FieldLabel optional>Descrição da proposta</FieldLabel>
                  </label>
                  <textarea
                    id="serie-descricao"
                    value={form.notes}
                    onChange={event => setForm(previous => ({ ...previous, notes: event.target.value }))}
                    placeholder="Qual é o recorte ou dinâmica deste quadro dentro da série."
                    rows={2}
                    className={cn(inputClass, 'resize-y leading-relaxed')}
                  />
                </div>

                <div className="stack-xs">
                  <Text variant="label" as="p">
                    Redes <span className="font-normal text-[var(--text-tertiary)]">· opcional</span>
                  </Text>
                  <RedeChips
                    value={form.focoRedes}
                    onChange={focoRedes => setForm(previous => ({ ...previous, focoRedes }))}
                    platforms={contas}
                  />
                  <Text variant="meta" as="p">
                    Os episódios novos deste quadro já nascem nestas redes, quando a temporada não escolhe as suas.
                  </Text>
                </div>

                {renderBlocoModeloRoteiro(true)}

                {serieGravada ? renderChipDaMeta('O episódio deste quadro conta nas duas metas.') : (
                <div className="stack-sm">
                  <FieldLabel optional>Ritmo de episódios</FieldLabel>
                  <SelectField
                    block
                    ariaLabel="Ritmo de episódios"
                    value={form.temMeta ? 'quadro' : 'serie'}
                    onChange={valor => {
                      const ativar = valor === 'quadro';
                      setForm(previous => ({
                        ...previous,
                        temMeta: ativar,
                        frequenciaVezes: ativar ? (previous.frequenciaVezes ?? 1) : null,
                        frequenciaUnidade: ativar ? (previous.frequenciaUnidade || 'semana') : 'semana',
                      }));
                    }}
                    options={[
                      { value: 'serie', label: 'Seguir apenas a meta da série' },
                      { value: 'quadro', label: 'Definir também uma meta para este quadro' },
                    ]}
                  />
                  {form.temMeta
                    ? renderCamposMeta('O episódio deste quadro conta nas duas metas.')
                    : null}
                </div>
                )}
              </Surface>

              <CollapsibleSection
                id="quadro-personalizar"
                title="Personalizar padrões da série"
                description="Cada configuração começa em “Usar da série”. Altere apenas quando o quadro tiver uma necessidade própria."
                defaultOpen={Boolean(erroCor)}
              >
                <div className="grid-form">
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
                          label: `Usar da série${nomePilarDoPai ? ` (${nomePilarDoPai})` : ''}`,
                        },
                        ...pilarChoices.map(item => ({ value: item.id, label: item.nome })),
                        { value: '__sem', label: 'Sem pilar' },
                      ]}
                    />
                  </div>

                  <div>
                    <FieldLabel>Objetivo</FieldLabel>
                    <SelectField
                      block
                      ariaLabel="Objetivo"
                      value={form.funcaoPadrao ?? ''}
                      onChange={value => setForm(previous => ({
                        ...previous,
                        funcaoPadrao: (value || null) as typeof previous.funcaoPadrao,
                      }))}
                      options={[
                        { value: '', label: 'Usar da série' },
                        ...FUNCAO_OPTIONS.map(option => ({ value: option.value, label: option.label })),
                      ]}
                    />
                  </div>
                </div>

                <div className="stack-sm">
                  <FieldLabel>Cor e capa</FieldLabel>
                  <SelectField
                    block
                    ariaLabel="Cor e capa"
                    value={quadroIdentidadePropria ? 'proprio' : 'herdar'}
                    onChange={valor => setQuadroIdentidadePropria(valor === 'proprio')}
                    options={[
                      { value: 'herdar', label: 'Usar da série' },
                      { value: 'proprio', label: 'Definir outro' },
                    ]}
                  />
                  {quadroIdentidadePropria ? (
                    <div className="stack-md pt-2">
                      <div className="grid-form">
                        <div>
                          <FieldLabel>Cor</FieldLabel>
                          <EntityColorPicker
                            variant="inline"
                            value={form.cor}
                            unavailableColors={takenColors}
                            onChange={cor => setForm(previous => ({ ...previous, cor }))}
                          />
                          {erroCor ? <p className="mt-1.5 t-meta" style={{ color: 'var(--danger)' }}>{erroCor}</p> : null}
                        </div>
                        <div>
                          <FieldLabel optional>Capa</FieldLabel>
                          <CoverUploadField
                            appearance="series"
                            value={form.capaUrl}
                            onChange={capaUrl => setForm(previous => ({ ...previous, capaUrl }))}
                            itemId={form.id}
                            title={form.name.trim() || 'Quadro'}
                            plain
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid-form">
                  <div>
                    <FieldLabel>Orientações editoriais</FieldLabel>
                    <SelectField
                      block
                      ariaLabel="Orientações editoriais"
                      value={quadroOrientacoesProprias ? 'proprio' : 'herdar'}
                      onChange={valor => setQuadroOrientacoesProprias(valor === 'proprio')}
                      options={[
                        { value: 'herdar', label: 'Usar da série' },
                        { value: 'proprio', label: 'Definir outro' },
                      ]}
                    />
                  </div>

                  <div>
                    <FieldLabel>Esforço de produção</FieldLabel>
                    <SelectField
                      block
                      ariaLabel="Esforço de produção"
                      value={form.energiaPadrao ?? ''}
                      onChange={valor => setForm(previous => ({
                        ...previous,
                        energiaPadrao: (valor || null) as typeof previous.energiaPadrao,
                      }))}
                      options={[
                        { value: '', label: 'Usar da série' },
                        ...ENERGIA_NIVEIS.map(nivel => ({ value: nivel, label: ENERGIA_LABELS[nivel] })),
                      ]}
                    />
                  </div>
                </div>

                {quadroOrientacoesProprias ? (
                  <div>
                    <label htmlFor="quadro-orientacoes">
                      <FieldLabel optional>Orientações editoriais do quadro</FieldLabel>
                    </label>
                    <textarea
                      id="quadro-orientacoes"
                      value={form.orientacoesEditoriais}
                      onChange={event => setForm(previous => ({ ...previous, orientacoesEditoriais: event.target.value }))}
                      placeholder="Direcionamentos específicos para este quadro…"
                      rows={3}
                      className={cn(inputClass, 'resize-y leading-relaxed')}
                    />
                  </div>
                ) : null}

                <div className="grid-form">
                  <div>
                    <FieldLabel>Formatos</FieldLabel>
                    <SelectField
                      block
                      ariaLabel="Formatos"
                      value={quadroFormatosProprios ? 'proprio' : 'herdar'}
                      onChange={valor => setQuadroFormatosProprios(valor === 'proprio')}
                      options={[
                        { value: 'herdar', label: 'Usar da série' },
                        { value: 'proprio', label: 'Definir outro' },
                      ]}
                    />
                  </div>

                  <div>
                    <FieldLabel>Legenda-base</FieldLabel>
                    <SelectField
                      block
                      ariaLabel="Legenda-base"
                      value={quadroLegendaPropria ? 'proprio' : 'herdar'}
                      onChange={valor => setQuadroLegendaPropria(valor === 'proprio')}
                      options={[
                        { value: 'herdar', label: 'Usar da série' },
                        { value: 'proprio', label: 'Definir outro' },
                      ]}
                    />
                  </div>

                  <div>
                    <FieldLabel>Contas e hashtags</FieldLabel>
                    <SelectField
                      block
                      ariaLabel="Contas e hashtags"
                      value={quadroContasProprias ? 'proprio' : 'herdar'}
                      onChange={valor => setQuadroContasProprias(valor === 'proprio')}
                      options={[
                        { value: 'herdar', label: 'Usar da série' },
                        { value: 'proprio', label: 'Definir outro' },
                      ]}
                    />
                  </div>
                </div>

                {quadroFormatosProprios ? (
                  <div>
                    <FieldLabel optional>Formatos do quadro</FieldLabel>
                    <MultiChoiceField
                      id="quadro-formato-publicacao"
                      label="Formatos do quadro"
                      value={form.formatoVisualPadrao}
                      onChange={formatoVisualPadrao => setForm(previous => ({ ...previous, formatoVisualPadrao }))}
                      options={formatoOptions}
                    />
                  </div>
                ) : null}

                {quadroLegendaPropria ? (
                  <LegendaBaseField
                    id={`quadro-legenda-base-${form.id}`}
                    label="Legenda-base do quadro"
                    compact
                    value={form.legendaBase}
                    placeholder="Texto de legenda específico para os episódios deste quadro."
                    onChange={legendaBase => setForm(previous => ({ ...previous, legendaBase }))}
                  />
                ) : null}

                {quadroContasProprias ? (
                  <div className="stack-md">
                    <div>
                      <FieldLabel optional>Contas de destino do quadro</FieldLabel>
                      {contas.length === 0 ? (
                        <Text variant="meta" className="text-[var(--text-tertiary)]">
                          Nenhuma conta ativa cadastrada.
                        </Text>
                      ) : (
                        <MultiFilterChips
                          value={contasDestinoIds}
                          onChange={toggleContasDestino}
                          options={contas.map(conta => ({ id: conta.id, label: rotuloConta(conta) }))}
                          ariaLabel="Contas de destino do quadro"
                        />
                      )}
                    </div>
                    {contas.map(conta => {
                      const hashtagsValue = form.plataformas.find(item => item.platformId === conta.id)?.hashtags || '';
                      return (
                        <div key={conta.id}>
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <PlatformIcon platform={iconeDaConta(conta)} className="h-4 w-4 shrink-0" />
                              <Text variant="meta" className="text-[var(--text-secondary)]">
                                Hashtags em {rotuloConta(conta)}
                              </Text>
                            </div>
                          </div>
                          <textarea
                            value={hashtagsValue}
                            onChange={event => updatePlatformHashtags(conta.id, event.target.value)}
                            placeholder="#hashtag1 #hashtag2"
                            rows={2}
                            className={cn(inputClass, 'min-h-[60px] resize-y leading-relaxed')}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </CollapsibleSection>
            </>
          ) : null}
        </div>

        {existe && !inModal && tipo !== 'serie' ? (
          <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
            <Surface variant="outlined" padding="md">
              <SerieProductionMetricsPanel
                serie={serieForMetrics}
                contents={contents}
                series={state.series}
                lastEditLabel={lastEditLabel}
              />
            </Surface>
          </aside>
        ) : null}
      </div>

      <ConfirmModal
        open={Boolean(confirmParent)}
        message={confirmParent?.message ?? ''}
        confirmLabel="Continuar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (!confirmParent) return;
          const next = confirmParent.next;
          setForm(previous => ({ ...previous, parentId: next }));
          setConfirmParent(null);
        }}
        onCancel={() => setConfirmParent(null)}
      />
    </div>
  );
}
