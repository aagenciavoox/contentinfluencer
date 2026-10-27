import { useId, useRef, useState, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { useAppContext } from '../../../../context/AppContext';
import { Dialog } from '../../../../components/overlays/Dialog';
import { AppButton } from '../../../../components/ui/AppButton';
import { Surface } from '../../../../components/ui/Surface';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import type { Anotacao, BibliotecaItem } from '../../../../lib/database';
import { cn } from '../../../../lib/utils';
import { generateUUID } from '../../../../utils/uuid';
import { ANNOTATION_MAX_LENGTH } from '../BookAnnotationCard';

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

const TIPOS: TipoAnotacao[] = ['Anotação', 'Trecho', 'Reação', 'Análise', 'Ideia de conteúdo', 'Pergunta'];

const fieldClass =
  'w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-elevated)] px-3 py-2.5 t-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

const labelClass = 't-secondary block font-semibold text-[var(--text-primary)]';

export function BookAnnotationComposer({
  book,
  referencePlaceholder = 'Cap. / página',
  framed = true,
  onSubmitted,
  headerAside,
}: BookAnnotationComposerProps) {
  const { dispatch } = useAppContext();
  const fieldId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoAnotacao>('Anotação');
  const [novoCapitulo, setNovoCapitulo] = useState('');

  const handleAddAnotacao = () => {
    // Sem texto, o botão leva ao campo em vez de ficar apagado.
    if (!novaAnotacao.trim()) {
      textareaRef.current?.focus();
      return;
    }

    const anotacao: Anotacao = {
      id: generateUUID(),
      userId: '',
      itemId: book.id,
      texto: novaAnotacao.trim(),
      tipo: novoTipo,
      capituloRef: novoCapitulo.trim() || null,
      destilada: false,
      contentPotential: false,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };

    dispatch({ type: 'ADD_ANNOTATION', payload: anotacao });
    setNovaAnotacao('');
    setNovoCapitulo('');
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
          onChange={value => setNovoTipo(value as TipoAnotacao)}
          options={TIPOS.map(tipo => ({ value: tipo, label: tipo }))}
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
          onChange={event => setNovoCapitulo(event.target.value)}
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
          onChange={event => setNovaAnotacao(event.target.value)}
          placeholder="Escreva uma nova anotação…"
          rows={5}
          maxLength={ANNOTATION_MAX_LENGTH}
          aria-describedby={`${fieldId}-contador`}
          onKeyDown={event => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              handleAddAnotacao();
            }
          }}
          className={cn(fieldClass, 'min-h-32 resize-y leading-relaxed')}
        />
        <Text variant="meta" as="p" className="text-right tabular-nums">
          <span id={`${fieldId}-contador`}>{novaAnotacao.length}/{ANNOTATION_MAX_LENGTH}</span>
        </Text>
      </div>

      <AppButton
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={<Plus className="h-4 w-4" />}
        onClick={handleAddAnotacao}
      >
        Adicionar anotação
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
    >
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] px-1 pb-4">
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)] opacity-45">{book.titulo}</p>
            <span className="mt-1 block text-xs font-semibold text-[var(--text-tertiary)]">
              Anotações
            </span>
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

        <div className="mt-5">
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
