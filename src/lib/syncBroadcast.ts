const CHANNEL_NAME = 'content-os-data-sync';

export type DataSyncMessage = {
  type: 'data-changed';
  source: 'local-save';
  at: number;
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
export function broadcastDataSync(): void {
  getChannel()?.postMessage({
    type: 'data-changed',
    source: 'local-save',
    at: Date.now(),
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
