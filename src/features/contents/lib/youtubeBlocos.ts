import { generateUUID } from '../../../utils/uuid.ts';
import { countSpokenWords, YOUTUBE_WPM_FAST, YOUTUBE_WPM_SLOW } from './youtubeScript.ts';

/**
 * Um bloco do YouTube longo. O roteiro corrido é a projeção destes blocos:
 * o nome vira título e o roteiro fica embaixo. As referências não entram no HTML.
 */
export interface YoutubeBloco {
  id: string;
  nome: string;
  /** HTML do bloco, com tópicos, fala e "Na tela". */
  roteiro: string;
  /** Links de imagem e notas de som, música e vídeo. */
  referencias: string;
}

const TITULO = /<h([12])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;

export function criarYoutubeBloco(parcial: Partial<YoutubeBloco> = {}): YoutubeBloco {
  return {
    id: parcial.id?.trim() || generateUUID(),
    nome: parcial.nome ?? '',
    roteiro: parcial.roteiro ?? '',
    referencias: parcial.referencias ?? '',
  };
}

export function blocoTemConteudo(bloco: YoutubeBloco): boolean {
  return Boolean(bloco.nome.trim() || textoDoHtml(bloco.roteiro) || /data-na-tela/i.test(bloco.roteiro) || bloco.referencias.trim());
}

export function blocosTemConteudo(blocos: readonly YoutubeBloco[] | null | undefined): boolean {
  return (blocos ?? []).some(blocoTemConteudo);
}

/** Lê a coluna. `null` e lixo contam como "ainda não virou blocos". */
export function readYoutubeBlocos(value: unknown): YoutubeBloco[] | null {
  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      return null;
    }
  }
  if (source == null) return null;
  if (!Array.isArray(source)) return null;
  return source.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const raw = item as Record<string, unknown>;
    return [criarYoutubeBloco({
      id: typeof raw.id === 'string' ? raw.id : undefined,
      nome: typeof raw.nome === 'string' ? raw.nome : '',
      roteiro: typeof raw.roteiro === 'string' ? raw.roteiro : '',
      referencias: typeof raw.referencias === 'string' ? raw.referencias : '',
    })];
  });
}

/**
 * Parte o HTML do roteiro em blocos. Título 1 ou 2 abre um bloco.
 * O que vem antes do primeiro título é um bloco sem nome.
 * Referências de um bloco já conhecido permanecem, pelo id ou pelo nome único.
 */
export function htmlParaBlocos(html: string | null | undefined, anteriores: readonly YoutubeBloco[] = []): YoutubeBloco[] {
  const fonte = html ?? '';
  const usados = new Set<string>();
  const partes = partirHtml(fonte);
  if (partes.length === 0) return [];

  return partes.map(parte => {
    const anterior = tomarAnterior(parte, anteriores, usados);
    if (anterior) usados.add(anterior.id);
    const id = parte.id || anterior?.id || generateUUID();
    usados.add(id);
    return {
      id,
      nome: parte.nome,
      roteiro: parte.roteiro,
      referencias: anterior?.referencias ?? '',
    };
  });
}

/** Primeira abertura das colunas: o roteiro vira blocos. Vazio ganha uma linha. */
export function blocosDesdeRoteiro(html: string | null | undefined, anteriores: readonly YoutubeBloco[] | null = []): YoutubeBloco[] {
  const blocos = htmlParaBlocos(html, anteriores ?? []);
  return blocos.length > 0 ? blocos : [criarYoutubeBloco()];
}

/** Projeção corrida. O primeiro bloco sem nome fica sem título, para o texto inicial não ganhar um título vazio. */
export function blocosParaHtml(blocos: readonly YoutubeBloco[]): string {
  return blocos.map((bloco, index) => {
    const corpo = bloco.roteiro.trim();
    if (index === 0 && !bloco.nome.trim()) return corpo;
    const titulo = `<h2 data-bloco="${escapeAttr(bloco.id)}">${escapeHtml(bloco.nome)}</h2>`;
    return corpo ? `${titulo}${corpo.startsWith('<') ? corpo : `<p>${escapeHtml(corpo)}</p>`}` : `${titulo}<p></p>`;
  }).join('');
}

export function atualizarBloco(
  blocos: readonly YoutubeBloco[],
  id: string,
  patch: Partial<Pick<YoutubeBloco, 'nome' | 'roteiro' | 'referencias'>>,
): YoutubeBloco[] {
  return blocos.map(bloco => (bloco.id === id ? { ...bloco, ...patch } : bloco));
}

export function moverBloco(blocos: readonly YoutubeBloco[], id: string, delta: -1 | 1): YoutubeBloco[] {
  const index = blocos.findIndex(bloco => bloco.id === id);
  const destino = index + delta;
  if (index < 0 || destino < 0 || destino >= blocos.length) return [...blocos];
  const next = [...blocos];
  const [item] = next.splice(index, 1);
  next.splice(destino, 0, item);
  return next;
}

