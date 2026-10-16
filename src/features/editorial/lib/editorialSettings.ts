import { platformKey } from '../../../components/ui/platformName.ts';
import type { FuncaoEditorial } from '../../../lib/database.ts';
import { FUNCOES } from './funcoes.ts';
import { readProporcao, type ProporcaoFuncoes } from './proporcaoObjetivos.ts';

export const EDITORIAL_SETTINGS_PREFERENCE_KEY = 'editorial_settings';

/** Objeto salvo em `editorial_settings`. Leitura antiga sobe para esta versão. */
export const EDITORIAL_SETTINGS_VERSION = 2;

/** Intenções gerais. Não descrevem um mês nem uma semana solta. */
export interface PreferenciasGerais {
  /** Teto de publicações na semana. Null é "ainda não definiu" — não é zero. */
  limiteSemanal: number | null;
  /**
   * Intenção semanal fora de série, já inclusa no limite quando os dois existem.
   * Não passa de `limiteSemanal`.
   */
  reservaForaSeriesSemanal: number | null;
  /** UUID da plataforma cuja data entra na grade. */
  redeReferenciaId: string | null;
  /** Reserva de prontos. Vazio não inventa um alvo. */
  reservaProntos: number | null;
  publicoLinguagem: string;
  disponibilidade: string;
  /** Hashtags do que não vem de série. */
  hashtagsForaSeries: string;
}

/** Exceção de uma semana fechada, domingo a sábado. */
export interface AjusteSemana {
  inicio: string;
  fim: string;
  limite: number;
}

/** Quantidades daquele intervalo. Chave ausente não é zero e não vem de outro período. */
export interface MetasPeriodo {
  atrair?: number;
  converter?: number;
  aprofundar?: number;
  comunidade?: number;
  acao?: number;
  reter?: number;
}

/** Decisão de um intervalo fechado. Outubro e novembro são registros diferentes. */
export interface DecisaoPeriodo {
  inicio: string;
  fim: string;
  prioridade: string;
  metas: MetasPeriodo;
  ajustesSemana: AjusteSemana[];
}

export interface EditorialSettings {
  versao: typeof EDITORIAL_SETTINGS_VERSION;
  /** Na tela Séries, permite criar uma série só com nome e cor. */
  quickSeriesCreate: boolean;
  /** Mostra quando uma série ainda tem informações em aberto. */
  openInfoNotices: boolean;
  /** Espelha `preferencias.redeReferenciaId`. */
  redeReferenciaId: string | null;
  /** UUIDs. "Onde você pretende publicar?" já vem marcado. */
  destinosPadrao: string[];
  /**
   * Chave antiga, em percentual. A leitura devolve sempre null:
   * o número antigo não vira meta de período.
   */
  distribuicaoFuncoes: Record<FuncaoEditorial, number> | null;
  /**
   * Proporção fixa por objetivo, em %. A meta de cada período sai dela × limite;
   * `periodos[].metas` passa a ser o ajuste daquele período.
   */
  proporcaoFuncoes: ProporcaoFuncoes | null;
  /** Espelha `preferencias.reservaProntos`. Vazio não inventa um alvo. */
  estoqueDesejado: number | null;
  /** Limite de hashtags por plataforma. Ausente usa 10. */
  limitesHashtags: Record<string, number>;
  preferencias: PreferenciasGerais;
  periodos: DecisaoPeriodo[];
}

const PREFERENCIAS_PADRAO: PreferenciasGerais = {
  limiteSemanal: null,
  reservaForaSeriesSemanal: null,
  redeReferenciaId: null,
  reservaProntos: null,
  publicoLinguagem: '',
  disponibilidade: '',
  hashtagsForaSeries: '',
};

export const DEFAULT_EDITORIAL_SETTINGS: EditorialSettings = {
  versao: EDITORIAL_SETTINGS_VERSION,
  quickSeriesCreate: true,
  openInfoNotices: true,
  redeReferenciaId: null,
  destinosPadrao: [],
  distribuicaoFuncoes: null,
  proporcaoFuncoes: null,
  estoqueDesejado: null,
  limitesHashtags: {},
  preferencias: PREFERENCIAS_PADRAO,
  periodos: [],
};

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function readIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.map(readId).filter((id): id is string => Boolean(id));
  return [...new Set(ids)];
}

function readTexto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Inteiro ≥ 0. Qualquer outra coisa, inclusive ausência, fica null — não vira 0. */
function readInteiroNaoNegativo(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null;
  return value;
}

