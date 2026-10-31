import type { Content, Serie } from '../../../lib/database.ts';
import { htmlToReadableText } from '../../../lib/utils.ts';
import { generateUUID } from '../../../utils/uuid.ts';
import { createContentDraft } from '../../contents/lib/createContentDraft.ts';
import { CONTENT_STATUS } from '../../contents/lib/contentPipeline.ts';

export type ModoBloco = 'ideia' | 'roteiro';

/** Campos que o conjunto define e cada entrada pode ajustar. */
export type CampoComum = 'modo' | 'serieId' | 'temporadaId';

export type ComumMassa = {
  modo: ModoBloco;
  serieId: string;
  temporadaId: string | null;
};

export type BlocoMassa = {
  id: string;
  modo: ModoBloco;
  serieId: string;
  temporadaId: string | null;
  titulo: string;
  texto: string;
  criado: boolean;
  /** Campos que esta entrada ajustou; os outros acompanham o conjunto. */
  proprio?: Partial<Record<CampoComum, boolean>>;
  /** Entrada fechada mostra só o título. */
  recolhido?: boolean;
};

export type RascunhoMassa = {
  comum?: ComumMassa;
  blocos: BlocoMassa[];
};

export const RASCUNHO_MASSA_VAZIO: RascunhoMassa = { blocos: [] };

export function chaveRascunhoMassa(serieId: string) {
  return `criaki:serie-massa:${serieId}`;
}

export function comumPadrao(serieId: string, rascunho?: RascunhoMassa): ComumMassa {
  return rascunho?.comum ?? { modo: 'roteiro', serieId, temporadaId: null };
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

/** O título basta. O texto é opcional, inclusive no roteiro. */
export function blocoPronto(bloco: BlocoMassa) {
  return Boolean(bloco.titulo.trim());
}

/** Entrada com texto e sem título: não dá para criar, e não pode sumir calada. */
export function blocosSemTitulo(blocos: readonly BlocoMassa[]): BlocoMassa[] {
  return blocos.filter(bloco => !bloco.criado && !bloco.titulo.trim() && Boolean(textoDoBloco(bloco.texto)));
}

/** Blocos que ainda vão virar conteúdo. Id já existente não entra de novo. */
export function blocosPendentes(
  blocos: readonly BlocoMassa[],
  idsExistentes: ReadonlySet<string>,
): BlocoMassa[] {
  return blocos.filter(bloco => !bloco.criado && !idsExistentes.has(bloco.id) && blocoPronto(bloco));
}

export function resumoDosPendentes(blocos: readonly BlocoMassa[]) {
  const ideias = blocos.filter(bloco => bloco.modo === 'ideia').length;
  return { conteudos: blocos.length, ideias, roteiros: blocos.length - ideias };
}

export function marcarCriados(
  blocos: readonly BlocoMassa[],
  ids: ReadonlySet<string>,
): BlocoMassa[] {
  if (ids.size === 0) return [...blocos];
  return blocos.map(bloco => (ids.has(bloco.id) ? { ...bloco, criado: true } : bloco));
}

/** Muda um valor do conjunto. Entradas que ajustaram esse campo ficam como estão. */
export function aplicarComum(
  rascunho: RascunhoMassa,
  serieId: string,
  patch: Partial<ComumMassa>,
): RascunhoMassa {
  const comum = { ...comumPadrao(serieId, rascunho), ...patch };
  const campos = Object.keys(patch) as CampoComum[];
  return {
    comum,
    blocos: rascunho.blocos.map(bloco => {
      if (bloco.criado) return bloco;
      const proximo = { ...bloco };
      for (const campo of campos) {
        if (bloco.proprio?.[campo]) continue;
        if (campo === 'modo') proximo.modo = comum.modo;
        if (campo === 'serieId') proximo.serieId = comum.serieId;
        if (campo === 'temporadaId') proximo.temporadaId = comum.temporadaId;
      }
      return proximo;
    }),
  };
}

/** Ajusta uma entrada. Valor igual ao do conjunto volta a acompanhar o conjunto. */
export function alterarBloco(
  rascunho: RascunhoMassa,
  serieId: string,
  blocoId: string,
  patch: Partial<Omit<BlocoMassa, 'id' | 'criado' | 'proprio'>>,
): RascunhoMassa {
  const comum = comumPadrao(serieId, rascunho);
  return {
    ...rascunho,
    blocos: rascunho.blocos.map(bloco => {
      if (bloco.id !== blocoId) return bloco;
      const proximo: BlocoMassa = { ...bloco, ...patch };
      const proprio = { ...bloco.proprio };
      for (const campo of ['modo', 'serieId', 'temporadaId'] as const) {
        if (campo in patch) proprio[campo] = proximo[campo] !== comum[campo];
      }
      proximo.proprio = proprio;
      return proximo;
    }),
  };
}

/** Nova entrada com os valores do conjunto. */
export function adicionarBloco(rascunho: RascunhoMassa, serieId: string, id: string): RascunhoMassa {
  const comum = comumPadrao(serieId, rascunho);
  return {
    ...rascunho,
    blocos: [...rascunho.blocos, criarBloco({ id, ...comum })],
  };
}

/** Leva a entrada para outra posição (setas ou arrastar). */
export function moverBloco(rascunho: RascunhoMassa, blocoId: string, destino: number): RascunhoMassa {
  const origem = rascunho.blocos.findIndex(bloco => bloco.id === blocoId);
  if (origem < 0) return rascunho;
  const alvo = Math.max(0, Math.min(rascunho.blocos.length - 1, destino));
  if (alvo === origem) return rascunho;
  const blocos = rascunho.blocos.slice();
  const [bloco] = blocos.splice(origem, 1);
  blocos.splice(alvo, 0, bloco);
  return { ...rascunho, blocos };
}

/**
 * Abrir em massa com rascunho guarda os blocos.
 * Abrir por um quadro ou temporada passa esse contexto ao conjunto, sem apagar o que já foi escrito.
 */
export function aplicarContextoNoRascunho(
  rascunho: RascunhoMassa,
  contexto: { serieId: string; temporadaId: string | null },
  origem: 'massa' | 'grupo',
  novoId: string,
): RascunhoMassa {
  if (origem === 'massa' && rascunho.blocos.length > 0) return rascunho;
  const comum: ComumMassa = {
    modo: rascunho.comum?.modo ?? 'roteiro',
    serieId: contexto.serieId,
    temporadaId: contexto.temporadaId,
  };
  const bloco = criarBloco({ id: novoId, ...comum });
  if (origem === 'massa') return { comum, blocos: [bloco] };
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
      proprio: { ...ultimo.proprio, serieId: false, temporadaId: false },
    };
    return { comum, blocos };
  }
  return { comum, blocos: [...rascunho.blocos, bloco] };
}

