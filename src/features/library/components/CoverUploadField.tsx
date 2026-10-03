import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/utils';
import { deleteLibraryCoverByUrl } from '../lib/libraryCoverStorage';
import { uploadLibraryCover, validateLibraryCoverFile } from '../lib/uploadLibraryCover';
import { CoverFallback } from './CoverFallback';

interface CoverUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  itemId?: string | null;
  title?: string;
  typeLabel?: string;
  className?: string;
  compact?: boolean;
  allowUrlFallback?: boolean;
  /** Keep the URL field visible instead of hiding it behind a toggle. */
  urlAlwaysVisible?: boolean;
  /** Skip the inner card so the field can sit inside another surface. */
  plain?: boolean;
  description?: string;
}

export function CoverUploadField({
  value,
  onChange,
  itemId = null,
  title = 'Capa',
  typeLabel,
  className,
  compact = false,
  allowUrlFallback = true,
  urlAlwaysVisible = false,
  plain = false,
  description,
}: CoverUploadFieldProps) {
  const { user } = useAuth();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [showUrl, setShowUrl] = useState(
    urlAlwaysVisible || (Boolean(value) && !value.includes('/storage/v1/object/public/library-covers/')),
  );

  useEffect(() => {
    setBroken(false);
  }, [value]);

  const handlePick = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    const validationError = validateLibraryCoverFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!user?.id) {
      setError('Entre na conta para enviar a capa.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const publicUrl = await uploadLibraryCover({
        file,
        userId: user.id,
        itemId,
        previousUrl: value || null,
      });
      onChange(publicUrl);
      setShowUrl(false);
      setBroken(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel enviar a capa.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    const previous = value;
    onChange('');
    setError(null);
    setBroken(false);
    void deleteLibraryCoverByUrl(previous);
  };

  return (
    <div className={cn('stack-sm', className)}>
      <div>
        <Text variant="label" className="text-[var(--text-tertiary)]">
          Capa
        </Text>
        {description ? (
          <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">
            {description}
          </Text>
        ) : null}
      </div>

      <div
        className={cn(
          !plain && 'surface-outlined overflow-hidden',
          compact ? 'flex items-center gap-3' : 'stack-md',
          !plain && (compact ? 'p-3' : 'p-4'),
        )}
      >
        <div
          className={cn(
            'overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-hover)]',
            compact ? 'h-20 w-14 shrink-0' : 'aspect-[2/3] w-28',
          )}
        >
          {value && !broken ? (
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setBroken(true)}
            />
          ) : (
            <CoverFallback title={title} typeLabel={typeLabel} compact={compact} />
          )}
        </div>

        <div className={cn('min-w-0', compact ? 'flex-1 stack-sm' : 'stack-sm')}>
          <div className="flex flex-wrap gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={handlePick}
              disabled={uploading}
              leftIcon={
                uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />
              }
            >
              {uploading ? 'Enviando...' : value ? 'Trocar capa' : 'Enviar capa'}
            </AppButton>

            {value ? (
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={uploading}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Remover
              </AppButton>
            ) : null}
          </div>

          <Text variant="meta">JPG, PNG, WEBP ou GIF · ate 5 MB · compactamos automaticamente</Text>

          {allowUrlFallback && !urlAlwaysVisible ? (
            <button
              type="button"
              onClick={() => setShowUrl(current => !current)}
              className="text-left text-xs font-medium text-[var(--text-secondary)] underline-offset-2 hover:underline"
            >
              {showUrl ? 'Ocultar URL' : 'Ou colar URL'}
            </button>
          ) : null}
        </div>
      </div>

      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={event => void handleFile(event.target.files?.[0])}
      />

      {(showUrl || urlAlwaysVisible) && allowUrlFallback ? (
        <label className="stack-sm">
          <Text variant="meta" className="text-[var(--text-secondary)]">
            Link da imagem
          </Text>
          <input
            type="text"
            inputMode="url"
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder="https://..."
            className="w-full"
            disabled={uploading}
          />
        </label>
      ) : null}

      {error ? (
        <Text variant="meta" className="text-[var(--accent-red)]">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
