import { conteudoApagado } from './conteudosApagados.ts';
import type { AppData, Content, Platform } from './database';

function mergePlatforms(current: Platform[], incoming: Platform[]): Platform[] {
  // Lista vazia é busca que não voltou: não apaga o que a tela já tem.
  if (incoming.length === 0) return current;
  const local = new Map(current.map(platform => [platform.id, platform]));
  return incoming.map(platform => {
    const atual = local.get(platform.id);
    // Só a edição local mais nova que o banco fica. Nome ou status de outro aparelho entra.
    if (atual && updatedAtMs(atual) > updatedAtMs(platform)) return atual;
    return platform;
  });
}

function updatedAtMs(record: { updatedAt?: string | null }): number {
  const value = Date.parse(record.updatedAt ?? '');
  return Number.isNaN(value) ? 0 : value;
}

/**
 * O registro local só vence quando é tão recente quanto o do servidor: protege edições
 * ainda não confirmadas sem deixar um cache antigo esconder o que já foi salvo.
 */
function mergeContentRecords(local: Content, remote: Content): Content {
  if (updatedAtMs(remote) > updatedAtMs(local)) {
    return {
      ...local,
      ...remote,
      script: remote.script ?? local.script,
      // Lista vazia é comentário apagado. Ausente (undefined) é campo que a lista leve não trouxe.
      scriptNotes: remote.scriptNotes ?? local.scriptNotes,
      notes: remote.notes ?? local.notes,
      referencias: remote.referencias ?? local.referencias,
      writingNotes: remote.writingNotes ?? local.writingNotes,
      writingMode: remote.writingMode ?? local.writingMode,
      carouselSlides: remote.carouselSlides ?? local.carouselSlides,
      proposta: remote.proposta ?? local.proposta,
    };
  }

  return {
    ...remote,
    ...local,
    script: local.script ?? remote.script,
    scriptNotes: local.scriptNotes ?? remote.scriptNotes,
    notes: local.notes ?? remote.notes,
    referencias: local.referencias ?? remote.referencias,
    writingNotes: local.writingNotes ?? remote.writingNotes,
    writingMode: local.writingMode ?? remote.writingMode,
    carouselSlides: local.carouselSlides ?? remote.carouselSlides,
    proposta: local.proposta ?? remote.proposta,
    plataformas: local.plataformas?.length ? local.plataformas : remote.plataformas,
  };
}

function semApagados(lista: readonly Content[]): Content[] {
  return lista.filter(content => !conteudoApagado(content.id));
}

function mergeContents(current: Content[], incoming: Content[]): Content[] {
  const remotos = semApagados(incoming);
  if (current.length === 0) return remotos;
  const byId = new Map(remotos.map(content => [content.id, content]));
  for (const content of semApagados(current)) {
    const fromIncoming = byId.get(content.id);
    byId.set(content.id, fromIncoming ? mergeContentRecords(content, fromIncoming) : content);
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * A lista completa do servidor (não o resumo limitado) é a fonte do que ainda existe.
 * Roteiro que não veio nessa lista sai da tela, menos gravação com erro, item arquivado
 * e item alterado depois que a busca começou.
 */
export function aplicarListaCompletaDeConteudos(
  merged: readonly Content[],
  servidor: readonly Content[],
  options?: { manterIds?: ReadonlySet<string>; alteradoDesdeMs?: number },
): Content[] {
  const vivos = new Set(servidor.map(content => content.id));
  const manter = options?.manterIds;
  const desde = options?.alteradoDesdeMs ?? 0;
  return semApagados(merged).filter(content => {
    if (vivos.has(content.id)) return true;
    if (manter?.has(content.id)) return true;
    if (content.archivedAt && !content.deletedAt) return true;
    return desde > 0 && updatedAtMs(content) >= desde;
  });
}

type MergeSnapshot = Pick<AppData, 'platforms' | 'contents'>;

/** Evita que fetch/cache antigo apague dados recém-salvos no estado local. */
export function mergeFetchedAppData<T extends Partial<AppData>>(
  current: MergeSnapshot,
  incoming: T,
): T {
  let next: T = incoming;

  if (incoming.platforms) {
    next = {
      ...next,
      platforms: mergePlatforms(current.platforms, incoming.platforms),
    };
  }

  if (incoming.contents) {
    next = {
      ...next,
      contents: mergeContents(current.contents, incoming.contents),
    };
  }

  return next;
}

/**
 * Foto guardada com as partes que mudaram numa gravação, ou `null` se ela não traz nenhuma.
 * Só entram as partes que a foto já guardava. Roteiros ficam de fora: têm ajuste próprio,
 * que conhece a lista leve.
 */
export function patchChangedSlices(
  payload: Partial<AppData>,
  before: Partial<AppData>,
  after: Partial<AppData>,
): Partial<AppData> | null {
  const patch: Record<string, unknown> = {};
  (Object.keys(payload) as (keyof AppData)[]).forEach(key => {
    if (key === 'contents') return;
    if (after[key] === undefined || before[key] === after[key]) return;
    patch[key] = after[key];
  });
  return Object.keys(patch).length > 0 ? { ...payload, ...patch } : null;
}

export { mergeContents, mergePlatforms };
