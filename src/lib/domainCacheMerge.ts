import type { AppData, Content, Platform } from './database';

function mergePlatforms(current: Platform[], incoming: Platform[]): Platform[] {
  if (current.length === 0) return incoming;
  const byId = new Map(incoming.map(platform => [platform.id, platform]));
  for (const platform of current) {
    byId.set(platform.id, platform);
  }
  return [...byId.values()];
}

function mergeContentRecords(local: Content, remote: Content): Content {
  return {
    ...remote,
    ...local,
    script: local.script ?? remote.script,
    scriptNotes: local.scriptNotes?.length ? local.scriptNotes : remote.scriptNotes,
    notes: local.notes ?? remote.notes,
    referencias: local.referencias ?? remote.referencias,
    plataformas: local.plataformas?.length ? local.plataformas : remote.plataformas,
  };
}

function mergeContents(current: Content[], incoming: Content[]): Content[] {
  if (current.length === 0) return incoming;
  const byId = new Map(incoming.map(content => [content.id, content]));
  for (const content of current) {
    const fromIncoming = byId.get(content.id);
    byId.set(content.id, fromIncoming ? mergeContentRecords(content, fromIncoming) : content);
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

export { mergeContents, mergePlatforms };
