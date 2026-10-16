import { useEffect, useId, useRef, useState } from 'react';
import { BookOpen, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/utils';
import { deleteLibraryCoverByUrl } from '../lib/libraryCoverStorage';
import { LIBRARY_COVER_UPLOAD_ERROR, uploadLibraryCover, validateLibraryCoverFile } from '../lib/uploadLibraryCover';
import { CoverFallback, coverInitial } from './CoverFallback';

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
  /** Hide the thumbnail when a larger cover is already on the page. */
  hidePreview?: boolean;
  /** Compact row used on the series editor: square, upload, and link. */
  appearance?: 'default' | 'series' | 'create';
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
  hidePreview = false,
  appearance = 'default',
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
    } catch {
      setError(LIBRARY_COVER_UPLOAD_ERROR);
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

  const fileInput = (
    <input
      id={inputId}
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      className="hidden"
      onChange={event => void handleFile(event.target.files?.[0])}
    />
  );

  if (appearance === 'create') {
    return (
      <div className={cn('stack-sm', className)}>
        <Text variant="label" className="text-sm font-semibold text-[var(--text-primary)]">
          Capa
        </Text>
        <div className="flex items-stretch gap-4 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-hover)] p-4">
          <div className="flex aspect-[2/3] w-24 shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-tertiary,var(--bg-secondary))] text-[var(--text-tertiary)] md:w-28">
            {value && !broken ? (
              <img src={value} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
            ) : (
              <>
                <BookOpen className="h-7 w-7" />
                <span className="text-xs">Sem capa</span>
              </>
            )}
          </div>
          <div className="w-px shrink-0 bg-[var(--border-color)]" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
            <div className="flex flex-wrap gap-2">
              <AppButton
                type="button"
                variant="secondary"
                onClick={handlePick}
                disabled={uploading}
                leftIcon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              >
                {uploading ? 'Enviando…' : value ? 'Trocar capa' : 'Enviar capa'}
              </AppButton>
              {value ? (
                <AppButton
                  type="button"
                  variant="ghost"
                  onClick={handleRemove}
                  disabled={uploading}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Remover
                </AppButton>
              ) : null}
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">
              <p>JPG, PNG, WEBP ou GIF · até 5 MB</p>
              <p>Compactamos automaticamente.</p>
            </div>
            {allowUrlFallback ? (
              <button
                type="button"
                onClick={() => setShowUrl(current => !current)}
                className="self-start text-xs font-semibold text-[var(--text-primary)] underline underline-offset-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                {showUrl ? 'Ocultar URL' : 'Ou colar URL'}
              </button>
            ) : null}
          </div>
        </div>
        {fileInput}
        {showUrl && allowUrlFallback ? (
          <input
            type="text"
            inputMode="url"
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder="https://..."
            aria-label="URL da capa"
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

  if (appearance === 'series') {
    return (
      <div className={cn('stack-sm', className)}>
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-hover)]">
            {value && !broken ? (
              <img
                src={value}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setBroken(true)}
              />
            ) : (
              <span className="text-lg font-semibold text-[var(--text-primary)]" aria-hidden>
                {coverInitial(title)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 stack-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={handlePick}
                disabled={uploading}
                leftIcon={
                  uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />
                }
              >
                {uploading ? 'Enviando…' : value ? 'Trocar capa' : 'Enviar capa'}
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
              {allowUrlFallback ? (
                <button
                  type="button"
                  onClick={() => setShowUrl(current => !current)}
                  className="inline-flex min-h-8 items-center text-sm font-medium text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-2 hover:decoration-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11"
                >
                  {showUrl ? 'Ocultar link' : 'Usar link da imagem'}
                </button>
              ) : null}
            </div>
            <Text variant="meta" className="text-[var(--text-tertiary)]">
              JPG, PNG, WEBP ou GIF · até 5 MB
            </Text>
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
        {showUrl && allowUrlFallback ? (
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
        {hidePreview ? null : (
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
        )}

        <div className={cn('min-w-0', compact || hidePreview ? 'flex-1 stack-sm' : 'stack-sm')}>
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
              {uploading ? 'Enviando…' : value ? 'Trocar capa' : 'Enviar capa'}
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

          <Text variant="meta">JPG, PNG, WEBP ou GIF · até 5 MB · compactamos automaticamente</Text>

          {allowUrlFallback && !urlAlwaysVisible ? (
            <button
              type="button"
              onClick={() => setShowUrl(current => !current)}
              className="inline-flex min-h-8 items-center self-start text-left text-xs font-medium text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-2 hover:decoration-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11"
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
