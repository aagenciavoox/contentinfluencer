import { useRef, useState } from 'react';
import { LucideIcon, FileText, Loader2, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { MediaCard } from '../../../components/ui/MediaCard';
import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import { OverflowTags } from '../../../components/ui/OverflowTags';
import { Text } from '../../../components/ui/Text';
import { ValorVazio } from '../../../components/ui/ValorVazio';
import { useAuth } from '../../../context/AuthContext';
import { BibliotecaItem, BibliotecaItemMeta } from '../../../lib/database';
import { notifySaveFeedback } from '../../../lib/saveFeedback';
import { isCompletedStatus, statusDotColor } from '../lib/libraryStatus';
import { LIBRARY_COVER_UPLOAD_ERROR, uploadLibraryCover, validateLibraryCoverFile } from '../lib/uploadLibraryCover';

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
  /** Só mostra o tipo (Livro, Filme…) quando a grade mistura tipos. */
  showTypeLabel?: boolean;
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
  showTypeLabel = true,
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
      notifySaveFeedback({ status: 'success', message: 'Capa atualizada' });
    } catch {
      notifySaveFeedback({ status: 'error', message: LIBRARY_COVER_UPLOAD_ERROR });
    } finally {
      setUploadingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const menuItems: MoreMenuItem[] = [
    {
      id: 'cover',
      label: uploadingCover ? 'Enviando capa…' : 'Trocar capa',
      onClick: () => fileInputRef.current?.click(),
      disabled: uploadingCover,
    },
    { id: 'edit', label: 'Editar ficha', onClick: onEdit },
    {
      id: 'complete',
      label: completed ? 'Já concluído' : 'Marcar concluído',
      onClick: onMarkComplete,
      disabled: completed,
    },
    { id: 'idea', label: 'Transformar em ideia', onClick: onTurnIntoIdea },
    {
      id: 'primary',
      label: isPrimaryMobileBook ? 'Deixar de ser o livro atual' : 'Definir como livro atual',
      onClick: onTogglePrimary,
    },
  ];

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
            {/* A capa inteira abre o livro; as outras ações ficam no ⋯ do canto, longe do centro onde se clica. */}
            <button
              type="button"
              onClick={onOpen}
              aria-label={`Abrir anotações de ${item.titulo}`}
              title="Abrir anotações"
              className="absolute inset-0 z-0 rounded-[var(--radius-card-mobile)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent-blue)] md:rounded-[var(--radius-card)]"
            />

            {uploadingCover ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[var(--text-primary)]/40">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--bg-elevated)]" aria-label="Enviando capa" />
              </div>
            ) : null}

            {/* Etiquetas com fundo sólido: texto direto sobre a arte sumia em capas claras. */}
            <div className="pointer-events-none absolute bottom-2 left-2 flex flex-col items-start gap-1">
              {showTypeLabel ? (
                <Text variant="label" as="span" className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[var(--text-primary)]">
                  {typeConfig.label}
                </Text>
              ) : null}
              <Text variant="label" as="span" className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[var(--text-primary)]">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: statusDotColor(item.status) }}
                />
                {item.status}
              </Text>
            </div>

            <div className="absolute right-2 top-2 z-20" onClick={event => event.stopPropagation()}>
              <MoreMenu
                items={menuItems}
                size="sm"
                label={`Mais ações de ${item.titulo}`}
                triggerClassName="bg-[var(--bg-elevated)] text-[var(--text-primary)] opacity-0 hover:bg-[var(--bg-elevated)] group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 pointer-coarse:opacity-100"
              />
            </div>

            {contentsCount > 0 ? (
              <div
                title={contentsCount === 1 ? '1 roteiro usa esta obra' : `${contentsCount} roteiros usam esta obra`}
                aria-label={contentsCount === 1 ? '1 roteiro usa esta obra' : `${contentsCount} roteiros usam esta obra`}
                // Desce quando o ⋯ aparece no mesmo canto.
                className="absolute right-2 top-2 z-20 flex h-6 items-center gap-1 rounded-full bg-[var(--text-primary)] px-2 t-label text-[var(--bg-primary)] transition-all group-hover:top-11 group-focus-within:top-11 pointer-coarse:top-14"
              >
                <FileText className="h-3 w-3" aria-hidden />
                {contentsCount === 1 ? '1 roteiro' : `${contentsCount} roteiros`}
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
          {item.autorDiretor?.trim() ? item.autorDiretor : <ValorVazio />}
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
              <Text variant="label" as="span"
                key={tag}
                className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[var(--text-secondary)]"
              >
                {tag}
              </Text>
            ))}
          />
        ) : null}
      </div>
    </motion.div>
  );
}
