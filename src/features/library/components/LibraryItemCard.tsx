import { useRef, useState } from 'react';
import { LucideIcon, CheckCircle2, ImagePlus, Lightbulb, Loader2, NotebookPen, Pencil, Pin, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { MediaCard } from '../../../components/ui/MediaCard';
import { OverflowTags } from '../../../components/ui/OverflowTags';
import { Text } from '../../../components/ui/Text';
import { useAuth } from '../../../context/AuthContext';
import { BibliotecaItem, BibliotecaItemMeta } from '../../../lib/database';
import { notifySaveFeedback } from '../../../lib/saveFeedback';
import { isCompletedStatus } from '../lib/libraryStatus';
import { uploadLibraryCover, validateLibraryCoverFile } from '../lib/uploadLibraryCover';

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
  onCoverChange: (capaUrl: string) => void;
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
  onCoverChange,
}: LibraryItemCardProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const TypeIcon = typeConfig.icon;
  const completed = isCompletedStatus(item.status);

  const handleCoverPick = (event: React.MouseEvent) => {
    event.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleCoverFile = async (file: File | undefined) => {
    if (!file) return;

    const validationError = validateLibraryCoverFile(file);
    if (validationError) {
      notifySaveFeedback({ status: 'error', message: validationError });
      return;
    }

    if (!user?.id) {
      notifySaveFeedback({ status: 'error', message: 'Entre na conta para enviar a capa.' });
      return;
    }

    setUploadingCover(true);
    try {
      const publicUrl = await uploadLibraryCover({
        file,
        userId: user.id,
        itemId: item.id,
        previousUrl: item.capaUrl,
      });
      onCoverChange(publicUrl);
      notifySaveFeedback({ status: 'success', message: 'Capa atualizada.' });
    } catch (err) {
      notifySaveFeedback({
        status: 'error',
        message: err instanceof Error ? err.message : 'Nao foi possivel enviar a capa.',
      });
    } finally {
      setUploadingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex cursor-pointer flex-col"
      onClick={onOpen}
    >
      <MediaCard
        imageUrl={item.capaUrl}
        alt={item.titulo}
        placeholderIcon={TypeIcon}
        placeholderLabel={typeConfig.label}
        className="mb-2 hover-card"
        overlay={
          <>
            <button
              type="button"
              onClick={onOpen}
              aria-label={`Abrir anotações de ${item.titulo}`}
              title="Abrir anotações"
              className="absolute inset-0 z-0 rounded-[var(--radius-card-mobile)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent-blue)] md:rounded-[var(--radius-card)]"
            />

            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-1.5 bg-[var(--text-primary)]/55 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  onOpen();
                }}
                title="Abrir anotações"
                aria-label={`Ver anotações de ${item.titulo}`}
                className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-elevated)]/95 text-[var(--text-primary)] shadow-none transition hover:scale-105"
              >
                <NotebookPen className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCoverPick}
                title="Trocar capa"
                aria-label={`Trocar capa de ${item.titulo}`}
                disabled={uploadingCover}
                className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-elevated)]/95 text-[var(--text-primary)] shadow-none transition hover:scale-105 disabled:opacity-50"
              >
                {uploadingCover ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  onEdit();
                }}
                title="Editar"
                className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-elevated)]/95 text-[var(--text-primary)] shadow-none transition hover:scale-105"
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
                className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-elevated)]/95 text-[var(--accent-green)] shadow-none transition hover:scale-105 disabled:cursor-default disabled:opacity-40"
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
                className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-elevated)]/95 text-[var(--accent-orange)] shadow-none transition hover:scale-105"
              >
                <Lightbulb className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="pointer-events-none absolute bottom-2 left-2 flex flex-col gap-1 transition-opacity duration-200 group-hover:opacity-0">
              <span className="rounded-full bg-[var(--backdrop-strong)] px-2 py-0.5 text-xs font-semibold text-white ">
                {typeConfig.label}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClassName}`}>
                {item.status}
              </span>
            </div>

            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                onTogglePrimary();
              }}
              className={`absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded-full px-2 py-1 t-label t-label-uppercase font-semibold opacity-0  transition-all group-hover:opacity-100 ${
                isPrimaryMobileBook
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'bg-[var(--backdrop-strong)] text-[var(--bg-elevated)] hover:bg-[color-mix(in_srgb,var(--text-primary)_80%,transparent)]'
              }`}
              aria-label={isPrimaryMobileBook ? 'Remover como principal no mobile' : 'Definir como principal no mobile'}
            >
              <Pin className="h-3 w-3" />
            </button>

            {contentsCount > 0 ? (
              <div className="pointer-events-none absolute right-2 top-2 z-20 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--text-primary)] px-1 text-xs font-semibold text-[var(--bg-primary)] transition-all group-hover:top-9">
                {contentsCount}
              </div>
            ) : null}
          </>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onClick={event => event.stopPropagation()}
        onChange={event => void handleCoverFile(event.target.files?.[0])}
      />

      <div className="text-left">
        <Text variant="itemTitle" className="mb-0.5 line-clamp-2 leading-tight transition-colors group-hover:text-[var(--accent-blue)]">
          {item.titulo}
        </Text>
        <Text variant="meta" className="truncate">
          {item.autorDiretor}
        </Text>
        {item.avaliacao ? (
          <div className="mt-1 flex gap-0.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={`h-2.5 w-2.5 ${index < item.avaliacao! ? 'fill-[var(--accent-orange)] text-[var(--accent-orange)]' : 'text-[var(--border-strong)]'}`}
              />
            ))}
          </div>
        ) : null}
        {isWishlistStatus(item.status) && item.potencialConteudo ? (
          <Text variant="meta" className="mt-1">
            Potencial {item.potencialConteudo}/3
          </Text>
        ) : null}
        {metadata.tagsPersonalizadas?.length ? (
          <OverflowTags
            className="mt-1.5"
            items={metadata.tagsPersonalizadas.map(tag => (
              <span
                key={tag}
                className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]"
              >
                {tag}
              </span>
            ))}
          />
        ) : null}
      </div>
    </motion.div>
  );
}
