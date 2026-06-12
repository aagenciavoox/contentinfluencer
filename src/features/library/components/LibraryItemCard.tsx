import { LucideIcon, CheckCircle2, ExternalLink, Lightbulb, Pencil, Pin, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { BibliotecaItem, BibliotecaItemMeta } from '../../../lib/database';
import { isCompletedStatus } from '../lib/libraryStatus';

export interface BibliotecaTypeConfig {
  label: string;
  icon: LucideIcon;
}

interface LibraryItemCardProps {
  item: BibliotecaItem;
  typeConfig: BibliotecaTypeConfig;
  metadata: BibliotecaItemMeta;
  contentsCount: number;
  isPrimaryMobileBook: boolean;
  statusClassName: string;
  onOpen: () => void;
  onEdit: () => void;
  onMarkComplete: () => void;
  onTurnIntoIdea: () => void;
  onTogglePrimary: () => void;
}

function isWishlistStatus(status: BibliotecaItem['status']) {
  return status === 'Quero consumir' || status === 'Quero ler' || status === 'Quero ver';
}

export function LibraryItemCard({
  item,
  typeConfig,
  metadata,
  contentsCount,
  isPrimaryMobileBook,
  statusClassName,
  onOpen,
  onEdit,
  onMarkComplete,
  onTurnIntoIdea,
  onTogglePrimary,
}: LibraryItemCardProps) {
  const TypeIcon = typeConfig.icon;
  const completed = isCompletedStatus(item.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex flex-col"
    >
      <div className="relative mb-2 aspect-[0.74] overflow-hidden rounded-[var(--radius-input)] bg-[var(--bg-hover)] transition-all hover-card elevation-1 group-hover:elevation-2">
        {item.capaUrl ? (
          <img
            src={item.capaUrl}
            alt={item.titulo}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={event => {
              (event.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3">
            <TypeIcon className="h-8 w-8 text-[var(--text-tertiary)]" />
            <span className="text-center text-xs font-bold leading-tight text-[var(--text-tertiary)]">
              {item.titulo}
            </span>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/55 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onOpen();
            }}
            title="Abrir"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[var(--text-primary)] shadow-sm transition hover:scale-105"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onEdit();
            }}
            title="Editar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[var(--text-primary)] shadow-sm transition hover:scale-105"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onMarkComplete();
            }}
            title={completed ? 'Já concluído' : 'Marcar concluído'}
            disabled={completed}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[var(--accent-green)] shadow-sm transition hover:scale-105 disabled:cursor-default disabled:opacity-40"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onTurnIntoIdea();
            }}
            title="Virar ideia"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[var(--accent-orange)] shadow-sm transition hover:scale-105"
          >
            <Lightbulb className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-2 left-2 flex flex-col gap-1 transition-opacity duration-200 group-hover:opacity-0">
          <span className="rounded-full bg-black/60 px-2 py-0.5 text-[7px] font-semibold text-white ">
            {typeConfig.label}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[8px] font-semibold ${statusClassName}`}>
            {item.status}
          </span>
        </div>

        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            onTogglePrimary();
          }}
          className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.15em] opacity-0  transition-all group-hover:opacity-100 ${
            isPrimaryMobileBook
              ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
              : 'bg-black/60 text-white hover:bg-black/80'
          }`}
          aria-label={isPrimaryMobileBook ? 'Remover como principal no mobile' : 'Definir como principal no mobile'}
        >
          <Pin className="h-3 w-3" />
        </button>

        {contentsCount > 0 ? (
          <div className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--text-primary)] px-1 text-xs font-semibold text-[var(--bg-primary)] transition-all group-hover:top-9">
            {contentsCount}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="text-left"
      >
        <p className="mb-0.5 line-clamp-2 text-xs font-semibold leading-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-blue)]">
          {item.titulo}
        </p>
        <p className="truncate text-[8px] text-[var(--text-secondary)]">
          {item.autorDiretor}
        </p>
        {item.avaliacao ? (
          <div className="mt-1 flex gap-0.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={`h-2.5 w-2.5 ${index < item.avaliacao! ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--border-strong)]'}`}
              />
            ))}
          </div>
        ) : null}
        {isWishlistStatus(item.status) && item.potencialConteudo ? (
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            Potencial {item.potencialConteudo}/3
          </div>
        ) : null}
        {metadata.tagsPersonalizadas?.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {metadata.tagsPersonalizadas.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[8px] font-bold text-[var(--text-secondary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </button>
    </motion.div>
  );
}
