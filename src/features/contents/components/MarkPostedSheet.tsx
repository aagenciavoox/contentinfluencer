import { Text } from '../../../components/ui/Text';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { BottomSheet } from '../../../components/overlays/BottomSheet';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { AppButton } from '../../../components/ui/AppButton';
import { PropertyDatePicker } from '../../../components/ui/PropertyDatePicker';
import { TimeField } from '../../../components/ui/TimeField';
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
  /** Rede de referência das preferências, congelada na primeira publicação. */
  redeReferenciaId?: string | null;
  platformName?: (platformId: string) => string;
  /** Quando verdadeiro, o formulário entra no diálogo que já está aberto. */
  embedded?: boolean;
  initialRealizadaEm?: string | null;
  onClose: () => void;
  onConfirm: (result: Marked) => void | Promise<void>;
}

type RowState = {
  id: string;
  label: string;
  /** Dia e hora ficam separados no formulário; juntos voltam ao valor completo ao salvar. */
  realizadaData: string;
  realizadaHora: string;
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

function splitDatetimeLocal(value: string): {data: string; hora: string} {
  const [data, hora = ''] = value.split('T');
  return {data, hora};
}

function joinDatetimeLocal(data: string, hora: string): string {
  return data && hora ? `${data}T${hora}` : '';
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
  const fallback = splitDatetimeLocal(toDatetimeLocal(initialRealizadaEm || new Date().toISOString()));
  const destinos = content.plataformas.filter(
    plataforma => plataforma.status !== 'removida' && plataforma.status !== 'nao_publicada',
  );
  const rows = destinos.length > 0 ? destinos : content.plataformas;
  if (rows.length === 0) {
    return [{
      id: '',
      label: 'Este roteiro',
      realizadaData: fallback.data,
      realizadaHora: fallback.hora,
      postUrl: content.link ?? '',
    }];
  }
  return rows.map(plataforma => {
    const quando = plataforma.realizadaManualEm
      ? splitDatetimeLocal(toDatetimeLocal(plataforma.realizadaManualEm))
      : fallback;
    return {
      id: plataforma.id,
      label: platformName(plataforma.platformId),
      realizadaData: quando.data,
      realizadaHora: quando.hora,
      postUrl: plataforma.postUrl ?? '',
    };
  });
}

export function MarkPostedSheet({
  open,
  content,
  serie = null,
  redeReferenciaId = null,
  platformName = platformId => platformId,
  embedded = false,
  initialRealizadaEm = null,
  onClose,
  onConfirm,
}: MarkPostedSheetProps) {
  const [rows, setRows] = useState<RowState[]>([]);
  const wasOpen = useRef(false);
  const canConfirm = rows.length > 0 && rows.every(row => Boolean(joinDatetimeLocal(row.realizadaData, row.realizadaHora)));

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

  const confirm = () => {
    if (!canConfirm) return;
    const entradas: EntradaPublicacao[] = rows.map(row => ({
      id: row.id,
      realizadaEm: fromDatetimeLocal(joinDatetimeLocal(row.realizadaData, row.realizadaHora)) || new Date().toISOString(),
      postUrl: row.postUrl,
    }));
    const marked = markPublished(content, content.plataformas, entradas, { serie, redeReferenciaId });
    void Promise.resolve(onConfirm({
      content: { ...content, ...marked.content },
      publicacoes: marked.publicacoes,
    }));
  };

  if (!open && embedded) return null;

  const body = (
    <div className="stack-lg p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Text variant="itemTitle" as="p" className="text-[var(--text-secondary)]">Marcar como postado</Text>
          <Text variant="bodyStrong" as="p" className="mt-1 text-[var(--text-primary)]">
            {content.title.trim() || 'Roteiro sem título'}
          </Text>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          aria-label={embedded ? 'Voltar' : 'Fechar'}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Text variant="secondary" as="p" className="text-[var(--text-tertiary)]">
        {rows.some(row => row.id === '' && rows.length === 1)
          ? 'Ainda não há conta marcada. A data fica no roteiro, e o link é opcional.'
          : 'Para cada conta, confirme quando foi ao ar. O link é opcional.'}
      </Text>

      <div className="stack-sm">
        {rows.map((row, index) => (
          <article
            key={row.id || 'roteiro'}
            className="stack-sm rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4"
          >
            <Text variant="itemTitle" as="p" className="text-[var(--text-primary)]">{row.label}</Text>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="block">
                <Text variant="secondary" as="span" className="mb-2 block text-[var(--text-secondary)]">Data</Text>
                <PropertyDatePicker
                  variant="field"
                  ariaLabel={`Data de ${row.label}`}
                  value={row.realizadaData || null}
                  onChange={value => updateRow(index, {realizadaData: value ?? ''})}
                />
              </div>
              <div className="block">
                <Text variant="secondary" as="span" className="mb-2 block text-[var(--text-secondary)]">Hora</Text>
                <TimeField
                  ariaLabel={`Hora de ${row.label}`}
                  value={row.realizadaHora}
                  onChange={value => updateRow(index, {realizadaHora: value})}
                />
              </div>
            </div>
            <label className="block">
              <Text variant="secondary" as="span" className="mb-2 block text-[var(--text-secondary)]">Link (opcional)</Text>
              <input
                type="url"
                value={row.postUrl}
                onChange={event => updateRow(index, { postUrl: event.target.value })}
                placeholder="https://"
                className="min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 t-body text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-blue)]"
              />
            </label>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <AppButton variant="secondary" fullWidth onClick={onClose}>
          {embedded ? 'Voltar' : 'Agora não'}
        </AppButton>
        <AppButton variant="primary" fullWidth disabled={!canConfirm} onClick={confirm}>
          Marcar como postado
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