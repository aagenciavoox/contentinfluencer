import { useState } from 'react';
import { Dialog } from '../../../components/overlays/Dialog';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { Surface } from '../../../components/ui/Surface';
import type { Content, ContentPlataforma } from '../../../lib/database';
import { contaDaRef, rotuloConta, type ContaRef } from '../../contas/lib/contas';
import { getPlatformDotClass } from './CaptionQueueItemCard';
import { Copy } from 'lucide-react';

interface CopyCaptionToAccountsModalProps {
  open: boolean;
  onClose: () => void;
  content: Content;
  currentPublicacao: ContentPlataforma;
  contas: readonly ContaRef[];
  onConfirm: (targetPlatformIds: string[], copyText: boolean, copyTags: boolean) => Promise<void>;
}

export function CopyCaptionToAccountsModal({
  open,
  onClose,
  content,
  currentPublicacao,
  contas,
  onConfirm,
}: CopyCaptionToAccountsModalProps) {
  const outrasContas = content.plataformas.filter(p => p.id !== currentPublicacao.id);
  const [selectedIds, setSelectedIds] = useState<string[]>(outrasContas.map(p => p.id));
  const [copyText, setCopyText] = useState(true);
  const [copyTags, setCopyTags] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
  };

  const handleCopy = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      await onConfirm(selectedIds, copyText, copyTags);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const sourceConta = contaDaRef(currentPublicacao.platformId, contas);
  const sourceName = sourceConta ? rotuloConta(sourceConta) : currentPublicacao.platformId;

  return (
    <Dialog open={open} onClose={onClose} desktopMaxW="md:max-w-md" ariaLabel="Copiar legenda para outras contas">
      <div className="stack-md p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] text-[var(--text-primary)]">
            <Copy className="h-4 w-4" />
          </div>
          <div>
            <Text variant="sectionTitle" as="h2">
              Copiar para outras contas
            </Text>
            <Text variant="secondary" as="p">
              De: <Text variant="bodyStrong" as="span">{sourceName}</Text>
            </Text>
          </div>
        </div>

        {outrasContas.length === 0 ? (
          <Surface padding="md" className="p-4 text-center bg-[var(--surface-subtle)]">
            <Text variant="secondary">Esta pauta não possui outras contas configuradas.</Text>
          </Surface>
        ) : (
          <div className="stack-sm">
            <Text variant="label" as="p" className="text-[var(--text-secondary)]">
              Selecione as contas de destino:
            </Text>
            <div className="stack-xs max-h-48 overflow-y-auto">
              {outrasContas.map(pub => {
                const conta = contaDaRef(pub.platformId, contas);
                const nome = conta ? rotuloConta(conta) : pub.platformId;
                const dotClass = getPlatformDotClass(pub.platformId, conta);
                const checked = selectedIds.includes(pub.id);

                return (
                  <label
                    key={pub.id}
                    className="flex items-center gap-3 rounded-[var(--radius-input)] border border-[var(--border-color)] p-2.5 hover:bg-[var(--bg-hover)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(pub.id)}
                      className="rounded-[var(--radius-sm)] border border-[var(--border-input)] text-[var(--brand-accent)] focus:ring-[var(--focus-ring)]"
                    />
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotClass}`} />
                    <Text variant="bodyStrong" as="span" className="truncate">{nome}</Text>
                  </label>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[var(--border-color)] flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyText}
                  onChange={e => setCopyText(e.target.checked)}
                  className="rounded-[var(--radius-sm)] border border-[var(--border-input)] text-[var(--brand-accent)] focus:ring-[var(--focus-ring)]"
                />
                <Text variant="secondary" as="span">Copiar texto da legenda</Text>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyTags}
                  onChange={e => setCopyTags(e.target.checked)}
                  className="rounded-[var(--radius-sm)] border border-[var(--border-input)] text-[var(--brand-accent)] focus:ring-[var(--focus-ring)]"
                />
                <Text variant="secondary" as="span">Copiar bloco de hashtags</Text>
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
          <AppButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </AppButton>
          <AppButton
            variant="primary"
            onClick={handleCopy}
            disabled={submitting || outrasContas.length === 0 || selectedIds.length === 0 || (!copyText && !copyTags)}
          >
            {submitting ? 'Copiando...' : 'Copiar'}
          </AppButton>
        </div>
      </div>
    </Dialog>
  );
}