function slotDaSerie(serie: Serie): Content['slotType'] {
  if (serie.slotPadrao === 'ÚNICO' || serie.slotPadrao === 'SÉRIE' || serie.slotPadrao === 'JANELA') {
    return serie.slotPadrao;
  }
  return null;
}

/**
 * Conteúdo novo. O id do bloco evita duplicar se a gravação for tentada de novo.
 * Roteiro sem texto fica sem script, e o modelo da série entra como em qualquer roteiro novo.
 */
export function conteudoDoBloco(
  bloco: BlocoMassa,
  serie: Serie,
  series: readonly Serie[],
): Content {
  const titulo = bloco.titulo.trim();
  const texto = bloco.texto;
  const ideia = bloco.modo === 'ideia';
  const temTexto = Boolean(textoDoBloco(texto));
  return createContentDraft({
    id: bloco.id,
    title: titulo,
    status: ideia ? CONTENT_STATUS.IDEIA : CONTENT_STATUS.ROTEIRO,
    seriesId: bloco.serieId,
    temporadaId: bloco.temporadaId,
    ...(ideia ? { script: null } : temTexto ? { script: texto } : {}),
    notes: ideia ? (textoDoBloco(texto) || null) : null,
    slotType: slotDaSerie(serie),
    publishDate: null,
    publishTime: null,
    postedAt: null,
    recordedAt: null,
    plataformas: [],
  }, serie, series);
}

function lerProprio(value: unknown): BlocoMassa['proprio'] {
  if (!value || typeof value !== 'object') return undefined;
  const bruto = value as Record<string, unknown>;
  return {
    modo: bruto.modo === true,
    serieId: bruto.serieId === true,
    temporadaId: bruto.temporadaId === true,
  };
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
    proprio: lerProprio(bruto.proprio),
    recolhido: bruto.recolhido === true,
  };
}

function comumDoJson(value: unknown): ComumMassa | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const bruto = value as Partial<ComumMassa>;
  if (typeof bruto.serieId !== 'string') return undefined;
  return {
    modo: bruto.modo === 'ideia' ? 'ideia' : 'roteiro',
    serieId: bruto.serieId,
    temporadaId: typeof bruto.temporadaId === 'string' ? bruto.temporadaId : null,
  };
}

export function lerRascunhoMassa(serieId: string): RascunhoMassa {
  if (typeof sessionStorage === 'undefined') return RASCUNHO_MASSA_VAZIO;
  try {
    const raw = sessionStorage.getItem(chaveRascunhoMassa(serieId));
    if (!raw) return RASCUNHO_MASSA_VAZIO;
    const parsed = JSON.parse(raw) as { blocos?: unknown; comum?: unknown };
    if (!Array.isArray(parsed?.blocos)) return RASCUNHO_MASSA_VAZIO;
    return {
      comum: comumDoJson(parsed.comum),
      blocos: parsed.blocos.map(blocoDoJson).filter((bloco): bloco is BlocoMassa => Boolean(bloco)),
    };
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
