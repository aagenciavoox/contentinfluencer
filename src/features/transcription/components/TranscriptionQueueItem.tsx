import { useState } from 'react';
import { AlertCircle, AudioLines, Check, CheckCircle2, Clock, Copy, RotateCcw, X } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { IconButton } from '../../../components/ui/IconButton';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import { copyText } from '../lib/downloadText';
import { buildPlainText } from '../lib/transcriptFormats';
import { transcriptMeta } from '../lib/transcriptMeta';
import { isQueueItemActive, type QueueItem } from '../lib/transcriptionQueue';

function statusLine(item: QueueItem, position: number | undefined, paused: boolean) {
  switch (item.status) {
    case 'waiting':
      if (paused) return 'Na fila, esperando o limite gratuito liberar';
      return position === 1 ? 'Próximo da fila' : `Na fila · ${position ?? ''}º`;
    case 'extracting':
      return `Separando o áudio do vídeo… ${Math.round(item.progress * 100)}%`;
    case 'transcribing':
      return 'Transcrevendo… costuma levar alguns segundos';
    case 'done':
      return (item.transcript && transcriptMeta(item.transcript)) || 'Transcrição pronta';
    case 'error':
      return item.error ?? 'Não deu para transcrever este vídeo.';
  }
}

function StatusIcon({ item }: { item: QueueItem }) {
  const className = 'mt-0.5 h-5 w-5 shrink-0';
  if (item.status === 'done') return <CheckCircle2 className={cn(className, 'text-[var(--success)]')} aria-hidden />;
  if (item.status === 'error') return <AlertCircle className={cn(className, 'text-[var(--text-tertiary)]')} aria-hidden />;
  if (item.status === 'waiting') return <Clock className={cn(className, 'text-[var(--text-tertiary)]')} aria-hidden />;
  return <AudioLines className={cn(className, 'text-[var(--brand-accent-strong)]')} aria-hidden />;
}

export function TranscriptionQueueItem({
  item,
  position,
  paused,
  onOpen,
  onRemove,
  onRetry,
}: {
  item: QueueItem;
  position?: number;
  paused: boolean;
  onOpen: () => void;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const active = isQueueItemActive(item);

  const copy = async () => {
    if (!item.transcript) return;
    const ok = await copyText(buildPlainText(item.transcript));
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <li className="stack-sm py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3 md:items-center">
        <StatusIcon item={item} />
        {/* No celular os botões descem para baixo do nome, para o nome não ficar espremido. */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
          <div className="min-w-0 stack-xs">
            <Text variant="bodyStrong" truncate>{item.file.name}</Text>
            <Text variant="secondary">{statusLine(item, position, paused)}</Text>
          </div>

          {item.status === 'done' || item.status === 'error' || active ? (
            <div className="flex flex-wrap items-center gap-2 md:shrink-0">
              {item.status === 'done' ? (
                <>
                  <AppButton size="sm" onClick={onOpen}>Ver texto</AppButton>
                  <IconButton label={copied ? 'Copiado' : 'Copiar texto'} size="sm" onClick={() => void copy()}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </IconButton>
                </>
              ) : null}
              {item.status === 'error' ? (
                <AppButton size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={onRetry}>
                  Tentar de novo
                </AppButton>
              ) : null}
              {active ? <AppButton size="sm" onClick={onRemove}>Cancelar</AppButton> : null}
            </div>
          ) : null}
        </div>

        {active ? null : (
          <IconButton
            label={item.status === 'done' ? 'Tirar da lista' : 'Tirar da fila'}
            size="sm"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </IconButton>
        )}
      </div>

      {active ? (
        <div
          className="ml-8 h-1.5 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--bg-hover)]"
          role="progressbar"
          aria-label={item.status === 'extracting' ? `Separando o áudio de ${item.file.name}` : `Transcrevendo ${item.file.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={item.status === 'extracting' ? Math.round(item.progress * 100) : undefined}
        >
          <div
            className={cn(
              'h-full rounded-[var(--radius-pill)] bg-[var(--brand-accent-strong)] transition-[width] duration-300',
              item.status === 'transcribing' && 'w-full animate-pulse',
            )}
            style={item.status === 'extracting' ? { width: `${Math.max(4, item.progress * 100)}%` } : undefined}
          />
        </div>
      ) : null}
    </li>
  );
}
