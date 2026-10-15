import { useEffect, useRef, useState, type DragEvent } from 'react';
import { AudioLines, Check, Copy, Download, RotateCcw, Upload } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { FilterChips } from '../../../components/ui/FilterChips';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { cn } from '../../../lib/utils';
import { transcribeAudio, type TranscriptLanguage } from '../lib/transcribeAudio';
import { TranscriptionUserError } from '../lib/transcriptionErrors';
import {
  buildPlainText,
  buildSrt,
  formatClock,
  transcriptFileName,
  type Transcript,
} from '../lib/transcriptFormats';

type Stage =
  | { kind: 'idle' }
  | { kind: 'extracting'; file: File; progress: number }
  | { kind: 'transcribing'; file: File }
  | { kind: 'done'; file: File; transcript: Transcript }
  | { kind: 'error'; file: File; message: string };

type TranscriptView = 'texto' | 'tempos';

const LANGUAGES: { id: TranscriptLanguage; label: string }[] = [
  { id: 'pt', label: 'Português' },
  { id: 'en', label: 'Inglês' },
  { id: 'es', label: 'Espanhol' },
  { id: 'auto', label: 'Detectar idioma' },
];

const VIEWS: { id: TranscriptView; label: string }[] = [
  { id: 'texto', label: 'Texto' },
  { id: 'tempos', label: 'Com tempos' },
];

const LANGUAGE_NAMES: Record<string, string> = {
  pt: 'português',
  portuguese: 'português',
  en: 'inglês',
  english: 'inglês',
  es: 'espanhol',
  spanish: 'espanhol',
};

const PRIVACY_NOTE = 'O vídeo fica no seu aparelho. Só o áudio vai para transcrição, e nada é guardado.';

