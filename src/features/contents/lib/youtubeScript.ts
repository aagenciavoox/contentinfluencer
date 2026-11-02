import {countScriptWords} from './spokenDuration.ts';

/**
 * Modo de escrita YouTube: o roteiro continua no `script`, em texto corrido.
 * Cada título (Título 1 ou 2) abre uma seção; o painel Estrutura lista e reordena as seções.
 * Blocos "Na tela" (`<div data-na-tela>`) guardam o que aparece no vídeo e não contam como fala.
 */

/** Ritmo de fala para a faixa do rodapé: devagar e rápido, em palavras por minuto. */
export const YOUTUBE_WPM_SLOW = 120;
export const YOUTUBE_WPM_FAST = 140;

/** Seções do modelo padrão, para quem começa um vídeo do zero. */
export const YOUTUBE_SECTION_MODEL = ['Abertura', 'Contexto', 'Desenvolvimento', 'Encerramento'] as const;

const ON_SCREEN_BLOCK = /<div\b[^>]*\bdata-na-tela\b[^>]*>[\s\S]*?<\/div>/gi;

/** Tira os blocos "Na tela": o que sobra é o que vai ser falado. */
export function stripOnScreenNotes(html: string | null | undefined): string {
  return (html ?? '').replace(ON_SCREEN_BLOCK, '');
}

export function countSpokenWords(html: string | null | undefined): number {
  return countScriptWords(stripOnScreenNotes(html));
}

/** "Fala estimada: 13–15 min". Abaixo de um minuto não há faixa. */
export function formatSpokenRange(wordCount: number): string {
  if (wordCount <= 0) return '0 min';
  const slow = Math.round(wordCount / YOUTUBE_WPM_SLOW);
  const fast = Math.round(wordCount / YOUTUBE_WPM_FAST);
  if (slow < 1) return 'menos de 1 min';
  const low = Math.max(1, fast);
  return low === slow ? `${slow} min` : `${low}–${slow} min`;
}

export function sectionModelHtml(titles: readonly string[] = YOUTUBE_SECTION_MODEL): string {
  return titles.map(title => `<h2>${escapeHtml(title)}</h2><p></p>`).join('');
}

/** Template da série no modo YouTube: cada bloco vira uma seção (título + texto do bloco). */
export function templateSectionsHtml(estrutura: readonly {label: string; conteudo?: string | null; placeholder?: string | null}[]): string {
  return estrutura
    .map(bloco => {
      const body = (bloco.conteudo || bloco.placeholder || '').trim();
      return `<h2>${escapeHtml(bloco.label)}</h2><p>${escapeHtml(body)}</p>`;
    })
    .join('');
}

/** Seção nova no fim do roteiro, com o próximo número livre ("Nova seção 2"). */
export function nextSectionTitle(existing: readonly string[]): string {
  const taken = new Set(existing.map(title => title.trim().toLocaleLowerCase('pt-BR')));
  if (!taken.has('nova seção')) return 'Nova seção';
  let index = 2;
  while (taken.has(`nova seção ${index}`)) index += 1;
  return `Nova seção ${index}`;
}

export type SectionGroups<T> = {
  /** O que vem antes do primeiro título: fica sempre no topo. */
  intro: T[];
  sections: T[][];
};

/** Junta os blocos do roteiro em seções: cada título abre uma nova. */
export function groupSections<T>(blocks: readonly T[], isHeading: (block: T) => boolean): SectionGroups<T> {
  const intro: T[] = [];
  const sections: T[][] = [];
  for (const block of blocks) {
    if (isHeading(block)) {
      sections.push([block]);
    } else if (sections.length > 0) {
      sections[sections.length - 1].push(block);
    } else {
      intro.push(block);
    }
  }
  return {intro, sections};
}

/** Move a seção `from` para a posição `to`, levando o texto dela junto. */
export function moveSection<T>(groups: SectionGroups<T>, from: number, to: number): T[] {
  const sections = [...groups.sections];
  if (from >= 0 && from < sections.length && to >= 0 && to < sections.length && from !== to) {
    const [moved] = sections.splice(from, 1);
    sections.splice(to, 0, moved);
  }
  return [...groups.intro, ...sections.flat()];
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
