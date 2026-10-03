import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAppContext } from '../../../../context/AppContext';
import { Dialog } from '../../../../components/overlays/Dialog';
import { AppButton } from '../../../../components/ui/AppButton';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import type { Anotacao, BibliotecaItem } from '../../../../lib/database';
import { cn } from '../../../../lib/utils';
import { generateUUID } from '../../../../utils/uuid';

type TipoAnotacao = Anotacao['tipo'];

interface BookAnnotationComposerProps {
  book: BibliotecaItem;
  referencePlaceholder?: string;
  framed?: boolean;
  onSubmitted?: () => void;
}

interface BookAnnotationComposerSheetProps {
  book: BibliotecaItem;
  open: boolean;
  onClose: () => void;
  referencePlaceholder?: string;
}

const TIPOS: TipoAnotacao[] = ['Anotação', 'Trecho', 'Reação', 'Análise', 'Ideia de conteúdo', 'Pergunta'];

const fieldClass =
  'w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

export function BookAnnotationComposer({
  book,
  referencePlaceholder = 'Cap. / página',
  framed = true,
  onSubmitted,
}: BookAnnotationComposerProps) {
  const { dispatch } = useAppContext();
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoAnotacao>('Anotação');
  const [novoCapitulo, setNovoCapitulo] = useState('');

  const handleAddAnotacao = () => {
    if (!novaAnotacao.trim()) return;

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
    <>
      <Text variant="label" uppercase className="mb-3 block font-semibold">
        Nova nota
      </Text>
      <div className="flex flex-col gap-3 lg:flex-row">
        <select
          value={novoTipo}
          onChange={event => setNovoTipo(event.target.value as TipoAnotacao)}
          className={cn(fieldClass, 'lg:w-52')}
          aria-label="Tipo da nota"
        >
          {TIPOS.map(tipo => <option key={tipo}>{tipo}</option>)}
        </select>
        <input
          type="text"
          value={novoCapitulo}
          onChange={event => setNovoCapitulo(event.target.value)}
          placeholder={referencePlaceholder}
          aria-label="Referência"
          className={cn(fieldClass, 'lg:w-64')}
        />
      </div>
      <textarea
        value={novaAnotacao}
        onChange={event => setNovaAnotacao(event.target.value)}
        placeholder="Escreva uma nova nota..."
        rows={4}
        onKeyDown={event => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            handleAddAnotacao();
          }
        }}
        className={cn(fieldClass, 'mt-3 min-h-28 resize-y leading-6')}
      />
      <div className="mt-3 flex justify-end">
        <AppButton
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={handleAddAnotacao}
          disabled={!novaAnotacao.trim()}
        >
          Adicionar
        </AppButton>
      </div>
    </>
  );

  if (!framed) return form;

  return (
    <Surface variant="outlined" padding="md" className="bg-[var(--bg-primary)]">
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
              Notas
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
