import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { BottomSheet } from '../../../components/overlays/BottomSheet';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { AppButton } from '../../../components/ui/AppButton';
import type { Content, ContentPlataforma, Serie } from '../../../lib/database';
import {
  markPublished,
  type EntradaPublicacao,
} from '../../editorial/lib/markPublished';

type Marked = {
  content: Content;
  publicacoes: ContentPlataforma[];
};

interface MarkPostedSheetProps {
  open: boolean;
  content: Content;
  serie?: Pick<Serie, 'funcaoPadrao'> | null;
  platformName?: (platformId: string) => string;
  /** Quando verdadeiro, o formulário entra no diálogo que já está aberto. */
  embedded?: boolean;
  initialRealizadaEm?: string | null;
  isSaving?: boolean;
  onClose: () => void;
  onConfirm: (result: Marked) => void | Promise<void>;
}

type RowState = {
  id: string;
  label: string;
  realizadaLocal: string;
  postUrl: string;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function seedRows(
  content: Content,
  platformName: (platformId: string) => string,
  initialRealizadaEm: string | null | undefined,
): RowState[] {
  const fallback = toDatetimeLocal(initialRealizadaEm || new Date().toISOString());
  const destinos = content.plataformas.filter(
    plataforma => plataforma.status !== 'removida' && plataforma.status !== 'nao_publicada',
  );
  const rows = destinos.length > 0 ? destinos : content.plataformas;
  if (rows.length === 0) {
    return [{
      id: '',
      label: 'Este roteiro',
      realizadaLocal: fallback,
      postUrl: content.link ?? '',
    }];
  }
  return rows.map(plataforma => ({
    id: plataforma.id,
    label: platformName(plataforma.platformId),
    realizadaLocal: plataforma.realizadaManualEm
      ? toDatetimeLocal(plataforma.realizadaManualEm)
      : fallback,
    postUrl: plataforma.postUrl ?? '',
  }));
}

export function MarkPostedSheet({
  open,
  content,
  serie = null,
  platformName = platformId => platformId,
  embedded = false,
  initialRealizadaEm = null,
  isSaving = false,
  onClose,
  onConfirm,
}: MarkPostedSheetProps) {
  const [rows, setRows] = useState<RowState[]>([]);
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);
  const busy = isSaving || saving;
  const canConfirm = rows.length > 0 && rows.every(row => Boolean(fromDatetimeLocal(row.realizadaLocal)));

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) return;
    wasOpen.current = true;
    setRows(seedRows(content, platformName, initialRealizadaEm));
  }, [open, content, platformName, initialRealizadaEm]);

  const updateRow = (index: number, patch: Partial<RowState>) => {
    setRows(current => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, ...patch } : row
    )));
  };

  const confirm = async () => {
    if (!canConfirm || busy) return;
    const entradas: EntradaPublicacao[] = rows.map(row => ({
      id: row.id,
      realizadaEm: fromDatetimeLocal(row.realizadaLocal) || new Date().toISOString(),
      postUrl: row.postUrl,
    }));
    setSaving(true);
    try {
      const marked = markPublished(content, content.plataformas, entradas, { serie });
      await onConfirm({
        content: { ...content, ...marked.content },
        publicacoes: marked.publicacoes,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open && embedded) return null;

  const body = (
    <div className="stack-lg p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Marcar como postado</p>
          <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
            {content.title.trim() || 'Roteiro sem título'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          aria-label={embedded ? 'Voltar' : 'Fechar'}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-[var(--text-tertiary)]">
        {rows.some(row => row.id === '' && rows.length === 1)
          ? 'Ainda não há destino. A data fica no roteiro, e o link é opcional.'
          : 'Para cada destino, confirme quando foi ao ar. O link é opcional.'}
      </p>

      <div className="stack-sm">
        {rows.map((row, index) => (
          <article
            key={row.id || 'roteiro'}
            className="stack-sm rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4"
          >
            <p className="text-sm font-semibold text-[var(--text-primary)]">{row.label}</p>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Data e hora</span>
              <input
                type="datetime-local"
                value={row.realizadaLocal}
                onChange={event => updateRow(index, { realizadaLocal: event.target.value })}
                className="min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Link (opcional)</span>
              <input
                type="url"
                value={row.postUrl}
                onChange={event => updateRow(index, { postUrl: event.target.value })}
                placeholder="https://"
                className="min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-blue)]"
              />
            </label>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <AppButton variant="secondary" fullWidth disabled={busy} onClick={onClose}>
          {embedded ? 'Voltar' : 'Agora não'}
        </AppButton>
        <AppButton variant="primary" fullWidth disabled={!canConfirm || busy} onClick={() => void confirm()}>
          {busy ? 'Salvando…' : 'Marcar como postado'}
        </AppButton>
      </div>
    </div>
  );

  if (embedded) return body;

  return (
    <BottomSheet open={open} onClose={onClose} desktopMaxW="max-w-lg" zIndex="z-[130]" ariaLabel="Marcar como postado">
      <OverlayBody>{body}</OverlayBody>
    </BottomSheet>
  );
}