// Quebra do roteiro em "linhas" do teleprompter (desktop e celular): cada linha é a unidade que
// acende na leitura. Frases curtas ficam inteiras; as longas quebram em vírgulas e travessões e,
// se ainda passarem do limite, em pedaços de tamanho parecido, sem sobrar 1 ou 2 palavras sozinhas
// e sem terminar a linha numa palavrinha ("de", "que", "old") separada da seguinte.

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

export function buildPrompterLines(script: string, maxWords: number): string[] {
  const paragraphs = script
    .replace(/\r/g, '')
    .split('\n')
    .map(item => item.trim())
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
