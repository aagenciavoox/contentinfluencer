import {useId, useState} from 'react';
import {ChevronRight, Play} from 'lucide-react';
import {Text} from '../../../../components/ui/Text';
import {TextCount} from '../../../../components/ui/TextCount';
import {cn} from '../../../../lib/utils';

export const PROPOSTA_MAX = 280;

interface YoutubeScriptHeaderProps {
  contentId: string;
  title: string;
  onTitleChange: (title: string) => void;
  /** Enter no título leva o cursor para o texto. */
  onTitleEnter: () => void;
  proposta: string;
  onPropostaChange: (value: string) => void;
}

/** Topo do modo YouTube: título do vídeo com a marca e a proposta, que abre e fecha. */
export function YoutubeScriptHeader({
  contentId,
  title,
  onTitleChange,
  onTitleEnter,
  proposta,
  onPropostaChange,
}: YoutubeScriptHeaderProps) {
  const fieldId = useId();
  // Fechada, a proposta cabe numa linha (ou mostra a dica de escrever uma).
  const [openChoice, setOpenChoice] = useState<{contentId: string; open: boolean} | null>(null);
  const open = openChoice?.contentId === contentId ? openChoice.open : false;
  const setOpen = (next: boolean) => setOpenChoice({contentId, open: next});

  return (
    <div className="stack-sm">
      <label className="flex min-h-12 min-w-0 items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 transition-colors focus-within:border-[var(--border-strong)]">
        <span
          aria-hidden
          className="inline-flex h-5 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--platform-youtube)]"
        >
          <Play className="h-2.5 w-2.5 fill-current text-[var(--brand-on-accent)]" />
        </span>
        <span className="sr-only">Título do vídeo</span>
        <input
          type="text"
          value={title === 'Novo roteiro' ? '' : title}
          onChange={event => onTitleChange(event.target.value)}
          onKeyDown={event => {
            if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
            event.preventDefault();
            onTitleEnter();
          }}
          placeholder="Título do vídeo"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-none border-0 bg-transparent py-2 t-item-title text-[var(--text-primary)] shadow-none outline-none placeholder:text-[var(--text-tertiary)] focus:border-0 focus:shadow-none"
        />
      </label>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)]">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={fieldId}
          onClick={() => setOpen(!open)}
          className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded-[var(--radius-card)] px-4 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <ChevronRight
            className={cn('h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform', open && 'rotate-90')}
            aria-hidden
          />
          <Text as="span" variant="bodyStrong" className="shrink-0">Proposta do vídeo</Text>
          {!open ? (
            <Text as="span" variant="meta" className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
              {proposta.trim() || 'Em uma frase: o que quem assistir vai levar deste vídeo'}
            </Text>
          ) : null}
        </button>
        {open ? (
          <div id={fieldId} className="px-4 pb-3">
            <textarea
              value={proposta}
              onChange={event => onPropostaChange(event.target.value.slice(0, PROPOSTA_MAX))}
              rows={2}
              aria-label="Proposta do vídeo"
              placeholder="Em uma frase: o que quem assistir vai levar deste vídeo"
              className="w-full resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 t-body text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)]"
            />
            <TextCount value={proposta} limit={PROPOSTA_MAX} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
