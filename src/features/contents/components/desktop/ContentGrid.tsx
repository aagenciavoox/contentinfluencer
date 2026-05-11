import { Check, Eye, Layers, Zap } from 'lucide-react';
import { Content } from '../../../../lib/database';
import { useAppContext } from '../../../../context/AppContext';
import { cn, getEntityTagStyle, htmlToReadableText } from '../../../../lib/utils';
import { CONTENT_STATUS } from '../../lib/contentPipeline';

interface ContentGridProps {
  contents: Content[];
  lookAlerts: Record<string, string>;
  onSelect: (content: Content) => void;
  onPreview: (content: Content) => void;
  onToggleSelect: (id: string) => void;
  selectedIds: Set<string>;
  mode?: 'editorial' | 'postagem' | 'historico';
}

const STATUS_CLASSES: Record<string, string> = {
  [CONTENT_STATUS.IDEIA]: 'bg-zinc-100 text-zinc-700',
  [CONTENT_STATUS.ROTEIRO]: 'bg-amber-100 text-amber-700',
  [CONTENT_STATUS.PRONTO_PARA_GRAVAR]: 'bg-orange-100 text-orange-700',
  [CONTENT_STATUS.GRAVADO]: 'bg-sky-100 text-sky-700',
  [CONTENT_STATUS.A_EDITAR]: 'bg-violet-100 text-violet-700',
  [CONTENT_STATUS.EDITADO]: 'bg-cyan-100 text-cyan-700',
  [CONTENT_STATUS.PROGRAMADO]: 'bg-emerald-100 text-emerald-700',
  [CONTENT_STATUS.POSTADO]: 'bg-green-100 text-green-700',
};

export function ContentGrid({
  contents,
  lookAlerts,
  onSelect,
  onPreview,
  onToggleSelect,
  selectedIds,
  mode = 'editorial',
}: ContentGridProps) {
  const { state } = useAppContext();
  const enableSelection = mode !== 'historico';

  if (contents.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--border-color)] py-24 text-center opacity-40">
        <p className="text-sm font-black uppercase tracking-widest text-[var(--text-tertiary)]">
          Nenhum conteudo encontrado
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {contents.map(content => {
        const series = content.seriesId ? state.series.find(item => item.id === content.seriesId) : null;
        const pillar = content.pilarId ? state.pilares.find(item => item.id === content.pilarId) : null;
        const isSelected = selectedIds.has(content.id);
        const excerpt = htmlToReadableText(content.notes || content.script);

        return (
          <article
            key={content.id}
            className={cn(
              'relative flex min-h-[220px] flex-col rounded-2xl border bg-[var(--bg-primary)] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg',
              isSelected
                ? 'border-[var(--text-primary)] ring-2 ring-[var(--text-primary)]/10'
                : 'border-[var(--border-color)]'
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {mode !== 'historico' ? (
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest',
                      STATUS_CLASSES[content.status] || 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                    )}
                  >
                    {content.status}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-[var(--bg-hover)] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                    {content.publishDate
                      ? new Date(content.publishDate).toLocaleDateString('pt-BR')
                      : 'Sem data'}
                  </span>
                )}
                <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-tight text-[var(--text-primary)]">
                  {content.title || '(sem titulo)'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {enableSelection ? (
                  <button
                    type="button"
                    onClick={() => onToggleSelect(content.id)}
                    className={cn(
                      'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all',
                      isSelected
                        ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                        : 'border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-elevated),transparent_8%)] text-[var(--text-secondary)]'
                    )}
                    aria-label={isSelected ? `Desmarcar ${content.title}` : `Selecionar ${content.title}`}
                  >
                    {isSelected ? <Check className="h-4 w-4 stroke-[3px]" /> : null}
                  </button>
                ) : null}

                {mode !== 'historico' ? (
                  <button
                    type="button"
                    onClick={() => onPreview(content)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-elevated),transparent_8%)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    aria-label={`Abrir detalhe de ${content.title}`}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <div
              className="flex-1 cursor-pointer"
              onClick={() => onSelect(content)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(content);
                }
              }}
              role="button"
              tabIndex={0}
            >
              {mode !== 'historico' && (
                <div className="flex flex-wrap gap-2">
                  {pillar && (
                    <span
                      className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                      style={getEntityTagStyle(pillar.cor)}
                    >
                      {pillar.nome}
                    </span>
                  )}
                  {series && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                      style={getEntityTagStyle(series.cor)}
                    >
                      <Layers className="h-3 w-3" />
                      {series.name}
                    </span>
                  )}
                </div>
              )}

              {(mode !== 'historico' ? excerpt : false) && (
                <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {excerpt}
                </p>
              )}
            </div>

            {lookAlerts[content.id] && (
              <div className="mt-4 flex items-center gap-2 border-t border-[var(--border-color)] pt-4 text-[10px] font-black uppercase tracking-widest text-orange-500">
                <Zap className="h-3.5 w-3.5" />
                {lookAlerts[content.id]}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
