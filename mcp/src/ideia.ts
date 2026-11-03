/**
 * Voltar para Ideia, com a regra do app (ideaNotesFromScript em
 * src/features/contents/lib/creationContent.ts). A juncao (marcadores ROTEIRO, RASCUNHO e
 * IDEIA ANTERIOR) vem do modulo compartilhado src/features/contents/lib/ideaNotes.ts.
 * creationContent.ts nao e importado direto porque puxa o app inteiro (React, Supabase do app).
 * Os campos do roteiro (script, writing_notes, carousel_slides) nao mudam.
 */

import {joinIdeaNotes, readableTextToScriptHtml} from '../../src/features/contents/lib/ideaNotes.ts';
import {writingNotesToHtml} from '../../src/features/contents/lib/supportDraft.ts';
import {lerTelas, modoEscrita, textoDasTelas} from './carrossel.ts';
import {htmlToText, type Row} from './lib.ts';

/** Novo texto da ideia, ou `undefined` quando nao ha roteiro nem rascunho para juntar. */
export function notasAoVoltarParaIdeia(row: Row): string | undefined {
  const textoTelas = modoEscrita(row) === 'carrossel' ? textoDasTelas(lerTelas(row.carousel_slides)) : '';
  const script = typeof row.script === 'string' ? row.script : '';
  const scriptHtml = textoTelas
    ? readableTextToScriptHtml(textoTelas)
    : htmlToText(script) ? script.trim() : '';
  const draftHtml = writingNotesToHtml(typeof row.writing_notes === 'string' ? row.writing_notes : null);
  const notes = typeof row.notes === 'string' ? row.notes : null;
  return joinIdeaNotes({scriptHtml, draftHtml, notes}, htmlToText);
}