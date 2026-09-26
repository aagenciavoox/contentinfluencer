import { useId, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/utils';
import { uploadLibraryCover, validateLibraryCoverFile } from '../lib/uploadLibraryCover';

interface CoverUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  itemId?: string | null;
  className?: string;
  compact?: boolean;
  allowUrlFallback?: boolean;
}

export function CoverUploadField({
  value,
  onChange,
  itemId = null,
  className,
  compact = false,
  allowUrlFallback = true,
}: CoverUploadFieldProps) {
  const { user } = useAuth();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(Boolean(value) && !value.includes('/storage/v1/object/public/library-covers/'));

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
      });
      onChange(publicUrl);
      setShowUrl(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel enviar a capa.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('stack-sm', className)}>
      <Text variant="label" className="text-[var(--text-tertiary)]">
        Capa
      </Text>

      <Surface
        variant="outlined"
        padding="none"
        className={cn(
          'overflow-hidden',
          compact ? 'flex items-center gap-3 p-3' : 'stack-md p-4'
        )}
      >
        <div
          className={cn(
            'overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-hover)]',
            compact ? 'h-20 w-14 shrink-0' : 'aspect-[2/3] w-28'
          )}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--text-tertiary)]">
              <ImagePlus className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
            </div>
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
                onClick={() => {
                  onChange('');
                  setError(null);
                }}
                disabled={uploading}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Remover
              </AppButton>
            ) : null}
          </div>

          <Text variant="meta">JPG, PNG, WEBP ou GIF · ate 5 MB</Text>

          {allowUrlFallback ? (
            <button
              type="button"
              onClick={() => setShowUrl(current => !current)}
              className="text-left text-xs font-medium text-[var(--text-secondary)] underline-offset-2 hover:underline"
            >
              {showUrl ? 'Ocultar URL' : 'Ou colar URL'}
            </button>
          ) : null}
        </div>
      </Surface>

      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={event => void handleFile(event.target.files?.[0])}
      />

      {showUrl && allowUrlFallback ? (
        <input
          type="url"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="https://..."
          className="w-full"
          disabled={uploading}
        />
      ) : null}

      {error ? (
        <Text variant="meta" className="text-[var(--accent-red)]">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
