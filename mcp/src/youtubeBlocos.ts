import { randomUUID } from 'node:crypto';

/** Espelha os blocos do YouTube longo gravados em contents.youtube_blocos. */
export interface BlocoYoutube {
  id: string;
  nome: string;
  roteiro: string;
  referencias: string;
}

export function lerBlocosYoutube(value: unknown): BlocoYoutube[] | null {
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
    return [{
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : randomUUID(),
      nome: typeof raw.nome === 'string' ? raw.nome : '',
      roteiro: typeof raw.roteiro === 'string' ? raw.roteiro : '',
      referencias: typeof raw.referencias === 'string' ? raw.referencias : '',
    }];
  });
}

/** O texto corrido que o app mostra na visão Texto. Referências ficam de fora. */
export function htmlDosBlocos(blocos: readonly BlocoYoutube[]): string {
  return blocos.map((bloco, index) => {
    const corpo = bloco.roteiro.trim();
    if (index === 0 && !bloco.nome.trim()) return corpo;
    const titulo = `<h2 data-bloco="${bloco.id.replace(/"/g, '')}">${escapeHtml(bloco.nome)}</h2>`;
    return corpo ? `${titulo}${corpo}` : `${titulo}<p></p>`;
  }).join('');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
