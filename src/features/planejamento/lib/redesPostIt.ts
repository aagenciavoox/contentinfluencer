import type {RedeDoFiltro} from '../../contas/lib/contas.ts';

/**
 * Ordem na tela: primeiro os três curtos (Reels, TikTok, Shorts),
 * depois o YouTube longo e por último o carrossel.
 */
export const ORDEM_EXIBICAO_REDE: readonly RedeDoFiltro[] = [
  'instagram-video', 'instagram', 'tiktok', 'tiktok-video', 'youtube-shorts',
  'youtube',
  'instagram-carrossel', 'tiktok-carrossel',
  'blog', 'outra',
];

/** Bloco visual do seletor: 0 curtos, 1 YouTube longo, 2 carrossel, 3 o resto. */
export function grupoVisualDaRede(rede: RedeDoFiltro): 0 | 1 | 2 | 3 {
  if (rede === 'youtube') return 1;
  if (rede === 'instagram-carrossel' || rede === 'tiktok-carrossel') return 2;
  if (rede === 'blog' || rede === 'outra') return 3;
  return 0;
}

/** Fatia a lista já ordenada em blocos visuais contíguos. */
export function agruparPorBlocoVisual<T>(itens: readonly T[], redeDe: (item: T) => RedeDoFiltro): T[][] {
  const grupos: T[][] = [];
  for (const item of itens) {
    const grupo = grupoVisualDaRede(redeDe(item));
    const ultimo = grupos[grupos.length - 1];
    if (!ultimo || grupoVisualDaRede(redeDe(ultimo[0])) !== grupo) grupos.push([item]);
    else ultimo.push(item);
  }
  return grupos;
}

export function compararExibicaoRede(a: RedeDoFiltro, b: RedeDoFiltro): number {
  const indice = (rede: RedeDoFiltro) => {
    const posicao = ORDEM_EXIBICAO_REDE.indexOf(rede);
    return posicao < 0 ? ORDEM_EXIBICAO_REDE.length : posicao;
  };
  return indice(a) - indice(b);
}

/** Valores conhecidos de rede no post-it / foco (whitelist). */
export const REDES_DO_POSTIT: readonly RedeDoFiltro[] = [
  'instagram', 'instagram-video', 'instagram-carrossel',
  'tiktok', 'tiktok-video', 'tiktok-carrossel',
  'youtube', 'youtube-shorts', 'blog', 'outra',
];

const CONHECIDAS = new Set<string>(REDES_DO_POSTIT);

/**
 * Lê redes do banco, do MCP ou dos chips: só valores conhecidos, sem repetir,
 * na ordem em que vieram (clique / gravação). Não reordena por fila fixa.
 */
export function normalizarRedesPostIt(value: unknown): RedeDoFiltro[] {
  if (!Array.isArray(value)) return [];
  const vistas = new Set<string>();
  const out: RedeDoFiltro[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const rede = item.trim().toLowerCase();
    if (!CONHECIDAS.has(rede) || vistas.has(rede)) continue;
    vistas.add(rede);
    out.push(rede as RedeDoFiltro);
  }
  return out;
}

/** Mutuamente exclusivos nos chips de foco (mesmo conjunto do RedeChips). */
const EXCLUSOES_NO_FOCO: Partial<Record<RedeDoFiltro, readonly RedeDoFiltro[]>> = {
  youtube: ['youtube-shorts'],
  'youtube-shorts': ['youtube'],
  'instagram-video': ['instagram', 'instagram-carrossel'],
  'instagram-carrossel': ['instagram', 'instagram-video'],
};

/**
 * Marca ou desmarca uma rede no foco, preservando a ordem de clique.
 * Nova rede entra no fim; exclusões saem sem reordenar o restante.
 */
export function alternarRedeNoFoco(
  atuais: readonly RedeDoFiltro[],
  clicada: RedeDoFiltro,
): RedeDoFiltro[] {
  const base = normalizarRedesPostIt(atuais);
  if (base.includes(clicada)) {
    return base.filter(rede => rede !== clicada);
  }
  const exclusoes = EXCLUSOES_NO_FOCO[clicada] ?? [];
  const semExcluidas = base.filter(rede => !exclusoes.includes(rede));
  return normalizarRedesPostIt([...semExcluidas, clicada]);
}


/**
 * Chips selecionados primeiro, na ordem gravada/clicada; o restante na ordem de exibição.
 * Assim o usuário vê a mesma ordem que a sugestão de formato usa.
 */
export function ordenarChipsDoFoco<T extends {destino: RedeDoFiltro}>(
  chips: readonly T[],
  selecionadas: readonly RedeDoFiltro[],
): T[] {
  const ordem = normalizarRedesPostIt(selecionadas);
  return [...chips].sort((a, b) => {
    const ia = ordem.indexOf(a.destino);
    const ib = ordem.indexOf(b.destino);
    const aSel = ia >= 0;
    const bSel = ib >= 0;
    if (aSel && bSel) return ia - ib;
    if (aSel !== bSel) return aSel ? -1 : 1;
    return compararExibicaoRede(a.destino, b.destino);
  });
}

/** Mesmas redes, sem olhar a ordem. */
export function mesmasRedes(
  a: readonly RedeDoFiltro[] | null | undefined,
  b: readonly RedeDoFiltro[] | null | undefined,
): boolean {
  const x = normalizarRedesPostIt(a ?? []);
  const y = normalizarRedesPostIt(b ?? []);
  if (x.length !== y.length) return false;
  const setY = new Set(y);
  return x.every(rede => setY.has(rede));
}

/** O post-it rápido só pede a nota. */
export function postItRapidoPodeSalvar(input: {texto: string}): boolean {
  return input.texto.trim().length > 0;
}
