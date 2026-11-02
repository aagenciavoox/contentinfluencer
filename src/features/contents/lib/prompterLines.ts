// Quebra do roteiro em "linhas" do teleprompter (desktop e celular): cada linha é a unidade que
// acende na leitura. Frases curtas ficam inteiras; as longas quebram em vírgulas e travessões e,
// se ainda passarem do limite, em pedaços de tamanho parecido, sem sobrar 1 ou 2 palavras sozinhas
// e sem terminar a linha numa palavrinha ("de", "que", "old") separada da seguinte.

import { htmlToReadableText } from '../../../lib/utils.ts';

export const EMPTY_SCRIPT_LINE = 'Este roteiro ainda não tem texto. Dá para gravar de improviso.';

const CLAUSE_END = /[,—–]$/;
const STANDALONE_DASH = /^[—–-]$/;
const SHORT_WORD = /^[\p{L}']{1,3}$/u;
const MIN_CHUNK = 3;

// Palavras que pedem a seguinte: artigos, preposições, conjunções, pronomes átonos e determinantes.
const LINE_END_STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos',
  'num', 'numa', 'ao', 'aos', 'à', 'às', 'e', 'ou', 'que', 'se', 'por', 'pra', 'pro', 'pras', 'pros', 'para',
  'com', 'sem', 'mas', 'nem', 'me', 'te', 'lhe', 'meu', 'minha', 'meus', 'minhas', 'seu', 'sua', 'seus', 'suas',
  'teu', 'tua', 'nosso', 'nossa', 'esse', 'essa', 'este', 'esta', 'aquele', 'aquela', 'nenhum', 'nenhuma', 'algum',
  'alguma', 'cada', 'todo', 'toda', 'muito', 'muita', 'mais', 'menos', 'tão', 'the', 'an', 'of', 'to', 'in', 'on',
  'and', 'or', 'for', 'with', 'my', 'your', 'old',
]);

// Palavras que abrem oração: quebrar antes delas soa natural.
const CLAUSE_STARTERS = new Set([
  'que', 'se', 'porque', 'quando', 'mas', 'como', 'onde', 'e', 'ou', 'pois', 'então', 'enquanto', 'até',
]);

function normalizeWord(word: string | undefined) {
  return (word ?? '').toLocaleLowerCase('pt-BR').replace(/[^\p{L}']/gu, '');
}

function isWeakLineEnd(word: string | undefined) {
  return word !== undefined && LINE_END_STOPWORDS.has(normalizeWord(word)) && !CLAUSE_END.test(word);
}

/** Perto do tamanho ideal, prefere quebrar depois de pontuação e evita terminar numa palavrinha. */
function pickBreak(words: string[], cursor: number, target: number, maxWords: number) {
  let best = target;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let size = target - 2; size <= Math.min(target + 1, maxWords); size++) {
    const rest = words.length - cursor - size;
    if (size < MIN_CHUNK || (rest > 0 && rest < MIN_CHUNK)) continue;

    const last = words[cursor + size - 1];
    const next = words[cursor + size];
    let score = Math.abs(size - target) * 0.5;
    if (isWeakLineEnd(last)) score += 3;
    else if (SHORT_WORD.test(last)) score += 1;
    if (CLAUSE_END.test(last)) score -= 2;
    if (next !== undefined && CLAUSE_STARTERS.has(normalizeWord(next))) score -= 1.5;
    if (score < bestScore) {
      bestScore = score;
      best = size;
    }
  }

  return best;
}

/** Divide em pedaços de tamanho parecido, nenhum maior que maxWords. */
function balancedSplit(words: string[], maxWords: number) {
  const chunks: string[][] = [];
  let cursor = 0;

  while (cursor < words.length) {
    const remaining = words.length - cursor;
    if (remaining <= maxWords) {
      chunks.push(words.slice(cursor));
      break;
    }

    const chunksLeft = Math.ceil(remaining / maxWords);
    const size = pickBreak(words, cursor, Math.ceil(remaining / chunksLeft), maxWords);
    chunks.push(words.slice(cursor, cursor + size));
    cursor += size;
  }

  return chunks;
}

function splitClauses(words: string[]) {
  const clauses: string[][] = [];
  let current: string[] = [];

  words.forEach((word, index) => {
    if (STANDALONE_DASH.test(word) && current.length > 0) {
      clauses.push(current);
      current = [];
    }
    current.push(word);
    const next = words[index + 1];
    if (CLAUSE_END.test(word) && next !== undefined) {
      clauses.push(current);
      current = [];
    }
  });

  if (current.length > 0) clauses.push(current);
  return clauses;
}

export function splitSentenceIntoLines(sentence: string, maxWords: number): string[] {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= maxWords) return [words.join(' ')];

  const pieces = splitClauses(words).flatMap(clause =>
    clause.length <= maxWords ? [clause] : balancedSplit(clause, maxWords)
  );

  // Junta orações vizinhas enquanto couberem numa linha.
  const merged: string[][] = [];
  pieces.forEach(piece => {
    const last = merged[merged.length - 1];
    if (last && last.length + piece.length <= maxWords) {
      last.push(...piece);
    } else {
      merged.push([...piece]);
    }
  });

  // Pedaço de 1 ou 2 palavras: vai para a linha vizinha (ou as duas se redividem).
  for (let index = 0; index < merged.length; index++) {
    if (merged.length === 1 || merged[index].length >= MIN_CHUNK) continue;
    const neighborIndex = index === 0 ? 1 : index - 1;
    const [first, second] = neighborIndex < index ? [neighborIndex, index] : [index, neighborIndex];
    const combined = [...merged[first], ...merged[second]];
    const replacement = combined.length <= maxWords + 2 ? [combined] : balancedSplit(combined, Math.ceil(combined.length / 2));
    merged.splice(first, 2, ...replacement);
    index = Math.max(-1, first - 1);
  }

  return merged.map(chunk => chunk.join(' '));
}

