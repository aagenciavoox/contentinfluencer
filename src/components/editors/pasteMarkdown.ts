/**
 * Colagem no editor de roteiro: preserva HTML rico; texto plano com quebras vira
 * parágrafos; Markdown estruturado vira formatação visual (sem deixar ###/** visíveis).
 */

const ENTITY: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, char => ENTITY[char] ?? char);
}

/** HTML da área de transferência que já traz estrutura útil (Docs, Word, outro editor). */
export function clipboardHasRichHtml(html: string | undefined | null): boolean {
  if (!html?.trim()) return false;
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?(meta|html|head|body|fragment|span)[^>]*>/gi, '')
    .replace(/\s+style="[^"]*"/gi, '')
    .replace(/\s+class="[^"]*"/gi, '')
    .trim();
  if (!stripped) return false;
  // Vários blocos: o text/plain do Word/Docs costuma juntar linhas; use o HTML.
  if ((stripped.match(/<\/p>/gi) ?? []).length > 1) return true;
  if (/<(h[1-6]|ul|ol|li|blockquote|div|br|strong|b|em|i|a)\b/i.test(stripped)) return true;
  // Um único <p> sem marcações internas: prefira o text/plain (quebras \n).
  if (/^<p(?:\s[^>]*)?>[\s\S]*<\/p>$/i.test(stripped)) return false;
  return /<(p|div|h[1-6]|ul|ol|li|br|strong|b|em|i|a|blockquote)\b/i.test(stripped);
}

/**
 * Parece Markdown estruturado (títulos, listas, ênfase em bloco), não um texto
 * casual com um "**" solto.
 */
export function looksLikeMarkdown(text: string): boolean {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let score = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#{1,6}\s+\S/.test(trimmed)) score += 2;
    else if (/^([-*+]|\d+\.)\s+\S/.test(trimmed)) score += 1;
    else if (/^>\s+\S/.test(trimmed)) score += 1;
    else if (/^```/.test(trimmed)) score += 2;
    else if (/\*\*[^*]+\*\*|__[^_]+__/.test(trimmed)) score += 1;
    else if (/\[[^\]]+\]\([^)]+\)/.test(trimmed)) score += 1;
  }
  return score >= 2;
}

function inlineMarkdown(value: string): string {
  let text = escapeHtml(value);
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  text = text.replace(/(^|[^_\w])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  return text;
}

/** Texto plano com quebras → parágrafos e <br>, sem interpretar Markdown. */
export function plainTextToHtml(text: string): string {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/^\n+|\n+$/g, '');
  if (!normalized) return '<p></p>';
  return normalized
    .split(/\n{2,}/)
    .map(block => {
      const safe = block.split('\n').map(line => escapeHtml(line)).join('<br>');
      return `<p>${safe}</p>`;
    })
    .join('');
}

/** Converte Markdown estruturado em HTML do TipTap. */
export function markdownToHtml(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').replace(/^\n+|\n+$/g, '').split('\n');
  const parts: string[] = [];
  let i = 0;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    parts.push(`<p>${paragraph.map(line => inlineMarkdown(line)).join('<br>')}</p>`);
    paragraph = [];
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      i += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      const level = Math.min(3, heading[1].length);
      parts.push(`<h${level}>${inlineMarkdown(heading[2].trim())}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flushParagraph();
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test((lines[i] ?? '').trim())) {
        quoteLines.push((lines[i] ?? '').trim().replace(/^>\s?/, ''));
        i += 1;
      }
      parts.push(`<blockquote><p>${quoteLines.map(inlineMarkdown).join('<br>')}</p></blockquote>`);
      continue;
    }

    if (/^[-*+]\s+\S/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+\S/.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(/^[-*+]\s+/, ''));
        i += 1;
      }
      parts.push(`<ul>${items.map(item => `<li><p>${inlineMarkdown(item)}</p></li>`).join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+\S/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+\S/.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      parts.push(`<ol>${items.map(item => `<li><p>${inlineMarkdown(item)}</p></li>`).join('')}</ol>`);
      continue;
    }

    if (/^```/.test(trimmed)) {
      flushParagraph();
      i += 1;
      const code: string[] = [];
      while (i < lines.length && !/^```/.test((lines[i] ?? '').trim())) {
        code.push(lines[i] ?? '');
        i += 1;
      }
      if (i < lines.length) i += 1;
      parts.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    paragraph.push(line);
    i += 1;
  }

  flushParagraph();
  return parts.join('') || '<p></p>';
}

/** HTML a inserir a partir do clipboard (texto plano / Markdown). Null = deixar o TipTap cuidar. */
export function htmlFromClipboardPlain(text: string | undefined | null): string | null {
  if (text == null) return null;
  const normalized = text.replace(/\r\n?/g, '\n');
  if (!normalized.trim()) return '<p></p>';
  if (looksLikeMarkdown(normalized)) return markdownToHtml(normalized);
  // Quebras de linha: sempre preservar como estrutura, sem Markdown.
  if (normalized.includes('\n')) return plainTextToHtml(normalized);
  return null;
}
