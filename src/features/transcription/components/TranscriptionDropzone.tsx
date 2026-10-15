import { useRef, useState, type DragEvent } from 'react';
import { Plus, Upload } from 'lucide-react';
import { Text } from '../../../components/ui/Text';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { cn } from '../../../lib/utils';

function onlyMedia(files: FileList | null | undefined) {
  return Array.from(files ?? []).filter(file =>
    !file.type || file.type.startsWith('video/') || file.type.startsWith('audio/'),
  );
}

/** Escolher ou arrastar vários vídeos de uma vez. `compact` quando a fila já tem itens. */
export function TranscriptionDropzone({
  onFiles,
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  compact?: boolean;
}) {
  const isMobile = useIsMobile();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (files: FileList | null | undefined) => {
    const media = onlyMedia(files);
    if (inputRef.current) inputRef.current.value = '';
    if (media.length > 0) onFiles(media);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files);
  };

  const title = compact
    ? 'Adicionar mais vídeos à fila'
    : isMobile
      ? 'Toque para escolher vídeos'
      : 'Arraste vídeos ou clique para escolher';

  return (
    <label
      onDragOver={event => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer items-center rounded-[var(--radius-card-mobile)] border border-dashed text-center transition-colors md:rounded-[var(--radius-card)]',
        'focus-within:shadow-[var(--focus-ring)]',
        compact
          ? 'min-h-14 justify-center gap-2 px-4 py-3'
          : 'min-h-[220px] flex-col justify-center gap-3 px-6 py-10',
        dragging
          ? 'border-[var(--brand-accent-strong)] bg-[var(--bg-hover)]'
          : 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]',
      )}
    >
      {compact ? (
        <>
          <Plus className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
          <Text variant="bodyStrong" as="span">{title}</Text>
        </>
      ) : (
        <>
          <Upload className="h-6 w-6 text-[var(--text-tertiary)]" aria-hidden />
          <Text variant="sectionTitle" as="span">{title}</Text>
          <Text variant="meta" as="span" className="max-w-md">
            Pode escolher vários: eles entram numa fila e são transcritos um por vez. MP4, MOV, WebM ou áudio, até 2 horas cada.
          </Text>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*"
        multiple
        className="sr-only"
        onChange={event => pick(event.target.files)}
      />
    </label>
  );
}
