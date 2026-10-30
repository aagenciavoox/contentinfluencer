import { Text } from '../../../components/ui/Text';
import { useState } from 'react';
import { CheckCircle2, MoreVertical, Pencil, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { AppButton } from '../../../components/ui/AppButton';
import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import type { Anotacao } from '../../../lib/database';
import { dia, hora } from '../../../lib/dates';
import { cn } from '../../../lib/utils';

export const ANNOTATION_MAX_LENGTH = 2000;

/** Dica dos campos de anotação no desktop, onde Enter salva. */
export const ENTER_HINT = 'Enter salva · Shift+Enter quebra a linha';

const TIPO_CORES: Record<string, string> = {
  'Anotação': 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
  Trecho: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
  'Reação': 'bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]',
  'Análise': 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]',
  'Ideia de conteúdo': 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
  Pergunta: 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]',
};

const ICON_BUTTON =
  'inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:h-11 pointer-coarse:w-11';

function formatAnnotationDate(iso: string) {
  if (Number.isNaN(new Date(iso).getTime())) return null;
  return `${dia(iso)} às ${hora(iso)}`;
}

interface BookAnnotationCardProps {
  anotacao: Anotacao;
  onToggleHighlight: () => void;
  onSaveText: (texto: string) => void;
  onTransformIdea: () => void;
  onTransformContent: () => void;
  onDelete: () => void;
}

/** Anotação na aba Anotações do item no desktop: tipo, texto, data e as ações sempre à vista. */
export function BookAnnotationCard({
  anotacao,
  onToggleHighlight,
  onSaveText,
  onTransformIdea,
  onTransformContent,
  onDelete,
}: BookAnnotationCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(anotacao.texto);
  const tipoClass = TIPO_CORES[anotacao.tipo] || TIPO_CORES['Anotação'];
  const dateLabel = formatAnnotationDate(anotacao.createdAt);

  const startEditing = () => {
    setDraft(anotacao.texto);
    setEditing(true);
  };

  const saveEditing = () => {
    const texto = draft.trim();
    if (!texto) return;
    if (texto !== anotacao.texto) onSaveText(texto);
    setEditing(false);
  };

  const menuItems: MoreMenuItem[] = [
    ...(!anotacao.destilada ? [{ id: 'idea', label: 'Transformar em ideia', onClick: onTransformIdea }] : []),
    { id: 'content', label: 'Criar roteiro', onClick: onTransformContent },
    { id: 'delete', label: 'Excluir', tone: 'danger', onClick: onDelete },
  ];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Text variant="label" as="span" className={cn('rounded-[var(--radius-pill)] px-3 py-1 t-label-uppercase', tipoClass)}>
            {anotacao.tipo}
          </Text>
          {anotacao.capituloRef ? (
            <Text variant="secondary" as="span" className="text-[var(--text-secondary)]">{anotacao.capituloRef}</Text>
          ) : null}
          {anotacao.destilada ? (
            <Text variant="secondary" as="span" className="inline-flex items-center gap-1 text-[var(--accent-green)]">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Destilada
            </Text>
          ) : null}
        </div>

        <div className="-mr-2 -mt-1 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleHighlight}
            title={anotacao.contentPotential ? 'Remover destaque' : 'Destacar'}
            aria-label={anotacao.contentPotential ? 'Remover destaque' : 'Destacar anotação'}
            aria-pressed={anotacao.contentPotential}
            className={cn(
              ICON_BUTTON,
              anotacao.contentPotential ? 'text-[var(--accent-orange)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            <Star className={cn('h-[18px] w-[18px]', anotacao.contentPotential && 'fill-current')} />
          </button>
          <button
            type="button"
            onClick={startEditing}
            title="Editar"
            aria-label="Editar anotação"
            disabled={editing}
            className={cn(ICON_BUTTON, 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-45')}
          >
            <Pencil className="h-[18px] w-[18px]" />
          </button>
          <MoreMenu
            items={menuItems}
            label="Mais ações da anotação"
            size="sm"
            triggerClassName="h-9 w-9"
            trigger={<MoreVertical className="h-[18px] w-[18px]" />}
          />
        </div>
      </div>

      {editing ? (
        <div className="mt-3 stack-sm">
          <textarea
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Escape') setEditing(false);
              // Enter salva; Shift+Enter quebra a linha.
              if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              saveEditing();
            }}
            maxLength={Math.max(ANNOTATION_MAX_LENGTH, anotacao.texto.length)}
            rows={4}
            autoFocus
            aria-label="Texto da anotação"
            className="w-full resize-y rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 py-2.5 t-body leading-relaxed text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="secondary" as="span" className="mr-auto text-[var(--text-tertiary)]">{ENTER_HINT}</Text>
            <AppButton variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </AppButton>
            <AppButton variant="primary" size="sm" onClick={saveEditing} disabled={!draft.trim()}>
              Salvar
            </AppButton>
          </div>
        </div>
      ) : (
        <Text variant="body" as="p" className="mt-3 max-w-[72ch] whitespace-pre-line leading-relaxed text-[var(--text-primary)]">
          {anotacao.texto}
        </Text>
      )}

      {dateLabel ? (
        <Text variant="secondary" as="p" className="mt-3 text-[var(--text-tertiary)]">
          <time dateTime={anotacao.createdAt}>{dateLabel}</time>
        </Text>
      ) : null}
    </motion.article>
  );
}
