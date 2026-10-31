/**
 * Rascunho de apoio (coluna `writing_notes`). Até out/2026 era texto puro de uma caixa simples;
 * agora é HTML do editor. O texto antigo abre com as mesmas linhas e só vira HTML quando é editado.
 */
export function writingNotesToHtml(value: string | null | undefined): string {
  const text = value ?? '';
  if (!text.trim()) return '';
  if (/<[a-z/][^>]*>/i.test(text)) return text;
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/^\n+|\n+$/g, '')
    .split('\n')
    .map(line => (line ? `<p>${escapeHtml(line)}</p>` : '<p></p>'))
    .join('');
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
