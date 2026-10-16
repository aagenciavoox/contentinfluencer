import { useEffect, useState } from 'react';
import { Download, Play } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { FilterChips } from '../../../components/ui/FilterChips';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { TranscriptActions } from '../components/TranscriptActions';
import { TranscriptView } from '../components/TranscriptView';
import { TranscriptionDropzone } from '../components/TranscriptionDropzone';
import { TranscriptionQueueItem } from '../components/TranscriptionQueueItem';
import { transcriptionQueue, useTranscriptionQueue } from '../lib/appTranscriptionQueue';
import { downloadText } from '../lib/downloadText';
import { buildCombinedText, type TranscriptLanguage } from '../lib/transcriptFormats';
import { transcriptMeta } from '../lib/transcriptMeta';
import { queueSummary, waitingPositions } from '../lib/transcriptionQueue';

const LANGUAGES: { id: TranscriptLanguage; label: string }[] = [
  { id: 'pt', label: 'Português' },
  { id: 'en', label: 'Inglês' },
  { id: 'es', label: 'Espanhol' },
  { id: 'auto', label: 'Detectar idioma' },
];

const PRIVACY_NOTE = 'Os vídeos ficam no seu aparelho. Só o áudio vai para transcrição, e nada é guardado.';

export function TranscriptionPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queue = useTranscriptionQueue();
  const [language, setLanguage] = useState<TranscriptLanguage>('pt');

  const viewingId = searchParams.get('ver');
  const viewing = queue.items.find(item => item.id === viewingId && item.transcript) ?? null;

  // Link antigo ou item tirado da lista: volta para a fila.
  useEffect(() => {
    if (viewingId && !viewing) setSearchParams({}, { replace: true });
  }, [viewingId, viewing, setSearchParams]);

  const openItem = (id: string) => {
    navigate({ search: `?ver=${encodeURIComponent(id)}` }, { state: { fromQueue: true } });
  };

  // Abriu pela fila: volta no histórico, assim o voltar do navegador e o botão fazem a mesma coisa.
  const backToQueue = () => {
    if ((location.state as { fromQueue?: boolean } | null)?.fromQueue) navigate(-1);
    else setSearchParams({}, { replace: true });
  };

  if (viewing?.transcript) {
    return (
      <PageLayout
        contentWidth="narrow"
        contentStack="dense"
        header={(
          <DesktopPageHeader
            section="Transcrição"
            title={viewing.file.name}
            backLabel="Fila de transcrição"
            onBack={backToQueue}
            meta={transcriptMeta(viewing.transcript) || undefined}
            actions={<TranscriptActions fileName={viewing.file.name} transcript={viewing.transcript} />}
          />
        )}
      >
        <TranscriptView
          key={viewing.id}
          fileName={viewing.file.name}
          transcript={viewing.transcript}
          mobile={isMobile}
        />
      </PageLayout>
    );
  }

  const hasItems = queue.items.length > 0;
  const positions = waitingPositions(queue.items);
  const done = queue.items.filter(item => item.status === 'done' && item.transcript);

  const downloadAll = () => {
    downloadText(
      buildCombinedText(done.map(item => ({ fileName: item.file.name, transcript: item.transcript! }))),
      'transcricoes.txt',
    );
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
      <div className="stack-md">
        <TranscriptionDropzone
          compact={hasItems}
          onFiles={files => transcriptionQueue.addFiles(files, language)}
        />

        <div className="stack-sm">
          <Text variant="label" as="span">
            {hasItems ? 'Idioma dos próximos vídeos' : 'Idioma falado nos vídeos'}
          </Text>
          <FilterChips<TranscriptLanguage>
            ariaLabel="Idioma falado nos vídeos"
            options={LANGUAGES}
            value={language}
            onChange={setLanguage}
          />
        </div>

        {isMobile && !hasItems ? <Text variant="meta">{PRIVACY_NOTE}</Text> : null}
      </div>

      {queue.pausedMessage ? (
        <Surface padding="md" className="flex flex-wrap items-center justify-between gap-3" role="status">
          <Text variant="secondary" className="min-w-0 flex-1">
            {queue.pausedMessage} A fila fica guardada aqui enquanto isso.
          </Text>
          <AppButton size="sm" leftIcon={<Play className="h-4 w-4" />} onClick={() => transcriptionQueue.resume()}>
            Retomar a fila
          </AppButton>
        </Surface>
      ) : null}

      {hasItems ? (
        <Surface padding="md" className="stack-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 stack-xs">
              <Text variant="sectionTitle">Fila</Text>
              <Text variant="meta" aria-live="polite">{queueSummary(queue.items)}</Text>
            </div>
            {done.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {done.length > 1 ? (
                  <AppButton size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={downloadAll}>
                    Baixar todas (.txt)
                  </AppButton>
                ) : null}
                <AppButton size="sm" onClick={() => transcriptionQueue.clearDone()}>
                  Limpar prontas
                </AppButton>
              </div>
            ) : null}
          </div>

          <ul className="divide-y divide-[var(--border-color)]">
            {queue.items.map(item => (
              <TranscriptionQueueItem
                key={item.id}
                item={item}
                position={positions.get(item.id)}
                paused={Boolean(queue.pausedMessage)}
                onOpen={() => openItem(item.id)}
                onRemove={() => transcriptionQueue.remove(item.id)}
                onRetry={() => transcriptionQueue.retry(item.id)}
              />
            ))}
          </ul>

          <Text variant="meta">
            Dá para sair desta tela: a fila continua andando. Fechar ou recarregar a aba limpa a fila.
          </Text>
        </Surface>
      ) : null}
    </PageLayout>
  );
}