function objeto(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function dataValida(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DATA_ISO.exec(value);
  if (!match) return false;
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

function datasDoIntervalo(inicio: unknown, fim: unknown): { inicio: string; fim: string } | null {
  if (!dataValida(inicio) || !dataValida(fim) || inicio > fim) return null;
  return { inicio, fim };
}

/** A reserva semanal cabe no limite. Se passar, acompanha o teto. */
function caberNoLimite(preferencias: PreferenciasGerais): PreferenciasGerais {
  const { limiteSemanal, reservaForaSeriesSemanal } = preferencias;
  if (limiteSemanal == null || reservaForaSeriesSemanal == null) return preferencias;
  if (reservaForaSeriesSemanal <= limiteSemanal) return preferencias;
  return { ...preferencias, reservaForaSeriesSemanal: limiteSemanal };
}

function preferenciasLegadas(saved: Record<string, unknown>): PreferenciasGerais {
  return {
    ...PREFERENCIAS_PADRAO,
    redeReferenciaId: readId(saved.redeReferenciaId),
    reservaProntos: readInteiroNaoNegativo(saved.estoqueDesejado),
  };
}

function preferenciasVersao2(saved: Record<string, unknown>): PreferenciasGerais {
  const fonte = objeto(saved.preferencias) ?? {};
  return caberNoLimite({
    limiteSemanal: readInteiroNaoNegativo(fonte.limiteSemanal),
    reservaForaSeriesSemanal: readInteiroNaoNegativo(fonte.reservaForaSeriesSemanal),
    redeReferenciaId: 'redeReferenciaId' in fonte
      ? readId(fonte.redeReferenciaId)
      : readId(saved.redeReferenciaId),
    reservaProntos: 'reservaProntos' in fonte
      ? readInteiroNaoNegativo(fonte.reservaProntos)
      : readInteiroNaoNegativo(saved.estoqueDesejado),
    publicoLinguagem: readTexto(fonte.publicoLinguagem),
    disponibilidade: readTexto(fonte.disponibilidade),
    hashtagsForaSeries: readTexto(fonte.hashtagsForaSeries),
  });
}

function readMetas(value: unknown): MetasPeriodo {
  const raw = objeto(value);
  if (!raw) return {};
  const metas: MetasPeriodo = {};
  for (const funcao of FUNCOES) {
    const quantidade = readInteiroNaoNegativo(raw[funcao]);
    if (quantidade == null) continue;
    metas[funcao] = quantidade;
  }
  return metas;
}

function readAjuste(value: unknown): AjusteSemana | null {
  const raw = objeto(value);
  if (!raw) return null;
  const datas = datasDoIntervalo(raw.inicio, raw.fim);
  if (!datas) return null;
  const limite = readInteiroNaoNegativo(raw.limite);
  if (limite == null) return null;
  return { ...datas, limite };
}

function readAjustes(value: unknown): AjusteSemana[] {
  if (!Array.isArray(value)) return [];
  const ajustes: AjusteSemana[] = [];
  for (const item of value) {
    const ajuste = readAjuste(item);
    if (!ajuste) continue;
    const index = ajustes.findIndex(atual => atual.inicio === ajuste.inicio && atual.fim === ajuste.fim);
    if (index === -1) ajustes.push(ajuste);
    else ajustes[index] = ajuste;
  }
  return ajustes;
}

function readDecisao(value: unknown): DecisaoPeriodo | null {
  const raw = objeto(value);
  if (!raw) return null;
  const datas = datasDoIntervalo(raw.inicio, raw.fim);
  if (!datas) return null;
  return {
    ...datas,
    prioridade: readTexto(raw.prioridade),
    metas: readMetas(raw.metas),
    ajustesSemana: readAjustes(raw.ajustesSemana),
  };
}

/** Um registro por inicio+fim. O último gravado fica; outro mês não entra no lugar. */
function readPeriodos(value: unknown): DecisaoPeriodo[] {
  if (!Array.isArray(value)) return [];
  const periodos: DecisaoPeriodo[] = [];
  for (const item of value) {
    const decisao = readDecisao(item);
    if (!decisao) continue;
    const index = periodos.findIndex(atual => atual.inicio === decisao.inicio && atual.fim === decisao.fim);
    if (index === -1) periodos.push(decisao);
    else periodos[index] = decisao;
  }
  return periodos;
}

function versaoNova(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= EDITORIAL_SETTINGS_VERSION;
}

function montar(
  base: Pick<EditorialSettings, 'quickSeriesCreate' | 'openInfoNotices' | 'destinosPadrao' | 'limitesHashtags'>
    & Partial<Pick<EditorialSettings, 'proporcaoFuncoes'>>,
  preferencias: PreferenciasGerais,
  periodos: DecisaoPeriodo[],
): EditorialSettings {
  return {
    versao: EDITORIAL_SETTINGS_VERSION,
    quickSeriesCreate: base.quickSeriesCreate,
    openInfoNotices: base.openInfoNotices,
    redeReferenciaId: preferencias.redeReferenciaId,
    destinosPadrao: base.destinosPadrao,
    distribuicaoFuncoes: null,
    proporcaoFuncoes: base.proporcaoFuncoes ?? null,
    estoqueDesejado: preferencias.reservaProntos,
    limitesHashtags: base.limitesHashtags,
    preferencias,
    periodos,
  };
}

export const LIMITE_HASHTAGS_PADRAO = 10;

/** Aviso do Instagram no feed e nos Reels. A lista não é cortada. */
const LIMITE_HASHTAGS_INSTAGRAM = 5;

function redeNormalizada(value: string): string {
  return platformKey(value).replace(/[^a-z0-9]/g, '');
}

function ehInstagramFeedOuReels(
  platformId: string | null | undefined,
  platformName: string | null | undefined,
): boolean {
  return [platformId, platformName].some(value => {
    if (!value?.trim()) return false;
    const key = redeNormalizada(value);
    return key.includes('instagram') || key === 'reels' || key.endsWith('reels');
  });
}

function readLimitesHashtags(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) {
    const id = key.trim();
    if (!id || typeof item !== 'number' || !Number.isInteger(item) || item < 1 || item > 30) continue;
    result[id] = item;
  }
  return result;
}

export function limiteHashtagsDaRede(
  settings: Pick<EditorialSettings, 'limitesHashtags'>,
  platformId: string | null | undefined,
  platformName?: string | null,
): number {
  if (ehInstagramFeedOuReels(platformId, platformName)) return LIMITE_HASHTAGS_INSTAGRAM;
  const byId = platformId ? settings.limitesHashtags[platformId] : undefined;
  if (typeof byId === 'number') return byId;
  const byName = platformName ? settings.limitesHashtags[platformName] : undefined;
  return typeof byName === 'number' ? byName : LIMITE_HASHTAGS_PADRAO;
}

/**
 * Lê `editorial_settings` e devolve sempre a versão 2.
 * Sem versão, ou com versão anterior: rede e estoque vão para preferencias,
 * o limite semanal continua null, periodos fica vazio e o percentual antigo
 * não é copiado para metas.
 */
export function getEditorialSettings(
  preferences: Record<string, unknown> | null | undefined,
): EditorialSettings {
  const saved = objeto(preferences?.[EDITORIAL_SETTINGS_PREFERENCE_KEY]);
  if (!saved) return DEFAULT_EDITORIAL_SETTINGS;

  const nova = versaoNova(saved.versao);
  return montar(
    {
      quickSeriesCreate: readBoolean(saved.quickSeriesCreate, DEFAULT_EDITORIAL_SETTINGS.quickSeriesCreate),
      openInfoNotices: readBoolean(saved.openInfoNotices, DEFAULT_EDITORIAL_SETTINGS.openInfoNotices),
      destinosPadrao: readIdList(saved.destinosPadrao),
      limitesHashtags: readLimitesHashtags(saved.limitesHashtags),
      proporcaoFuncoes: readProporcao(saved.proporcaoFuncoes),
    },
    nova ? preferenciasVersao2(saved) : preferenciasLegadas(saved),
    nova ? readPeriodos(saved.periodos) : [],
  );
}

/** Grava a decisão daquele inicio+fim. Outro intervalo permanece como estava. */
export function upsertDecisaoPeriodo(settings: EditorialSettings, decisao: DecisaoPeriodo): EditorialSettings {
  const normalizada = readDecisao(decisao);
  if (!normalizada) return settings;

  const index = settings.periodos.findIndex(
    item => item.inicio === normalizada.inicio && item.fim === normalizada.fim,
  );
  const periodos = index === -1
    ? [...settings.periodos, normalizada]
    : settings.periodos.map((item, i) => (i === index ? normalizada : item));

  return montar(settings, settings.preferencias, periodos);
}

/** Atualiza preferencias e realinha os espelhos do topo. */
export function atualizarPreferencias(
  settings: EditorialSettings,
  patch: Partial<PreferenciasGerais>,
): EditorialSettings {
  const bruto: Record<string, unknown> = { ...settings.preferencias };
  for (const chave of Object.keys(patch) as (keyof PreferenciasGerais)[]) {
    if (patch[chave] !== undefined) bruto[chave] = patch[chave];
  }
  return montar(settings, preferenciasVersao2({ preferencias: bruto }), settings.periodos);
}

/** Grava a proporção por objetivo. Vale para todos os períodos; null apaga. */
export function atualizarProporcao(
  settings: EditorialSettings,
  proporcao: ProporcaoFuncoes | null,
): EditorialSettings {
  return montar(
    { ...settings, proporcaoFuncoes: readProporcao(proporcao) },
    settings.preferencias,
    settings.periodos,
  );
}
