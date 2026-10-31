import { TextCount } from '../../../../components/ui/TextCount';
import { useId, useRef, useState, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { useAppContext } from '../../../../context/AppContext';
import { useAuth } from '../../../../context/AuthContext';
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { Dialog } from '../../../../components/overlays/Dialog';
import { AppButton } from '../../../../components/ui/AppButton';
import { Surface } from '../../../../components/ui/Surface';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import type { Anotacao, BibliotecaItem } from '../../../../lib/database';
import { cn } from '../../../../lib/utils';
import { ANNOTATION_TYPES, createAnnotationDraft, persistAnnotationDraft, readAnnotationDraft, writeAnnotationDraft, type AnnotationDraft } from '../../lib/annotationDraft';
import { ANNOTATION_MAX_LENGTH, ENTER_HINT } from '../BookAnnotationCard';

type TipoAnotacao = Anotacao['tipo'];

interface BookAnnotationComposerProps {
  book: BibliotecaItem;
  referencePlaceholder?: string;
  framed?: boolean;
  onSubmitted?: () => void;
  /** Ao lado do título "Nova anotação" (no desktop, a busca das anotações). */
  headerAside?: ReactNode;
}

interface BookAnnotationComposerSheetProps {
  book: BibliotecaItem;
  open: boolean;
  onClose: () => void;
  referencePlaceholder?: string;
}

const fieldClass =
  'w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-elevated)] px-3 py-2.5 t-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

const labelClass = 't-secondary block text-[var(--text-primary)]';

export function BookAnnotationComposer(props: BookAnnotationComposerProps) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return <AnnotationComposerForm key={`${userId}:${props.book.id}`} {...props} userId={userId} />;
}

