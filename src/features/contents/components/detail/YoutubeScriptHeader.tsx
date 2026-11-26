import {useId, useState, type ReactNode} from 'react';
import {ChevronRight, Play} from 'lucide-react';
import {Surface} from '../../../../components/ui/Surface';
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
  /** Seletor de visão (Texto | Colunas) exibido no canto superior direito durante a escrita. */
  viewSelector?: ReactNode;
  /** Chips de assunto/tema exibidos na faixa de contexto junto à proposta. */
  temaChips?: ReactNode;
}

/** Topo unificado do modo YouTube: título do vídeo, seletor Texto/Colunas, proposta expansível e temas. */
export function YoutubeScriptHeader({
  contentId,
  title,
  onTitleChange,
  onTitleEnter,
  proposta,
  onPropostaChange,
  viewSelector,
  temaChips,
}: YoutubeScriptHeaderProps) {
  const fieldId = useId();
  const titleId = useId();
  // Fechada, a proposta cabe numa linha (ou mostra a dica de escrever uma).
  const [openChoice, setOpenChoice] = useState<{contentId: string; open: boolean} | null>(null);
  const open = openChoice?.contentId === contentId ? openChoice.open : false;
  const setOpen = (next: boolean) => setOpenChoice({contentId, open: next});

  return (
    <Surface
      variant="outlined"
      padding="md"
      className="w-full stack-md bg-[var(--bg-elevated)]"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 stack-xs">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-5 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--platform-youtube)]"
            >
              <Play className="h-2.5 w-2.5 fill-current text-[var(--brand-on-accent)]" />
            </span>
            <label htmlFor={titleId}>
              <Text variant="eyebrow" as="span" className="text-[var(--text-tertiary)]">
                Título do vídeo
              </Text>
            </label>
          </div>

          <input
            id={titleId}
            type="text"
            value={title === 'Novo roteiro' ? '' : title}
            onChange={event => onTitleChange(event.target.value)}
            onKeyDown={event => {
              if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
              event.preventDefault();
              onTitleEnter();
            }}
            placeholder="Sem título"
            autoComplete="off"
            className="w-full min-w-0 rounded-none border-0 bg-transparent py-0.5 t-item-title text-[length:var(--font-size-page-title-desktop)] leading-snug tracking-tight text-[var(--text-primary)] shadow-none outline-none placeholder:text-[var(--text-tertiary)] focus:border-0 focus:shadow-none"
          />
        </div>

        {viewSelector ? (
          <div className="shrink-0 self-start">
            {viewSelector}
          </div>
        ) : null}
      </div>

      {/* Faixa de Proposta + Chips de Tema */}
      <div className="rounded-[var(--radius-input)] bg-[var(--bg-primary)] px-3 py-2 stack-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={fieldId}
            onClick={() => setOpen(!open)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-sm)] py-0.5 text-left transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform',
                open && 'rotate-90',
              )}
              aria-hidden
            />
            <Text as="span" variant="label" className="shrink-0 text-[var(--text-primary)]">
              Proposta:
            </Text>
            {!open ? (
              <Text as="span" variant="meta" className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
                {proposta.trim() || 'Em uma frase: o que quem assistir vai levar deste vídeo'}
              </Text>
            ) : null}
          </button>

          {temaChips ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {temaChips}
            </div>
          ) : null}
        </div>

        {open ? (
          <div id={fieldId} className="stack-xs pt-1">
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
    </Surface>
  );
}