export function reordenarBloco(
  blocos: readonly YoutubeBloco[],
  origemId: string,
  destinoId: string,
): YoutubeBloco[] {
  if (origemId === destinoId) return [...blocos];
  const origemIndex = blocos.findIndex(bloco => bloco.id === origemId);
  const destinoIndex = blocos.findIndex(bloco => bloco.id === destinoId);
  if (origemIndex < 0 || destinoIndex < 0) return [...blocos];
  const next = [...blocos];
  const [item] = next.splice(origemIndex, 1);
  next.splice(destinoIndex, 0, item);
  return next;
}

export interface MetricaBloco {
  palavras: number;
  segundos: number;
  duracaoCurta: string;
  janelaTempo: string | null;
}

export interface MetricasDosBlocos {
  porId: Record<string, MetricaBloco>;
  totalPalavras: number;
  totalSegundos: number;
  totalDuracaoCurta: string;
}

const WPM_MEDIO = (YOUTUBE_WPM_SLOW + YOUTUBE_WPM_FAST) / 2;

function formatarMinSeg(totalSegundos: number): string {
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

export function formatarDuracaoCurta(totalSegundos: number): string {
  if (totalSegundos <= 0) return '';
  if (totalSegundos < 60) return `~${totalSegundos}s`;
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return segundos > 0 ? `~${minutos} min ${segundos}s` : `~${minutos} min`;
}

/**
 * Conta palavras faladas por bloco (sem "Na tela" nem referências) e calcula a janela
 * acumulada estimada a partir do ritmo médio de fala (130 ppm).
 */
export function metricasDosBlocos(blocos: readonly YoutubeBloco[]): MetricasDosBlocos {
  const porId: Record<string, MetricaBloco> = {};
  let totalPalavras = 0;
  let acumuladoSegundos = 0;

  for (const bloco of blocos) {
    const palavras = countSpokenWords(bloco.roteiro);
    const segundos = palavras > 0 ? Math.max(1, Math.round((palavras / WPM_MEDIO) * 60)) : 0;
    const inicio = acumuladoSegundos;
    acumuladoSegundos += segundos;
    totalPalavras += palavras;

    porId[bloco.id] = {
      palavras,
      segundos,
      duracaoCurta: formatarDuracaoCurta(segundos),
      janelaTempo: segundos > 0 ? `~${formatarMinSeg(inicio)} – ${formatarMinSeg(acumuladoSegundos)}` : null,
    };
  }

  return {
    porId,
    totalPalavras,
    totalSegundos: acumuladoSegundos,
    totalDuracaoCurta: formatarDuracaoCurta(acumuladoSegundos),
  };
}

export function removerBloco(blocos: readonly YoutubeBloco[], id: string): YoutubeBloco[] {
  return blocos.filter(bloco => bloco.id !== id);
}

/** Modelo entra no fim. Cada título vira um bloco; o texto do modelo vira o roteiro. */
export function anexarBlocos(
  blocos: readonly YoutubeBloco[],
  secoes: readonly { nome: string; texto?: string | null }[],
): YoutubeBloco[] {
  return [
    ...blocos,
    ...secoes.map(secao => criarYoutubeBloco({
      nome: secao.nome,
      roteiro: secao.texto?.trim() ? `<p>${escapeHtml(secao.texto.trim())}</p>` : '<p></p>',
    })),
  ];
}

interface ParteHtml {
  id: string | null;
  nome: string;
  roteiro: string;
}

function partirHtml(html: string): ParteHtml[] {
  const partes: ParteHtml[] = [];
  const marcas = [...html.matchAll(TITULO)];
  if (marcas.length === 0) {
    if (!htmlVazio(html)) partes.push({ id: null, nome: '', roteiro: html.trim() });
    return partes;
  }

  const antes = html.slice(0, marcas[0].index ?? 0);
  if (!htmlVazio(antes)) partes.push({ id: null, nome: '', roteiro: antes.trim() });

  marcas.forEach((marca, index) => {
    const inicio = (marca.index ?? 0) + marca[0].length;
    const fim = index + 1 < marcas.length ? (marcas[index + 1].index ?? html.length) : html.length;
    const attrs = marca[2] ?? '';
    const id = /data-bloco\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]?.trim() || null;
    partes.push({
      id,
      nome: textoDoHtml(marca[3] ?? ''),
      roteiro: html.slice(inicio, fim).trim(),
    });
  });
  return partes;
}

function tomarAnterior(parte: ParteHtml, anteriores: readonly YoutubeBloco[], usados: ReadonlySet<string>): YoutubeBloco | undefined {
  if (parte.id) {
    const porId = anteriores.find(bloco => bloco.id === parte.id && !usados.has(bloco.id));
    if (porId) return porId;
  }
  if (!parte.nome.trim() && !parte.id) {
    const intro = anteriores.find(bloco => !bloco.nome.trim() && !usados.has(bloco.id));
    if (intro) return intro;
  }
  const nome = parte.nome.trim();
  if (!nome) return undefined;
  const mesmoNome = anteriores.filter(bloco => !usados.has(bloco.id) && bloco.nome.trim() === nome);
  return mesmoNome.length === 1 ? mesmoNome[0] : undefined;
}

function htmlVazio(html: string): boolean {
  return !textoDoHtml(html) && !/data-na-tela/i.test(html);
}

function textoDoHtml(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}