/** Tira marcadores entre colchetes como [Gancho], [Fato], [CTA], [Na tela: close] da fala. */
export function stripBracketMarkers(text: string): string {
  return text.replace(/\[\s*[\p{L}0-9_#@:;.,!?'"–—\-\s]{1,60}\s*\]/gu, '').trim();
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function buildPrompterLines(script: string, maxWords: number): string[] {
  const paragraphs = script
    .replace(/\r/g, '')
    .split('\n')
    .map(item => stripBracketMarkers(item.trim()))
    .filter(Boolean);

  const lines: string[] = [];

  paragraphs.forEach(paragraph => {
    const sentences = paragraph.split(/(?<=[.!?…:;])\s+/).filter(Boolean);
    sentences.forEach(sentence => lines.push(...splitSentenceIntoLines(sentence, maxWords)));
    lines.push('');
  });

  const compacted = lines.filter((line, index) => {
    if (line !== '') return true;
    return index > 0 && lines[index - 1] !== '';
  });
  // Sem linha em branco no fim: a última posição da leitura é a última frase.
  while (compacted.at(-1) === '') compacted.pop();

  return compacted;
}

export type PrompterLineKind = 'spoken' | 'blank' | 'section-divider' | 'on-screen-note';

export type PrompterLineItem = {
  id: string;
  kind: PrompterLineKind;
  text: string;
  sectionIndex: number;
  sectionNumber: number;
  totalSections: number;
  sectionTitle: string;
  wordCount: number;
};

export type PrompterSection = {
  index: number;
  number: number;
  title: string;
  startIndex: number;
  firstSpokenIndex: number;
  lastSpokenIndex: number;
  wordCount: number;
  estimatedSeconds: number;
};

export type ParsedPrompterScript = {
  items: PrompterLineItem[];
  sections: PrompterSection[];
  totalWords: number;
  totalEstimatedSeconds: number;
  hasSections: boolean;
};

type RawBlock =
  | { kind: 'heading'; title: string }
  | { kind: 'on-screen-note'; text: string }
  | { kind: 'paragraph'; text: string };

function extractRawBlocks(htmlOrText: string, isYouTube: boolean): RawBlock[] {
  const trimmed = htmlOrText.trim();
  if (!trimmed) return [];

  // Se não contém tags HTML, trata como texto simples dividido por parágrafos
  if (!/<[a-z/][^>]*>/i.test(trimmed)) {
    return trimmed
      .split(/\n{2,}/)
      .map(p => ({ kind: 'paragraph' as const, text: stripBracketMarkers(p.trim()) }))
      .filter(p => p.text.length > 0);
  }

  const blocks: RawBlock[] = [];

  // Ambiente de navegador (DOMParser presente)
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');
    const nodes = Array.from(doc.body.childNodes);

    for (const node of nodes) {
      if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (isYouTube && (tag === 'h1' || tag === 'h2')) {
          const title = htmlToReadableText(el.innerHTML).trim();
          if (title) blocks.push({ kind: 'heading', title });
        } else if (isYouTube && el.hasAttribute('data-na-tela')) {
          const noteText = htmlToReadableText(el.innerHTML).trim();
          if (noteText) blocks.push({ kind: 'on-screen-note', text: noteText });
        } else {
          const rawText = htmlToReadableText(el.outerHTML).trim();
          const cleanText = stripBracketMarkers(rawText);
          if (cleanText) blocks.push({ kind: 'paragraph', text: cleanText });
        }
      } else if (node.nodeType === 3 /* Node.TEXT_NODE */) {
        const rawText = node.textContent?.trim() ?? '';
        const cleanText = stripBracketMarkers(rawText);
        if (cleanText) blocks.push({ kind: 'paragraph', text: cleanText });
      }
    }
    return blocks;
  }

  // Fallback para Node/testes (sem DOMParser global)
  const blockRegex = /<(h[1-6]|p|div|blockquote|li)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(trimmed)) !== null) {
    const tag = match[1].toLowerCase();
    const attrs = match[2];
    const content = match[3];

    if (isYouTube && (tag === 'h1' || tag === 'h2')) {
      const title = htmlToReadableText(content).trim();
      if (title) blocks.push({ kind: 'heading', title });
    } else if (isYouTube && /data-na-tela/i.test(attrs)) {
      const noteText = htmlToReadableText(content).trim();
      if (noteText) blocks.push({ kind: 'on-screen-note', text: noteText });
    } else {
      const rawText = htmlToReadableText(content).trim();
      const cleanText = stripBracketMarkers(rawText);
      if (cleanText) blocks.push({ kind: 'paragraph', text: cleanText });
    }
  }

  if (blocks.length === 0) {
    const raw = htmlToReadableText(trimmed);
    const clean = stripBracketMarkers(raw);
    if (clean) {
      clean.split(/\n{2,}/).forEach(p => {
        const t = p.trim();
        if (t) blocks.push({ kind: 'paragraph', text: t });
      });
    }
  }

  return blocks;
}

