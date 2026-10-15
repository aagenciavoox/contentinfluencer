import { type CSSProperties } from 'react';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import type { Projeto } from '../lib/database.ts';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Texto tingido com legibilidade garantida. A cor pura sobre o próprio fundo claro
 * fica abaixo de 4,5:1; o texto mistura a cor com --text-primary.
 * Tokens do sistema (`var(--…)`) usam --tint-text-share; cores que a pessoa
 * escolheu (hex de pilar, série, projeto) usam --user-tint-text-share, mais escura,
 * porque a paleta tem tons quase brancos.
 */
export function tintedTextColor(color: string): string {
  const share = color.trim().startsWith('var(') ? 'var(--tint-text-share)' : 'var(--user-tint-text-share)';
  return `color-mix(in srgb, ${color} ${share}, var(--text-primary))`;
}

export function getEntityTagStyle(color?: string | null): CSSProperties | undefined {
  if (!color) return undefined;

  return {
    backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
    borderColor: `color-mix(in srgb, ${color} 24%, transparent)`,
    color: tintedTextColor(color),
  };
}

export function htmlToReadableText(content: string | null | undefined) {
  const normalized = content?.trim();
  if (!normalized) return '';

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return normalized
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(normalized, 'text/html');
  const lines: string[] = [];

  const collectText = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.replace(/\s+/g, ' ') ?? '';
    }

    if (!(node instanceof HTMLElement)) return '';

    if (node.tagName === 'BR') return '\n';

    const childrenText = Array.from(node.childNodes)
      .map(child => collectText(child))
      .join('');

    if (node.tagName === 'LI') {
      return `• ${childrenText.trim()}\n`;
    }

    if (node.tagName === 'P') {
      return `${childrenText.trim()}\n\n`;
    }

    return childrenText;
  };

  Array.from(doc.body.childNodes).forEach(node => {
    lines.push(collectText(node));
  });

  return lines
    .join('')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Helper: gera array de datas entre dataInicio e dataFim (inclusive)
export function getEventDates(p: Projeto): string[] {
  if (!p.dataFim) return [];
  const start = p.dataInicio ? parseISO(p.dataInicio) : parseISO(p.dataFim);
  const end = parseISO(p.dataFim);
  if (start > end) return [p.dataFim];
  return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
}
