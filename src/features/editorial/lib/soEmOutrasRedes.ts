import type { ContentPlataforma } from '../../../lib/database.ts';
import { type DestinoPlataforma } from './destinations.ts';
import { referenciaPublicacao, type ReferenciaSettings } from './referenciaPublicacao.ts';

export type ConteudoOutrasRedes = {
  id: string;
  title?: string | null;
  status?: string | null;
  deletedAt?: string | null;
  archivedAt?: string | null;
  publishDate?: string | null;
  publishTime?: string | null;
  formatoVisual?: string | null;
  plataformas?: readonly ContentPlataforma[];
  redeReferenciaCongeladaId?: string | null;
};

/** Conteúdos que só têm publicação fora da rede de base — fora da grade. */
export function listarSoEmOutrasRedes({
  contents,
  settings,
  platforms = [],
}: {
  contents: readonly ConteudoOutrasRedes[];
  settings: ReferenciaSettings;
  platforms?: readonly DestinoPlataforma[];
}): ConteudoOutrasRedes[] {
  if (!settings.redeReferenciaId) return [];
  return contents.filter(content => {
    if (content.deletedAt || content.archivedAt) return false;
    return referenciaPublicacao(content, settings, platforms).soEmOutrasRedes;
  });
}
