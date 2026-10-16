import { useState } from 'react';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { buildParagraphs, formatClock, type Transcript } from '../lib/transcriptFormats';
import { transcriptMeta } from '../lib/transcriptMeta';
import { TranscriptActions } from './TranscriptActions';

type TranscriptViewMode = 'texto' | 'tempos';

const VIEWS: { id: TranscriptViewMode; label: string }[] = [
  { id: 'texto', label: 'Texto' },
  { id: 'tempos', label: 'Com tempos' },
];

/**
 * Texto de um vídeo da fila, em parágrafos e em duas colunas quando o card tem largura.
 * `mobile`: o celular não tem o cabeçalho do desktop, então o nome do arquivo e as ações vêm aqui.
 */
export function TranscriptView({
  fileName,
  transcript,
  mobile,
}: {
  fileName: string;
  transcript: Transcript;
  mobile: boolean;
}) {
  const [view, setView] = useState<TranscriptViewMode>('texto');
  const paragraphs = buildParagraphs(transcript);
  const hasSegments = transcript.segments.length > 0;
  const showTimes = view === 'tempos' && hasSegments;
  const meta = transcriptMeta(transcript);
  // No celular a barra do topo já diz "Transcrição": o card fica só com as abas.
  const showCardHeader = !mobile || hasSegments;

  return (
    <div className="stack-lg">
      {mobile ? (
        <div className="stack-md">
          <div className="min-w-0 stack-xs">
            <Text variant="itemTitle" truncate>{fileName}</Text>
            {meta ? <Text variant="meta">{meta}</Text> : null}
          </div>
          <TranscriptActions fileName={fileName} transcript={transcript} />
        </div>
      ) : null}

      <Surface as="section" padding="none" aria-label="Transcrição">
        {showCardHeader ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
            {!mobile ? <Text variant="sectionTitle">Transcrição</Text> : null}
            {hasSegments ? (
              <SegmentTabs<TranscriptViewMode>
                ariaLabel="Como mostrar a transcrição"
                options={VIEWS}
                value={view}
                onChange={setView}
              />
            ) : null}
          </div>
        ) : null}

        <div className={showCardHeader ? 'surface-separator p-4 md:px-6 md:py-6' : 'p-4'}>
          {paragraphs.length === 0 ? (
            <Text variant="secondary">Nenhuma fala foi reconhecida neste áudio.</Text>
          ) : showTimes ? (
            <div className="transcript-text">
              {paragraphs.map((paragraph, index) => (
                <ol key={index}>
                  {paragraph.map((line, lineIndex) => (
                    <li key={`${line.start}-${lineIndex}`} className="flex items-baseline gap-4">
                      <span className="t-meta w-12 shrink-0 tabular-nums">{formatClock(line.start ?? 0)}</span>
                      <span className="min-w-0 flex-1">{line.text}</span>
                    </li>
                  ))}
                </ol>
              ))}
            </div>
          ) : (
            <div className="transcript-text select-text">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>
                  {paragraph.map((line, lineIndex) => (
                    <span key={`${line.start}-${lineIndex}`} className="transcript-line">{line.text}</span>
                  ))}
                </p>
              ))}
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}
