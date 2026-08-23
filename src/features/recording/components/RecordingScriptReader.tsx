import {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {AlignCenter, AlignLeft, CheckCircle2, Contrast, Minus, Plus, X} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {useBodyScrollLock} from '../../../hooks/useBodyScrollLock';
import {readStoredJson, writeStoredJson} from '../../../lib/browserStorage';
import type {Content} from '../../../lib/database';
import {cn, htmlToReadableText} from '../../../lib/utils';

type ReaderSettings = {
  fontSize: number;
  lineHeight: number;
  textAlign: 'left' | 'center';
  highContrast: boolean;
};

interface RecordingScriptReaderProps {
  content: Content;
  loading?: boolean;
  loadError?: string | null;
  onClose: () => void;
  onMarkRecorded?: (contentId: string) => void;
}

const READER_SETTINGS_KEY = 'content-os:recording-script-reader-settings';
const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 36,
  lineHeight: 1.6,
  textAlign: 'left',
  highContrast: false,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function loadReaderSettings(): ReaderSettings {
  const saved = readStoredJson<Partial<ReaderSettings>>(READER_SETTINGS_KEY, {});
  return {
    fontSize: clamp(Number(saved.fontSize) || DEFAULT_SETTINGS.fontSize, 24, 64),
    lineHeight: clamp(Number(saved.lineHeight) || DEFAULT_SETTINGS.lineHeight, 1.25, 2),
    textAlign: saved.textAlign === 'center' ? 'center' : 'left',
    highContrast: saved.highContrast === true,
  };
}

export function RecordingScriptReader({
  content,
  loading = false,
  loadError = null,
  onClose,
  onMarkRecorded,
}: RecordingScriptReaderProps) {
  const [settings, setSettings] = useState(loadReaderSettings);
  const scrollRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(true);

  const script = useMemo(
    () => htmlToReadableText(content.script),
    [content.script]
  );
  const wordCount = useMemo(() => script.split(/\s+/).filter(Boolean).length, [script]);

  useEffect(() => {
    writeStoredJson(READER_SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    scrollRef.current?.scrollTo({top: 0});
  }, [content.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === '+' || event.key === '=') {
        setSettings(previous => ({...previous, fontSize: clamp(previous.fontSize + 2, 24, 64)}));
      }
      if (event.key === '-') {
        setSettings(previous => ({...previous, fontSize: clamp(previous.fontSize - 2, 24, 64)}));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const foregroundClass = settings.highContrast
    ? 'text-[var(--bg-primary)]'
    : 'text-[var(--text-primary)]';
  const mutedClass = settings.highContrast
    ? 'text-[var(--bg-primary)]/65'
    : 'text-[var(--text-secondary)]';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-busy={loading}
      aria-label={`Leitura do roteiro ${content.title || 'sem título'}`}
      className={cn(
        'fixed inset-0 z-[210] flex min-h-[100dvh] flex-col overflow-hidden',
        settings.highContrast
          ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
          : 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
      )}
    >
      <Surface
        as="header"
        variant="plain"
        padding="sm"
        className={cn(
          'shrink-0 rounded-none border-b md:px-6',
          settings.highContrast
            ? 'border-[var(--bg-primary)]/20 bg-[var(--text-primary)]'
            : 'border-[var(--border-color)] bg-[var(--bg-elevated)]'
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <Text variant="eyebrow" className={mutedClass}>Modo leitura</Text>
            <Text variant="itemTitle" truncate className={cn('mt-1', foregroundClass)}>
              {content.title || 'Roteiro sem título'}
            </Text>
          </div>

          <AppButton
            variant="ghost"
            size="lg"
            iconOnly
            leftIcon={<X className="h-5 w-5" />}
            onClick={onClose}
            aria-label="Fechar modo leitura"
            className={foregroundClass}
          />
        </div>

        <div className="mx-auto mt-3 flex w-full max-w-6xl flex-wrap items-center justify-between gap-2">
          <Badge className="shrink-0">Leitura estática · sem bloco</Badge>
          <div className="flex shrink-0 items-center gap-2">
            <AppButton
              variant="secondary"
              size="sm"
              iconOnly
              leftIcon={<Minus className="h-4 w-4" />}
              onClick={() => setSettings(previous => ({...previous, fontSize: clamp(previous.fontSize - 2, 24, 64)}))}
              aria-label="Diminuir texto"
            />
            <Badge className="shrink-0 tabular-nums">{settings.fontSize}px</Badge>
            <AppButton
              variant="secondary"
              size="sm"
              iconOnly
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setSettings(previous => ({...previous, fontSize: clamp(previous.fontSize + 2, 24, 64)}))}
              aria-label="Aumentar texto"
            />
            <AppButton
              variant="secondary"
              size="sm"
              iconOnly
              leftIcon={settings.textAlign === 'left' ? <AlignLeft className="h-4 w-4" /> : <AlignCenter className="h-4 w-4" />}
              onClick={() => setSettings(previous => ({
                ...previous,
                textAlign: previous.textAlign === 'left' ? 'center' : 'left',
              }))}
              aria-label={settings.textAlign === 'left' ? 'Centralizar texto' : 'Alinhar texto à esquerda'}
            />
            <AppButton
              variant="secondary"
              size="sm"
              iconOnly
              leftIcon={<Contrast className="h-4 w-4" />}
              onClick={() => setSettings(previous => ({...previous, highContrast: !previous.highContrast}))}
              aria-label="Alternar alto contraste"
            />
          </div>
        </div>
      </Surface>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-14">
        {loading || loadError ? (
          <Surface
            variant="outlined"
            padding="lg"
            className={cn(
              'mx-auto max-w-xl text-center',
              settings.highContrast && 'border-[var(--bg-primary)]/20 bg-transparent'
            )}
          >
            <Text variant="sectionTitle" className={foregroundClass}>
              {loading ? 'Carregando roteiro...' : 'Não foi possível carregar o roteiro'}
            </Text>
            {loadError ? (
              <Text variant="secondary" className={cn('mt-2', mutedClass)}>{loadError}</Text>
            ) : null}
          </Surface>
        ) : (
          <Text
            as="div"
            variant="body"
            className={cn('mx-auto whitespace-pre-wrap font-semibold', foregroundClass)}
          >
            <div
              style={{
                maxWidth: '900px',
                margin: '0 auto',
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                textAlign: settings.textAlign,
              }}
            >
              {script || 'Este roteiro ainda não tem texto.'}
            </div>
          </Text>
        )}
      </div>

      <Surface
        as="footer"
        variant="plain"
        padding="sm"
        className={cn(
          'shrink-0 rounded-none border-t md:px-6',
          settings.highContrast
            ? 'border-[var(--bg-primary)]/20 bg-[var(--text-primary)]'
            : 'border-[var(--border-color)] bg-[var(--bg-elevated)]'
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <Text variant="meta" className={mutedClass}>{wordCount} palavras</Text>
          {onMarkRecorded ? (
            <AppButton
              variant="primary"
              size="lg"
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => onMarkRecorded(content.id)}
              disabled={loading || Boolean(loadError)}
            >
              Marcar como gravado
            </AppButton>
          ) : null}
        </div>
      </Surface>
    </div>,
    document.body
  );
}
