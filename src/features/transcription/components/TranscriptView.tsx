import { useState } from 'react';
import { Check, ChevronLeft, Copy, Download } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { FilterChips } from '../../../components/ui/FilterChips';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { copyText, downloadText } from '../lib/downloadText';
import {
  buildPlainText,
  buildSrt,
  formatClock,
  transcriptFileName,
  type Transcript,
} from '../lib/transcriptFormats';
import { transcriptMeta } from '../lib/transcriptMeta';

type TranscriptViewMode = 'texto' | 'tempos';

const VIEWS: { id: TranscriptViewMode; label: string }[] = [
  { id: 'texto', label: 'Texto' },
  { id: 'tempos', label: 'Com tempos' },
];

/** Texto de um vídeo da fila. `showTitle` no celular, onde o cabeçalho não mostra o nome do arquivo. */
export function TranscriptView({
  fileName,
  transcript,
  onBack,
  showTitle,
}: {
  fileName: string;
  transcript: Transcript;
  onBack: () => void;
  showTitle: boolean;
}) {
  const [view, setView] = useState<TranscriptViewMode>('texto');
  const [copied, setCopied] = useState(false);
  const plainText = buildPlainText(transcript);
  const hasSegments = transcript.segments.length > 0;
  const meta = transcriptMeta(transcript);

  const copy = async () => {
    const ok = await copyText(plainText);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="stack-md">
      <div>
        <AppButton size="sm" leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={onBack}>
          Voltar para a fila
        </AppButton>
      </div>

      {showTitle ? (
        <div className="min-w-0 stack-xs">
          <Text variant="itemTitle" truncate>{fileName}</Text>
          {meta ? <Text variant="meta">{meta}</Text> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <AppButton
            variant="primary"
            size="sm"
            leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            onClick={() => void copy()}
            disabled={!plainText}
          >
            {copied ? 'Copiado' : 'Copiar texto'}
          </AppButton>
          <AppButton
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => downloadText(plainText, transcriptFileName(fileName, 'txt'))}
            disabled={!plainText}
          >
            Baixar .txt
          </AppButton>
          <AppButton
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => downloadText(buildSrt(transcript.segments), transcriptFileName(fileName, 'srt'), 'application/x-subrip;charset=utf-8')}
            disabled={!hasSegments}
            disabledReason="Esta transcrição veio sem tempos, então não dá para montar o .srt."
          >
            Baixar .srt
          </AppButton>
        </div>
        {hasSegments ? (
          <FilterChips<TranscriptViewMode>
            ariaLabel="Como mostrar a transcrição"
            options={VIEWS}
            value={view}
            onChange={setView}
          />
        ) : null}
      </div>

      <Surface padding="md" variant="info" className="max-h-[65vh] overflow-y-auto">
        {!plainText ? (
          <Text variant="secondary">Nenhuma fala foi reconhecida neste áudio.</Text>
        ) : view === 'tempos' && hasSegments ? (
          <ol className="stack-sm">
            {transcript.segments.map((segment, index) => (
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
}
