/**
 * Modo de escrita Carrossel nos roteiros.
 * No carrossel, o texto real fica nas telas (contents.carousel_slides) e o script guarda só
 * o texto do modo Texto, de antes da troca, que o app esconde. Banco sem as colunas
 * (supabase/migrations/20261017120000_rede_blog_site_carrossel.sql pendente) conta como Texto, igual ao app.
 * Espelha o mínimo de src/features/contents/lib/carouselSlides.ts.
 */

import {htmlToText, textToHtml, type Row} from './lib.ts';

export type ModoEscrita = 'texto' | 'carrossel';
export type Tela = {html: string; imagens: string[]};

export function modoEscrita(row: Row): ModoEscrita {
  return row.writing_mode === 'carrossel' ? 'carrossel' : 'texto';
}

export function rotuloTela(index: number): string {
  return `Tela ${index + 1}`;
}

function lerImagens(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      const raw = item as Row;
      return typeof raw.value === 'string' ? raw.value : typeof raw.url === 'string' ? raw.url : '';
    })
    .map(value => value.trim())
    .filter(Boolean);
}

/** Lê carousel_slides: só o formato conhecido, sem quebrar com lixo. */
export function lerTelas(value: unknown): Tela[] {
  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(source)) return [];
  return source.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const raw = item as Row;
    return [{html: typeof raw.html === 'string' ? raw.html : '', imagens: lerImagens(raw.images)}];
  });
}

export function telaTemConteudo(tela: Tela): boolean {
  return htmlToText(tela.html).length > 0 || tela.imagens.length > 0;
}

/** Texto das telas com "Tela N" antes de cada uma, como a cópia do app. Tela sem texto fica de fora. */
export function textoDasTelas(telas: readonly Tela[]): string {
  return telas
    .map((tela, index) => {
      const texto = htmlToText(tela.html);
      return texto ? `${rotuloTela(index)}\n${texto}` : '';
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Roteiro no modo em uso. No carrossel, `telas` traz cada tela na ordem do app
 * (texto ou html, conforme o formato, e as imagens) e `roteiro` junta os textos.
 */
export function roteiroDoConteudo(row: Row, formato: 'texto' | 'html') {
  if (modoEscrita(row) === 'texto') {
    return {modo_escrita: 'texto' as const, roteiro: formato === 'html' ? row.script ?? '' : htmlToText(row.script)};
  }
  const telas = lerTelas(row.carousel_slides);
  return {
    modo_escrita: 'carrossel' as const,
    roteiro: textoDasTelas(telas),
    telas: telas.map((tela, index) => ({
      tela: rotuloTela(index),
      ...(formato === 'html' ? {html: tela.html} : {texto: htmlToText(tela.html)}),
      imagens: tela.imagens,
    })),
  };
}

export const ERRO_ROTEIRO_CARROSSEL =
  'Este roteiro está em modo Carrossel: o texto fica nas telas, e o MCP só grava o texto corrido, que o app não mostra nesse modo. ' +
  'Edite as telas no app (ou volte o roteiro para o modo Texto no app e peça de novo). Nada foi alterado.';

/** Script novo ao editar o roteiro. No carrossel recusa: o que fosse gravado não apareceria no app. */
export function scriptEditado(atual: Row, roteiro: string, modo: 'substituir' | 'acrescentar'): string {
  if (modoEscrita(atual) === 'carrossel') throw new Error(ERRO_ROTEIRO_CARROSSEL);
  const incoming = textToHtml(roteiro);
  return modo === 'acrescentar' && atual.script ? `${atual.script}${incoming}` : incoming;
}

/** Produção pede roteiro escrito. No carrossel, basta uma tela com texto ou imagem. */
export function temRoteiroEscrito(row: Row): boolean {
  if (modoEscrita(row) === 'carrossel') return lerTelas(row.carousel_slides).some(telaTemConteudo);
  return htmlToText(row.script).length > 0;
}

/** Ideia → Roteiro: as notas viram rascunho só no modo Texto. No carrossel o script fica escondido. */
export function rascunhoDasNotas(row: Row): string | null {
  if (modoEscrita(row) === 'carrossel') return null;
  if (htmlToText(row.script) || !htmlToText(row.notes)) return null;
  return textToHtml(row.notes);
}
