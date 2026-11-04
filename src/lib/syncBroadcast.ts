const CHANNEL_NAME = 'content-os-data-sync';

export type DataSyncMessage = {
  type: 'data-changed';
  source: 'local-save';
  at: number;
  removedContentIds?: string[];
};

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

/** Notifica outras abas / PWA instalado na mesma origem para recarregar dados. */
export function broadcastDataSync(removedContentIds?: readonly string[]): void {
  const ids = removedContentIds?.filter(id => id.length > 0);
  getChannel()?.postMessage({
    type: 'data-changed',
    source: 'local-save',
    at: Date.now(),
    ...(ids?.length ? { removedContentIds: [...ids] } : {}),
  } satisfies DataSyncMessage);
}

export function subscribeDataSync(listener: (message: DataSyncMessage) => void): () => void {
  const bus = getChannel();
  if (!bus) return () => undefined;

  const handler = (event: MessageEvent<DataSyncMessage>) => {
    if (event.data?.type !== 'data-changed') return;
    listener(event.data);
  };

  bus.addEventListener('message', handler);
  return () => bus.removeEventListener('message', handler);
}
