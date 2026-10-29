/**
 * Repara quebras literais em HTML/texto legado (\\n, &#10;, newlines dentro de blocos).
 * Não inventa parágrafos a partir de espaços: só age quando há sinal explícito de quebra.
 */

import {plainTextToHtml} from './pasteMarkdown';

/** True quando o conteúdo guarda quebras literais que o editor não mostra como estrutura. */
export function needsLegacyLineBreakRepair(html: string | null | undefined): boolean {
  const raw = (html ?? '').trim();
  if (!raw) return false;

  if (/&#10;|&#x0a;/i.test(raw)) return true;

  if (!/<[a-z][\s\S]*>/i.test(raw)) {
    return /[\r\n]|\\n/.test(raw);
  }

  // Ignora só a formatação entre tags (pretty-print).
  const withoutInterTagSpace = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><');

  if (/[\r\n]/.test(withoutInterTagSpace)) return true;
  return />[^<]*\\n[^<]*</.test(withoutInterTagSpace);
}

function fixTextBreaks(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\r\n?/g, '\n');
}

function linesToInlineHtml(block: string): string {
  return fixTextBreaks(block).split('\n').join('<br>');
}

/**
 * Converte quebras literais em `<br>` / novos `<p>`.
 * Devolve o mesmo HTML se não houver o que reparar.
 */
export function repairLegacyLineBreaks(html: string): string {
  if (!needsLegacyLineBreakRepair(html)) return html;

  let value = html.replace(/&#10;|&#x0a;/gi, '\n');

  if (!/<[a-z][\s\S]*>/i.test(value.trim())) {
    return plainTextToHtml(fixTextBreaks(value));
  }

  value = value.replace(/\\n/g, '\n');

  return value.replace(
    /<(p|h[1-6]|li|blockquote)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (full, tag: string, attrs: string | undefined, inner: string) => {
      if (!/[\r\n]/.test(inner)) return full;
      const attr = attrs ?? '';
      // Já tem estrutura interna: só troca newlines soltos por <br>.
      if (/<(p|div|br|ul|ol|li|h[1-6]|blockquote)\b/i.test(inner)) {
        const fixed = inner.replace(/(^|>)([^<]*\n[^<]*)(?=<|$)/g, (_m, prefix: string, text: string) => {
          if (!/\n/.test(text)) return `${prefix}${text}`;
          return `${prefix}${linesToInlineHtml(text)}`;
        });
        return `<${tag}${attr}>${fixed}</${tag}>`;
      }

      const parts = fixTextBreaks(inner).split(/\n{2,}/);
      if (parts.length === 1) {
        return `<${tag}${attr}>${linesToInlineHtml(parts[0] ?? '')}</${tag}>`;
      }
      if (tag.toLowerCase() === 'p') {
        return parts.map(part => `<p${attr}>${linesToInlineHtml(part)}</p>`).join('');
      }
      return `<${tag}${attr}>${parts.map(linesToInlineHtml).join('<br><br>')}</${tag}>`;
    },
  );
}
