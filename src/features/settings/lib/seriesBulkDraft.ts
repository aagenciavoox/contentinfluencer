import type { Content, Serie } from '../../../lib/database.ts';
import { htmlToReadableText } from '../../../lib/utils.ts';
import { generateUUID } from '../../../utils/uuid.ts';
import { createContentDraft } from '../../contents/lib/createContentDraft.ts';
import { CONTENT_STATUS } from '../../contents/lib/contentPipeline.ts';

export type ModoBloco = 'ideia' | 'roteiro';

export type BlocoMassa = {
  id: string;
  modo: ModoBloco;
  serieId: string;
  temporadaId: string | null;
  titulo: string;
  texto: string;
  criado: boolean;
};

export type RascunhoMassa = {
  blocos: BlocoMassa[];
};

export const RASCUNHO_MASSA_VAZIO: RascunhoMassa = { blocos: [] };

export function chaveRascunhoMassa(serieId: string) {
  return `criaki:serie-massa:${serieId}`;
}

export function criarBloco(input: {
  id?: string;
  serieId: string;
  temporadaId?: string | null;
  modo?: ModoBloco;
}): BlocoMassa {
  return {
    id: input.id ?? generateUUID(),
    modo: input.modo ?? 'roteiro',
    serieId: input.serieId,
    temporadaId: input.temporadaId ?? null,
    titulo: '',
    texto: '',
    criado: false,
  };
}

export function textoDoBloco(texto: string) {
  return htmlToReadableText(texto).trim();
}

export function blocoPronto(bloco: BlocoMassa) {
  if (!bloco.titulo.trim()) return false;
  if (bloco.modo === 'roteiro' && !textoDoBloco(bloco.texto)) return false;
  return true;
}

/** Blocos que ainda vão virar conteúdo. Id já existente não entra de novo. */
export function blocosPendentes(
  blocos: readonly BlocoMassa[],
  idsExistentes: ReadonlySet<string>,
): BlocoMassa[] {
  return blocos.filter(bloco => !bloco.criado && !idsExistentes.has(bloco.id) && blocoPronto(bloco));
}

export function marcarCriados(
  blocos: readonly BlocoMassa[],
  ids: ReadonlySet<string>,
): BlocoMassa[] {
  if (ids.size === 0) return [...blocos];
  return blocos.map(bloco => (ids.has(bloco.id) ? { ...bloco, criado: true } : bloco));
}

/**
 * Abrir em massa com rascunho guarda os blocos.
 * Abrir por um quadro ou temporada preenche o contexto, sem apagar o que já foi escrito.
 */
export function aplicarContextoNoRascunho(
  rascunho: RascunhoMassa,
  contexto: { serieId: string; temporadaId: string | null },
  origem: 'massa' | 'grupo',
  novoId: string,
): RascunhoMassa {
  if (origem === 'massa' && rascunho.blocos.length > 0) return rascunho;
  const bloco = criarBloco({
    id: novoId,
    serieId: contexto.serieId,
    temporadaId: contexto.temporadaId,
  });
  if (origem === 'massa') return { blocos: [bloco] };
  const ultimo = rascunho.blocos.at(-1);
  const vazio = Boolean(
    ultimo
    && !ultimo.criado
    && !ultimo.titulo.trim()
    && !textoDoBloco(ultimo.texto),
  );
  if (ultimo && vazio) {
    const blocos = rascunho.blocos.slice();
    blocos[blocos.length - 1] = {
      ...ultimo,
      serieId: contexto.serieId,
      temporadaId: contexto.temporadaId,
    };
    return { blocos };
  }
  return { blocos: [...rascunho.blocos, bloco] };
}

function slotDaSerie(serie: Serie): Content['slotType'] {
  if (serie.slotPadrao === 'ÚNICO' || serie.slotPadrao === 'SÉRIE' || serie.slotPadrao === 'JANELA') {
    return serie.slotPadrao;
  }
  return null;
}

/** Conteúdo novo. O id do bloco evita duplicar se a gravação for tentada de novo. */
export function conteudoDoBloco(
  bloco: BlocoMassa,
  serie: Serie,
  series: readonly Serie[],
): Content {
  const titulo = bloco.titulo.trim();
  const texto = bloco.texto;
  const ideia = bloco.modo === 'ideia';
  return createContentDraft({
    id: bloco.id,
    title: titulo,
    status: ideia ? CONTENT_STATUS.IDEIA : CONTENT_STATUS.ROTEIRO,
    seriesId: bloco.serieId,
    temporadaId: bloco.temporadaId,
    script: ideia ? null : texto,
    notes: ideia ? (textoDoBloco(texto) || null) : null,
    slotType: slotDaSerie(serie),
    publishDate: null,
    publishTime: null,
    postedAt: null,
    recordedAt: null,
    plataformas: [],
  }, serie, series);
}

function blocoDoJson(value: unknown): BlocoMassa | null {
  if (!value || typeof value !== 'object') return null;
  const bruto = value as Partial<BlocoMassa>;
  if (typeof bruto.id !== 'string' || typeof bruto.serieId !== 'string') return null;
  if (bruto.modo !== 'ideia' && bruto.modo !== 'roteiro') return null;
  if (typeof bruto.titulo !== 'string' || typeof bruto.texto !== 'string') return null;
  return {
    id: bruto.id,
    modo: bruto.modo,
    serieId: bruto.serieId,
    temporadaId: typeof bruto.temporadaId === 'string' ? bruto.temporadaId : null,
    titulo: bruto.titulo,
    texto: bruto.texto,
    criado: Boolean(bruto.criado),
  };
}

export function lerRascunhoMassa(serieId: string): RascunhoMassa {
  if (typeof sessionStorage === 'undefined') return RASCUNHO_MASSA_VAZIO;
  try {
    const raw = sessionStorage.getItem(chaveRascunhoMassa(serieId));
    if (!raw) return RASCUNHO_MASSA_VAZIO;
    const parsed = JSON.parse(raw) as { blocos?: unknown };
    if (!Array.isArray(parsed?.blocos)) return RASCUNHO_MASSA_VAZIO;
    return { blocos: parsed.blocos.map(blocoDoJson).filter((bloco): bloco is BlocoMassa => Boolean(bloco)) };
  } catch {
    return RASCUNHO_MASSA_VAZIO;
  }
}

export function gravarRascunhoMassa(serieId: string, rascunho: RascunhoMassa) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (rascunho.blocos.length === 0) {
      sessionStorage.removeItem(chaveRascunhoMassa(serieId));
      return;
    }
    sessionStorage.setItem(chaveRascunhoMassa(serieId), JSON.stringify(rascunho));
  } catch {
    // Rascunho em memória segue valendo se o armazenamento estiver cheio.
  }
}

export function apagarRascunhoMassa(serieId: string) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(chaveRascunhoMassa(serieId));
  } catch {
    // Nada a restaurar.
  }
}
