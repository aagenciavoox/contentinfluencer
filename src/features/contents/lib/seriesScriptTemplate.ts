import type {Template, TemplateBloco} from '../../../lib/database.ts';

export function templateToHtml(template: {estrutura: TemplateBloco[]}): string {
  return template.estrutura
    .map(bloco => {
      const body = (bloco.conteudo || bloco.placeholder || '').trim();
      return `<p><strong>[${bloco.label}]</strong></p><p>${body}</p>`;
    })
    .join('');
}

export function isBlankScriptHtml(value: string | null | undefined): boolean {
  const trimmed = (value ?? '').trim();
  return (
    !trimmed
    || trimmed === '<p></p>'
    || trimmed === '<p><br></p>'
    || trimmed === '<p><br/></p>'
  );
}

function normalizeScriptHtml(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/<p><br\s*\/?><\/p>/gi, '<p></p>');
}

/** Active roteiro template for a series. When several exist, the latest edit wins. */
export function seriesScriptTemplateHtml(
  seriesId: string | null | undefined,
  templates: readonly Template[],
): string | null {
  if (!seriesId) return null;

  const match = templates
    .filter(template =>
      template.ativo
      && template.seriesId === seriesId
      && (template.type ?? 'roteiro') === 'roteiro'
      && template.estrutura.length > 0,
    )
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0];

  if (!match) return null;
  const html = templateToHtml(match).trim();
  return html || null;
}

export type SeriesTemplateResolution = {
  script?: string;
  appliedTemplateHtml: string | null;
  pendingSeriesId: string | null;
};

/**
 * Fills an empty script when the series changes.
 * Leaves text the author already wrote untouched.
 * If the current text is still the previous series template, it is replaced.
 */
export function resolveSeriesScriptTemplate(input: {
  previousSeriesId: string | null;
  nextSeriesId: string | null;
  script: string | null | undefined;
  templates: readonly Template[];
  appliedTemplateHtml: string | null;
  templatesReady: boolean;
}): SeriesTemplateResolution {
  if (input.script === undefined) {
    return {
      appliedTemplateHtml: input.appliedTemplateHtml,
      pendingSeriesId: input.nextSeriesId,
    };
  }

  const blank = isBlankScriptHtml(input.script);
  const matchesApplied = Boolean(
    input.appliedTemplateHtml
    && !blank
    && normalizeScriptHtml(input.script) === normalizeScriptHtml(input.appliedTemplateHtml),
  );

  if (!blank && !matchesApplied) {
    return {appliedTemplateHtml: null, pendingSeriesId: null};
  }

  const canResolve = input.templatesReady || input.templates.length > 0;
  if (!canResolve) {
    return {
      appliedTemplateHtml: input.appliedTemplateHtml,
      pendingSeriesId: input.nextSeriesId,
    };
  }

  const html = seriesScriptTemplateHtml(input.nextSeriesId, input.templates);
  if (!html) {
    if (matchesApplied) {
      return {script: '', appliedTemplateHtml: null, pendingSeriesId: null};
    }
    return {appliedTemplateHtml: null, pendingSeriesId: null};
  }

  if (normalizeScriptHtml(input.script) === normalizeScriptHtml(html)) {
    return {appliedTemplateHtml: html, pendingSeriesId: null};
  }

  return {script: html, appliedTemplateHtml: html, pendingSeriesId: null};
}