function AnnotationComposerForm({
  book,
  referencePlaceholder = 'Cap. / página',
  framed = true,
  onSubmitted,
  headerAside,
  userId,
}: BookAnnotationComposerProps & { userId: string | null }) {
  const { dispatch } = useAppContext();
  const isMobile = useIsMobile();
  const fieldId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(() => readAnnotationDraft(userId, book.id) ?? createAnnotationDraft());
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftStored, setDraftStored] = useState(() => Boolean(readAnnotationDraft(userId, book.id)));
  const { texto: novaAnotacao, tipo: novoTipo, capituloRef: novoCapitulo } = draft;

  const updateDraft = (changes: Partial<AnnotationDraft>) => {
    const next = { ...draft, ...changes };
    setDraft(next);
    // Grava no próprio evento: suspender/fechar o PWA não depende de um efeito posterior.
    setDraftStored(writeAnnotationDraft(userId, book.id, next));
  };

  const handleAddAnotacao = async () => {
    if (savingRef.current) return;
    // Sem texto, o botão leva ao campo em vez de ficar apagado.
    if (!novaAnotacao.trim()) {
      textareaRef.current?.focus({ preventScroll: true });
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await persistAnnotationDraft({
        userId,
        itemId: book.id,
        draft,
        save: anotacao => dispatch({ type: 'ADD_ANNOTATION', payload: anotacao }),
      });
      setDraft({ ...createAnnotationDraft(), tipo: draft.tipo });
      setDraftStored(false);
    } catch {
      setSaveError(userId
        ? 'Não foi possível salvar. Seu texto foi mantido. Verifique a conexão e tente novamente.'
        : 'Entre novamente na sua conta para salvar. Seu texto foi mantido.');
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    onSubmitted?.();
  };

  const form = (
    <div className="stack-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="sectionTitle">Nova anotação</Text>
        {headerAside}
      </div>

      <div className="stack-sm">
        <label htmlFor={`${fieldId}-tipo`} className={labelClass}>Categoria</label>
        <SelectField
          id={`${fieldId}-tipo`}
          ariaLabel="Categoria da anotação"
          value={novoTipo}
          disabled={saving}
          onChange={value => updateDraft({ tipo: value as TipoAnotacao })}
          options={ANNOTATION_TYPES.map(tipo => ({ value: tipo, label: tipo }))}
          block
        />
      </div>

      <div className="stack-sm">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`${fieldId}-ref`} className={labelClass}>Referência</label>
          <Text variant="meta">Opcional</Text>
        </div>
        <input
          id={`${fieldId}-ref`}
          type="text"
          value={novoCapitulo}
          disabled={saving}
          onChange={event => updateDraft({ capituloRef: event.target.value })}
          onKeyDown={event => {
            // Enter na referência também salva (sem texto, leva ao campo da anotação).
            if (event.key === 'Enter' && !isMobile && !event.nativeEvent.isComposing) {
              event.preventDefault();
              handleAddAnotacao();
            }
          }}
          placeholder={referencePlaceholder}
          className={fieldClass}
        />
      </div>

      <div className="stack-sm">
        <label htmlFor={`${fieldId}-texto`} className={labelClass}>Sua anotação</label>
        <textarea
          ref={textareaRef}
          id={`${fieldId}-texto`}
          value={novaAnotacao}
          disabled={saving}
          onChange={event => updateDraft({ texto: event.target.value })}
          placeholder="Escreva uma nova anotação…"
          rows={5}
          maxLength={ANNOTATION_MAX_LENGTH}
          aria-describedby={`${fieldId}-contador`}
          onKeyDown={event => {
            if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
            // No desktop, Enter salva e Shift+Enter quebra a linha; no celular, Enter só quebra a linha.
            if (event.metaKey || event.ctrlKey || (!isMobile && !event.shiftKey)) {
              event.preventDefault();
              handleAddAnotacao();
            }
          }}
          className={cn(fieldClass, 'min-h-32 resize-y leading-relaxed')}
        />
        <div className="flex items-baseline gap-3">
          {isMobile ? null : <Text variant="meta">{ENTER_HINT}</Text>}
          <TextCount id={`${fieldId}-contador`} value={novaAnotacao} limit={ANNOTATION_MAX_LENGTH} className="ml-auto" />
        </div>
      </div>

      {saveError ? <Text variant="secondary" role="alert" className="text-[var(--text-primary)]">{saveError}</Text> : null}
      {novaAnotacao || novoCapitulo ? (
        <Text variant="meta" role="status">
          {draftStored ? 'Rascunho guardado neste aparelho.' : 'Não foi possível guardar o rascunho neste aparelho. Mantenha esta tela aberta até salvar.'}
        </Text>
      ) : null}

      <AppButton
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={<Plus className="h-4 w-4" />}
        onClick={handleAddAnotacao}
        disabled={saving}
        aria-busy={saving}
      >
        {saving ? 'Salvando…' : saveError ? 'Tentar novamente' : 'Adicionar anotação'}
      </AppButton>
    </div>
  );

  if (!framed) return form;

  return (
    <Surface variant="outlined" padding="lg">
      {form}
    </Surface>
  );
}

export function BookAnnotationComposerSheet({
  book,
  open,
  onClose,
  referencePlaceholder,
}: BookAnnotationComposerSheetProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      desktopMaxW="max-w-md"
      ariaLabel="Nova anotação"
      fitVisualViewport
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-color)] px-1 pb-4">
          <div>
            <Text variant="itemTitle" as="p" className="text-[var(--text-primary)] opacity-45">{book.titulo}</Text>
            <Text variant="label" as="span" className="mt-1 block text-[var(--text-tertiary)]">
              Anotações
            </Text>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-primary)] opacity-35 transition-opacity hover:opacity-70"
            aria-label="Fechar nova anotação"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4">
          <BookAnnotationComposer
            key={book.id}
            book={book}
            framed={false}
            referencePlaceholder={referencePlaceholder}
            onSubmitted={onClose}
          />
        </div>
      </div>
    </Dialog>
  );
}
