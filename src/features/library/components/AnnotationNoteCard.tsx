import type { ReactNode } from 'react';
import { CheckCircle2, Film, Lightbulb, Star, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { Anotacao } from '../../../lib/database';
import { cn } from '../../../lib/utils';

const TIPO_CORES: Record<string, string> = {
  'Anotação': 'bg-[var(--text-tertiary)]/10 text-[var(--text-tertiary)]',
  Trecho: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
  'Reação': 'bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]',
  'Análise': 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]',
  'Ideia de conteúdo': 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
  Pergunta: 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]',
};

export function AnnotationCardActions({
  anotacao,
  onToggleHighlight,
  onTransformIdea,
  onTransformContent,
  onDelete,
  className = '',
  showHighlight = true,
  showTransformContent = true,
  showTransformIdea = true,
}: {
  anotacao: Anotacao;
  onToggleHighlight: () => void;
  onTransformIdea: () => void;
  onTransformContent: () => void;
  onDelete: () => void;
  className?: string;
  showHighlight?: boolean;
  showTransformContent?: boolean;
  showTransformIdea?: boolean;
}) {
  return (
    <div className={cn('flex shrink-0 items-center gap-0.5', className)}>
      {showHighlight ? (
        <button
          type="button"
          onClick={onToggleHighlight}
          title={anotacao.contentPotential ? 'Remover destaque' : 'Destacar'}
          className={cn(
            'rounded-md p-1.5 transition-colors',
            anotacao.contentPotential ? 'text-[var(--accent-orange)]' : 'text-[var(--text-primary)] opacity-40 hover:opacity-80'
          )}
        >
          <Star className={cn('h-3.5 w-3.5', anotacao.contentPotential && 'fill-[var(--accent-orange)] text-[var(--accent-orange)]')} />
        </button>
      ) : null}
      {showTransformIdea && !anotacao.destilada ? (
        <button
          type="button"
          onClick={onTransformIdea}
          title="Transformar em ideia"
          className="rounded-md p-1.5 text-[var(--accent-green)] transition-colors hover:bg-[var(--accent-green)]/10"
        >
          <Lightbulb className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {showTransformContent ? (
        <button
          type="button"
          onClick={onTransformContent}
          title="Criar conteudo"
          className="rounded-md p-1.5 transition-colors hover:bg-[var(--accent-blue)]/10"
        >
          <Film className="h-3.5 w-3.5 text-[var(--accent-blue)] opacity-60" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDelete}
        title="Excluir"
        className="rounded-md p-1.5 transition-colors hover:bg-[var(--accent-pink)]/10"
      >
        <Trash2 className="h-3.5 w-3.5 text-[var(--accent-pink)] opacity-60" />
      </button>
    </div>
  );
}

interface AnnotationNoteCardProps {
  anotacao: Anotacao;
  onToggleHighlight?: () => void;
  onTransformIdea?: () => void;
  onTransformContent?: () => void;
  onDelete: () => void;
  actionsClassName?: string;
  footer?: ReactNode;
  layout?: boolean;
  showHighlight?: boolean;
  showTransformContent?: boolean;
  className?: string;
}

export function AnnotationNoteCard({
  anotacao,
  onToggleHighlight,
  onTransformIdea,
  onTransformContent,
  onDelete,
  actionsClassName,
  footer,
  layout = true,
  showHighlight = true,
  showTransformContent = true,
  className,
}: AnnotationNoteCardProps) {
  const tipoClass = TIPO_CORES[anotacao.tipo] || TIPO_CORES['Anotação'];

  const body = (
    <div className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className={cn('rounded-full px-2.5 py-1 t-label t-label-uppercase font-semibold', tipoClass)}>
            {anotacao.tipo}
          </span>
          {anotacao.capituloRef ? (
            <span className="text-xs font-medium text-[var(--text-secondary)] opacity-70">{anotacao.capituloRef}</span>
          ) : null}
          {anotacao.contentPotential ? (
            <span className="text-xs font-medium text-[var(--accent-orange)]">Destaque</span>
          ) : null}
          {anotacao.destilada ? (
            <span className="flex items-center gap-1 text-xs font-medium text-[var(--accent-green)]">
              <CheckCircle2 className="h-3 w-3" />
              Destilada
            </span>
          ) : null}
        </div>
        {(showHighlight || onTransformIdea || (showTransformContent && onTransformContent)) ? (
          <AnnotationCardActions
            anotacao={anotacao}
            onToggleHighlight={onToggleHighlight ?? (() => {})}
            onTransformIdea={onTransformIdea ?? (() => {})}
            onTransformContent={onTransformContent ?? (() => {})}
            onDelete={onDelete}
            className={actionsClassName}
            showHighlight={showHighlight}
            showTransformContent={showTransformContent && Boolean(onTransformContent)}
            showTransformIdea={Boolean(onTransformIdea)}
          />
        ) : (
          <button
            type="button"
            onClick={onDelete}
            title="Excluir"
            className="rounded-md p-1.5 transition-colors hover:bg-[var(--accent-pink)]/10"
          >
            <Trash2 className="h-3.5 w-3.5 text-[var(--accent-pink)] opacity-60" />
          </button>
        )}
      </div>
      <p className="mt-2 w-full text-xs leading-relaxed text-[var(--text-primary)]">{anotacao.texto}</p>
      {footer}
    </div>
  );

  if (!layout) {
    return (
      <div className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-primary)] md:rounded-[var(--radius-card)]">
        {body}
      </div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('group rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-primary)] md:rounded-[var(--radius-card)]', className)}
    >
      {body}
    </motion.div>
  );
}