const FALLBACK_MESSAGE = {
  extracting: 'O navegador não conseguiu ler o som deste vídeo. Exportar de novo em MP4 costuma resolver.',
  transcribing: 'A transcrição não voltou desta vez. Dá para tentar de novo em instantes.',
} as const;

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function downloadText(content: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function transcriptMeta(transcript: Transcript) {
  const parts: string[] = [];
  if (transcript.duration) parts.push(`${formatClock(transcript.duration)} de áudio`);
  const language = transcript.language ? LANGUAGE_NAMES[transcript.language.toLowerCase()] : null;
  if (language) parts.push(language);
  return parts.join(' · ');
}

export function TranscriptionPage() {
  const isMobile = useIsMobile();
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [language, setLanguage] = useState<TranscriptLanguage>('pt');
  const [view, setView] = useState<TranscriptView>('texto');
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = async (file: File) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setCopied(false);
    setView('texto');
    setStage({ kind: 'extracting', file, progress: 0 });
    let step: 'extracting' | 'transcribing' = 'extracting';

    try {
      // Carregado só aqui: a biblioteca de mídia não pesa nas outras telas.
      const { extractAudio } = await import('../lib/extractAudio');
      let shownPercent = 0;
      const audio = await extractAudio(file, {
        signal: controller.signal,
        // O progresso chega milhares de vezes; a tela só muda quando o número inteiro muda.
        onProgress: progress => {
          const percent = Math.floor(progress * 100);
          if (controller.signal.aborted || percent === shownPercent) return;
          shownPercent = percent;
          setStage({ kind: 'extracting', file, progress: percent / 100 });
        },
      });
      if (controller.signal.aborted) return;

      step = 'transcribing';
      setStage({ kind: 'transcribing', file });
      const transcript = await transcribeAudio(audio.blob, audio.fileName, language, controller.signal);
      if (controller.signal.aborted) return;
      setStage({ kind: 'done', file, transcript });
    } catch (error) {
      if (controller.signal.aborted || isAbort(error)) return;
      const message = error instanceof TranscriptionUserError
        ? error.message
        : FALLBACK_MESSAGE[step];
      setStage({ kind: 'error', file, message });
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStage({ kind: 'idle' });
  };

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (inputRef.current) inputRef.current.value = '';
    void run(file);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    pickFile(event.dataTransfer.files?.[0]);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <PageLayout
      contentWidth="narrow"
      contentStack="dense"
      header={(
        <DesktopPageHeader
          section="Criação"
          title="Transcrição"
          backLabel="Criação"
          backTo="/criacao"
          meta={PRIVACY_NOTE}
        />
      )}
    >
      {stage.kind === 'idle' ? (
        <div className="stack-md">
          <label
            onDragOver={event => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-card-mobile)] border border-dashed px-6 py-10 text-center transition-colors md:rounded-[var(--radius-card)]',
              'focus-within:shadow-[var(--focus-ring)]',
              dragging
                ? 'border-[var(--brand-accent-strong)] bg-[var(--bg-hover)]'
                : 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]',
            )}
          >
            <Upload className="h-6 w-6 text-[var(--text-tertiary)]" aria-hidden />
            <Text variant="sectionTitle" as="span">
              {isMobile ? 'Toque para escolher um vídeo' : 'Arraste um vídeo ou clique para escolher'}
            </Text>
            <Text variant="meta" as="span" className="max-w-md">
              MP4, MOV, WebM ou áudio (MP3, M4A). Até 2 horas por vez.
            </Text>
            <input
              ref={inputRef}
              type="file"
              accept="video/*,audio/*"
              className="sr-only"
              onChange={event => pickFile(event.target.files?.[0])}
            />
          </label>

          <div className="stack-sm">
            <Text variant="label" as="span">Idioma falado no vídeo</Text>
            <FilterChips<TranscriptLanguage>
              ariaLabel="Idioma falado no vídeo"
              options={LANGUAGES}
              value={language}
              onChange={setLanguage}
            />
          </div>

          {isMobile ? <Text variant="meta">{PRIVACY_NOTE}</Text> : null}
        </div>
      ) : null}

      {stage.kind === 'extracting' || stage.kind === 'transcribing' ? (
        <Surface padding="lg" className="stack-md" aria-live="polite">
          <div className="flex items-start gap-3">
            <AudioLines className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
            <div className="min-w-0 flex-1 stack-xs">
              <Text variant="bodyStrong" truncate>{stage.file.name}</Text>
              <Text variant="secondary">
                {stage.kind === 'extracting'
                  ? `Separando o áudio do vídeo… ${Math.round(stage.progress * 100)}%`
                  : 'Transcrevendo o áudio… costuma levar alguns segundos.'}
              </Text>
            </div>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--bg-hover)]"
            role="progressbar"
            aria-label={stage.kind === 'extracting' ? 'Separando o áudio' : 'Transcrevendo'}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stage.kind === 'extracting' ? Math.round(stage.progress * 100) : undefined}
          >
            <div
              className={cn(
                'h-full rounded-[var(--radius-pill)] bg-[var(--brand-accent-strong)] transition-[width] duration-300',
                stage.kind === 'transcribing' && 'w-full animate-pulse',
              )}
              style={stage.kind === 'extracting' ? { width: `${Math.max(4, stage.progress * 100)}%` } : undefined}
            />
          </div>
          <div>
            <AppButton size="sm" onClick={reset}>Cancelar</AppButton>
          </div>
        </Surface>
      ) : null}

      {stage.kind === 'error' ? (
        <Surface padding="lg" className="stack-md" role="status">
          <div className="stack-xs">
            <Text variant="bodyStrong" truncate>{stage.file.name}</Text>
            <Text variant="secondary">{stage.message}</Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <AppButton variant="primary" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => void run(stage.file)}>
              Tentar de novo
            </AppButton>
            <AppButton size="sm" onClick={reset}>Escolher outro arquivo</AppButton>
          </div>
        </Surface>
      ) : null}

      {stage.kind === 'done' ? (() => {
        const plainText = buildPlainText(stage.transcript);
        const hasSegments = stage.transcript.segments.length > 0;
        const meta = transcriptMeta(stage.transcript);
        return (
          <div className="stack-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 stack-xs">
                <Text variant="itemTitle" truncate>{stage.file.name}</Text>
                {meta ? <Text variant="meta">{meta}</Text> : null}
              </div>
              {hasSegments ? (
                <FilterChips<TranscriptView>
                  ariaLabel="Como mostrar a transcrição"
                  options={VIEWS}
                  value={view}
                  onChange={setView}
                />
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <AppButton
                variant="primary"
                size="sm"
                leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                onClick={() => void copyText(plainText)}
                disabled={!plainText}
              >
                {copied ? 'Copiado' : 'Copiar texto'}
              </AppButton>
              <AppButton
                size="sm"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => downloadText(plainText, transcriptFileName(stage.file.name, 'txt'), 'text/plain;charset=utf-8')}
                disabled={!plainText}
              >
                Baixar .txt
              </AppButton>
              <AppButton
                size="sm"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => downloadText(buildSrt(stage.transcript.segments), transcriptFileName(stage.file.name, 'srt'), 'application/x-subrip;charset=utf-8')}
                disabled={!hasSegments}
                disabledReason="Esta transcrição veio sem tempos, então não dá para montar o .srt."
              >
                Baixar .srt
              </AppButton>
              <AppButton size="sm" leftIcon={<Upload className="h-4 w-4" />} onClick={reset}>
                Transcrever outro
              </AppButton>
            </div>

            <Surface padding="md" variant="info" className="max-h-[65vh] overflow-y-auto">
              {!plainText ? (
                <Text variant="secondary">Nenhuma fala foi reconhecida neste áudio.</Text>
              ) : view === 'tempos' && hasSegments ? (
                <ol className="stack-sm">
                  {stage.transcript.segments.map((segment, index) => (
                    <li key={`${segment.start}-${index}`} className="flex gap-3">
                      <Text variant="meta" className="w-14 shrink-0 tabular-nums">{formatClock(segment.start)}</Text>
                      <Text className="min-w-0 flex-1">{segment.text}</Text>
                    </li>
                  ))}
                </ol>
              ) : (
                <Text className="whitespace-pre-wrap select-text">{plainText}</Text>
              )}
            </Surface>
          </div>
        );
      })() : null}
    </PageLayout>
  );
}