type SectionGroup = {
  title: string;
  isExplicitHeading: boolean;
  blocks: Array<{ kind: 'on-screen-note'; text: string } | { kind: 'paragraph'; text: string }>;
};

/**
 * Monta os blocos e linhas do teleprompter para exibição (desktop e celular).
 * No modo YouTube, títulos viram divisórias visuais (fora do tempo) e blocos "Na tela"
 * viram lembretes discretos entre as falas.
 */
export function parsePrompterScript(
  scriptHtml: string | null | undefined,
  options: {
    isYouTube?: boolean;
    maxWords?: number;
    wpm?: number;
    fallbackTitle?: string;
  } = {}
): ParsedPrompterScript {
  const isYouTube = options.isYouTube ?? false;
  const maxWords = options.maxWords ?? 11;
  const effectiveWpm = Math.max(60, options.wpm ?? 120);
  const fallbackTitle = options.fallbackTitle?.trim() || 'Roteiro';

  const rawBlocks = extractRawBlocks(scriptHtml ?? '', isYouTube);

  if (rawBlocks.length === 0) {
    return {
      items: [
        {
          id: 'empty-0',
          kind: 'spoken',
          text: EMPTY_SCRIPT_LINE,
          sectionIndex: 0,
          sectionNumber: 1,
          totalSections: 1,
          sectionTitle: fallbackTitle,
          wordCount: 0,
        },
      ],
      sections: [
        {
          index: 0,
          number: 1,
          title: fallbackTitle,
          startIndex: 0,
          firstSpokenIndex: 0,
          lastSpokenIndex: 0,
          wordCount: 0,
          estimatedSeconds: 0,
        },
      ],
      totalWords: 0,
      totalEstimatedSeconds: 0,
      hasSections: false,
    };
  }

  const sectionGroups: SectionGroup[] = [];
  let currentGroup: SectionGroup | null = null;

  for (const block of rawBlocks) {
    if (isYouTube && block.kind === 'heading') {
      currentGroup = {
        title: block.title,
        isExplicitHeading: true,
        blocks: [],
      };
      sectionGroups.push(currentGroup);
    } else {
      if (!currentGroup) {
        currentGroup = {
          title: fallbackTitle,
          isExplicitHeading: false,
          blocks: [],
        };
        sectionGroups.push(currentGroup);
      }
      if (block.kind === 'heading') {
        currentGroup.blocks.push({ kind: 'paragraph', text: block.title });
      } else {
        currentGroup.blocks.push(block);
      }
    }
  }

  const totalSections = sectionGroups.length;
  const items: PrompterLineItem[] = [];
  let globalItemIndex = 0;

  sectionGroups.forEach((group, groupIndex) => {
    const sectionNumber = groupIndex + 1;
    const sectionTitle = group.title;

    // Divisória de seção: só quando o roteiro tem divisões (YouTube com mais de 1 seção ou título explícito)
    if (isYouTube && (totalSections > 1 || group.isExplicitHeading)) {
      items.push({
        id: `sec-divider-${groupIndex}`,
        kind: 'section-divider',
        text: sectionTitle,
        sectionIndex: groupIndex,
        sectionNumber,
        totalSections,
        sectionTitle,
        wordCount: 0,
      });
      globalItemIndex++;
    }

    group.blocks.forEach((block, blockIndex) => {
      if (block.kind === 'on-screen-note') {
        items.push({
          id: `note-${groupIndex}-${blockIndex}`,
          kind: 'on-screen-note',
          text: block.text,
          sectionIndex: groupIndex,
          sectionNumber,
          totalSections,
          sectionTitle,
          wordCount: 0,
        });
        globalItemIndex++;
      } else {
        const sentences = block.text.split(/(?<=[.!?…:;])\s+/).filter(Boolean);
        sentences.forEach(sentence => {
          const splitLines = splitSentenceIntoLines(sentence, maxWords);
          splitLines.forEach(line => {
            const lineWords = countWords(line);
            items.push({
              id: `spoken-${groupIndex}-${globalItemIndex++}`,
              kind: 'spoken',
              text: line,
              sectionIndex: groupIndex,
              sectionNumber,
              totalSections,
              sectionTitle,
              wordCount: lineWords,
            });
          });
        });

        // Separador entre parágrafos
        items.push({
          id: `blank-${groupIndex}-${globalItemIndex++}`,
          kind: 'blank',
          text: '',
          sectionIndex: groupIndex,
          sectionNumber,
          totalSections,
          sectionTitle,
          wordCount: 0,
        });
      }
    });
  });

  // Tira linhas em branco no final
  while (items.at(-1)?.kind === 'blank') {
    items.pop();
  }

  // Calcula limites, palavras e tempo de cada seção
  const sections: PrompterSection[] = sectionGroups.map((group, groupIndex) => {
    const sectionItems = items
      .map((item, itemIndex) => ({ item, itemIndex }))
      .filter(({ item }) => item.sectionIndex === groupIndex);

    const startIndex = sectionItems[0]?.itemIndex ?? 0;
    const spokenItems = sectionItems.filter(({ item }) => item.kind === 'spoken');
    const firstSpokenIndex = spokenItems[0]?.itemIndex ?? startIndex;
    const lastSpokenIndex = spokenItems.at(-1)?.itemIndex ?? startIndex;
    const sectionWords = spokenItems.reduce((sum, { item }) => sum + item.wordCount, 0);
    const estimatedSeconds = sectionWords > 0 ? (sectionWords / effectiveWpm) * 60 : 0;

    return {
      index: groupIndex,
      number: groupIndex + 1,
      title: group.title,
      startIndex,
      firstSpokenIndex,
      lastSpokenIndex,
      wordCount: sectionWords,
      estimatedSeconds,
    };
  });

  const totalWords = sections.reduce((sum, sec) => sum + sec.wordCount, 0);
  const totalEstimatedSeconds = totalWords > 0 ? (totalWords / effectiveWpm) * 60 : 0;
  const hasSections = isYouTube && sections.length > 1;

  return {
    items,
    sections,
    totalWords,
    totalEstimatedSeconds,
    hasSections,
  };
}
