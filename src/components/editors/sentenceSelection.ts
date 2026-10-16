/**
 * Limites de frase dentro do texto de um bloco (parágrafo ou título).
 * Frase termina em . ! ? … (com aspas/parênteses de fechamento colados) ou em quebra de linha.
 * Offsets são índices no texto do bloco; o fim é exclusivo e não inclui o espaço seguinte.
 */
const TERMINATORS = new Set(['.', '!', '?', '…']);
const CLOSERS = new Set(['"', "'", '”', '’', ')', ']', '»']);

export function findSentenceRange(text: string, offset: number): { start: number; end: number } {
  const length = text.length;
  if (length === 0) return { start: 0, end: 0 };
  const at = Math.max(0, Math.min(offset, length - 1));

  // Começo: anda para trás até depois de um terminador (+fechamentos) ou de uma quebra de linha.
  let start = 0;
  for (let index = at - 1; index >= 0; index -= 1) {
    const char = text[index];
    if (char === '\n') {
      start = index + 1;
      break;
    }
    if (TERMINATORS.has(char) || (CLOSERS.has(char) && index > 0 && TERMINATORS.has(text[index - 1]))) {
      // Reticências "..." ou "?!" no meio de uma frase: só conta se o próximo caractere for espaço/fim.
      const next = text[index + 1];
      if (next === undefined || /\s/.test(next)) {
        start = index + 1;
        break;
      }
    }
  }

  // Fim: anda para frente até o terminador (incluso, com fechamentos e pontuação repetida) ou quebra de linha.
  let end = length;
  for (let index = at; index < length; index += 1) {
    const char = text[index];
    if (char === '\n') {
      end = index;
      break;
    }
    if (TERMINATORS.has(char)) {
      let stop = index + 1;
      while (stop < length && (TERMINATORS.has(text[stop]) || CLOSERS.has(text[stop]))) stop += 1;
      if (stop >= length || /\s/.test(text[stop])) {
        end = stop;
        break;
      }
      index = stop - 1;
    }
  }

  // Corta espaços nas pontas.
  while (start < end && /\s/.test(text[start])) start += 1;
  while (end > start && /\s/.test(text[end - 1])) end -= 1;

  // Clique num espaço entre frases: mantém pelo menos a posição clicada.
  if (start >= end) return { start: at, end: at };
  return { start, end };
}
