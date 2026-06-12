import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAppContext } from '../../../../context/AppContext';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';
import type { Anotacao, BibliotecaItem } from '../../../../lib/database';
import { generateUUID } from '../../../../utils/uuid';

type TipoAnotacao = Anotacao['tipo'];

interface BookAnnotationComposerSheetProps {
  book: BibliotecaItem;
  open: boolean;
  onClose: () => void;
}

const TIPOS: TipoAnotacao[] = ['Anotação', 'Trecho', 'Reação', 'Análise', 'Ideia de conteúdo', 'Pergunta'];

export function BookAnnotationComposerSheet({
  book,
  open,
  onClose,
}: BookAnnotationComposerSheetProps) {
  const { dispatch } = useAppContext();
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoAnotacao>('Anotação');
  const [novoCapitulo, setNovoCapitulo] = useState('');

  const handleClose = () => {
    setNovaAnotacao('');
    setNovoCapitulo('');
    setNovoTipo('Anotação');
    onClose();
  };

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
    handleClose();
  };

  return (
    <BottomSheetModal
      open={open}
      onClose={handleClose}
      desktopMaxW="max-w-md"
    >
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] px-1 pb-4">
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)] opacity-45">{book.titulo}</p>
            <span className="mt-1 block text-xs font-semibold  text-[var(--text-tertiary)]">
              Notas
            </span>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-[var(--text-primary)] opacity-35 transition-opacity hover:opacity-70"
            aria-label="Fechar nova anotação"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <div className="space-y-4">
            <select
              value={novoTipo}
              onChange={event => setNovoTipo(event.target.value as TipoAnotacao)}
              className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 py-4 text-[12px] font-semibold  text-[var(--text-primary)]"
            >
              {TIPOS.map(tipo => <option key={tipo}>{tipo}</option>)}
            </select>

            <input
              type="text"
              value={novoCapitulo}
              onChange={event => setNovoCapitulo(event.target.value)}
              placeholder="Cap. / página"
              className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 py-4 text-sm text-[var(--text-primary)] placeholder:opacity-35"
            />

            <textarea
              value={novaAnotacao}
              onChange={event => setNovaAnotacao(event.target.value)}
              placeholder="Escreva uma nova nota..."
              rows={5}
              onKeyDown={event => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  handleAddAnotacao();
                }
              }}
              className="w-full resize-none rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 py-4 text-sm leading-6 text-[var(--text-primary)] placeholder:opacity-35 focus:ring-0"
            />
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-[var(--border-color)] px-1 pt-4">
            <span className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-45">
              Nova nota
            </span>
            <button
              onClick={handleAddAnotacao}
              disabled={!novaAnotacao.trim()}
              className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--text-primary)] px-5 py-3 text-xs font-semibold  text-[var(--bg-primary)] transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </span>
            </button>
          </div>
        </div>
      </div>
    </BottomSheetModal>
  );
}
