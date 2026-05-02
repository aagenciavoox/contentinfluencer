import { Eye, Layers, Zap } from 'lucide-react';
import { Content } from '../../../../lib/database';
import { useAppContext } from '../../../../context/AppContext';
import { cn, getEntityTagStyle } from '../../../../lib/utils';

interface ContentGridProps {
  contents: Content[];
  lookAlerts: Record<string, string>;
  onSelect: (content: Content) => void;
  onPreview: (content: Content) => void;
  mode?: 'editorial' | 'postagem' | 'historico';
}

const STATUS_CLASSES: Record<string, string> = {
  Ideia: 'bg-zinc-100 text-zinc-700',
  Roteiro: 'bg-amber-100 text-amber-700',
  'Pronto para Gravar': 'bg-orange-100 text-orange-700',
  Gravado: 'bg-sky-100 text-sky-700',
  'A Editar': 'bg-violet-100 text-violet-700',
  Editado: 'bg-cyan-100 text-cyan-700',
  Programado: 'bg-emerald-100 text-emerald-700',
  Postado: 'bg-green-100 text-green-700',
};

export function ContentGrid({
  contents,
  lookAlerts,
  onSelect,
  onPreview,
  mode = 'editorial',
}: ContentGridProps) {
  const { state } = useAppContext();

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

        return (
          <article
            key={content.id}
            className="relative flex min-h-[220px] flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
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
                <h3 className="mt-3 line-clamp-2 text-lg font-black leading-tight text-[var(--text-primary)]">
                  {content.title || '(sem titulo)'}
                </h3>
              </div>

              {mode !== 'historico' ? (
                <button
                  type="button"
                  onClick={() => onPreview(content)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-primary)]"
                  aria-label={`Visualizar roteiro de ${content.title}`}
                >
                  <Eye className="h-4 w-4" />
                </button>
              ) : null}
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
                      className="rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-widest"
                      style={getEntityTagStyle(pillar.cor)}
                    >
                      {pillar.nome}
                    </span>
                  )}
                  {series && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-widest"
                      style={getEntityTagStyle(series.cor)}
                    >
                      <Layers className="h-3 w-3" />
                      {series.name}
                    </span>
                  )}
                </div>
              )}

              {(mode !== 'historico' ? content.notes || content.script : false) && (
                <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {content.notes || content.script}
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
