/**
 * Texto da ideia ao voltar para Ideia, sem dependencias: usado pelo app (creationContent.ts)
 * e pelo servidor MCP (mcp/src/ideia.ts), para os dois seguirem a mesma regra.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function readableTextToScriptHtml(value: string): string {
  const normalized = value.trim();
  if (!normalized) return '';

  return normalized
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function ideaTextToScriptHtml(value: string): string {
  const normalized = value.trim();
  if (!normalized) return '';
  return /<([a-z][\w-]*)(?:\s[^>]*)?>/i.test(normalized)
    ? normalized
    : readableTextToScriptHtml(normalized);
}

function ideaMarkerHtml(label: string): string {
  return `<p><strong>${label}</strong></p>`;
}

/**
 * Junta o roteiro (`scriptHtml`, ja em HTML) e o rascunho (`draftHtml`), cada um debaixo do seu
 * marcador. O texto que a ideia ja tinha (`notes`) so continua, em "IDEIA ANTERIOR", quando nao
 * esta dentro do que entrou. `toText` converte HTML em texto legivel. Devolve `undefined` quando
 * nao ha roteiro nem rascunho: o texto da ideia fica como esta.
 */
export function joinIdeaNotes(
  parts: {scriptHtml: string; draftHtml: string; notes: string | null | undefined},
  toText: (html: string | null | undefined) => string,
): string | undefined {
  const collapsed = (value: string | null | undefined) => toText(value).replace(/\s+/g, ' ').trim();
  const {scriptHtml, draftHtml, notes} = parts;
  const hasDraft = toText(draftHtml).trim().length > 0;
  if (!scriptHtml && !hasDraft) return undefined;

  let joined = '';
  if (scriptHtml) joined += `${ideaMarkerHtml('ROTEIRO')}${scriptHtml}`;
  if (hasDraft) joined += `${ideaMarkerHtml('RASCUNHO')}${draftHtml}`;

  const previous = collapsed(notes);
  if (previous && !collapsed(joined).includes(previous)) {
    joined += `${ideaMarkerHtml('IDEIA ANTERIOR')}${ideaTextToScriptHtml(notes ?? '')}`;
  }
  return joined;
}