import { useState } from 'react';
import { X, Plus, MessageSquare } from 'lucide-react';
import { AnnotationNoteCard } from '../AnnotationNoteCard';
import { useAppContext } from '../../../../context/AppContext';
import { BibliotecaItem, Anotacao } from '../../../../lib/database';
import { generateUUID } from '../../../../utils/uuid';
import { buildIdeaFields, parseLegacyIdeaText } from '../../../ideas/lib/ideaText';
import { createIdeaContent } from '../../../contents/lib/creationContent';
import { cn } from '../../../../lib/utils';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';

type TipoAnotacao = Anotacao['tipo'];

interface BookNotesModalProps {
  book: BibliotecaItem;
  onClose: () => void;
}

const TIPOS: TipoAnotacao[] = ['Anotação', 'Trecho', 'Reação', 'Análise', 'Ideia de conteúdo', 'Pergunta'];

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function BookNotesModal({ book, onClose }: BookNotesModalProps) {
  const { dispatch } = useAppContext();
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos');
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoAnotacao>('Anotação');
  const [novoCapitulo, setNovoCapitulo] = useState('');

  const anotacoesFiltradas = (book.anotacoes || [])
    .filter(anotacao => filtroTipo === 'Todos' || anotacao.tipo === filtroTipo)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAddAnotacao = () => {
    if (!novaAnotacao.trim()) return;

    const anotacao: Anotacao = {
      id: generateUUID(),
      userId: '',
      itemId: book.id,
      texto: novaAnotacao.trim(),
      tipo: novoTipo,
      capituloRef: novoCapitulo.trim() || null,
      contentPotential: false,
      deletedAt: null,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_ANOTACAO', payload: { itemId: book.id, anotacao } });
    setNovaAnotacao('');
    setNovoCapitulo('');
  };

  const handleTransformarEmIdeia = (anotacao: Anotacao) => {
    const parsed = parseLegacyIdeaText(anotacao.texto);
    const fields = buildIdeaFields({
      title: parsed.title || anotacao.texto.slice(0, 60),
      notes: parsed.notes,
    });

    dispatch({
      type: 'ADD_CONTENT',
      payload: createIdeaContent({
        title: fields.title || 'Ideia sem título',
        notes: fields.notes || null,
        bibliotecaItemId: book.id,
      }),
    });

    dispatch({
      type: 'UPDATE_ANOTACAO',
      payload: { itemId: book.id, anotacao: { ...anotacao, contentPotential: true } },
    });
  };

  const handleDeleteAnotacao = (anotacaoId: string) => {
    dispatch({ type: 'DELETE_ANOTACAO', payload: { itemId: book.id, anotacaoId } });
  };

  return (
    <BottomSheetModal open={true} onClose={onClose} desktopMaxW="max-w-4xl" zIndex="z-[100]">
      <div className="shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 md:px-8 md:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-1 text-xs font-semibold text-[var(--text-secondary)] opacity-65">
              {book.titulo}
            </p>
            <p className="mt-0.5 text-xs font-semibold  text-[var(--text-tertiary)] opacity-50">
              Notas
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--text-primary)] opacity-40 transition-all hover:bg-[var(--bg-hover)] hover:opacity-100"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-8" style={{ minHeight: 0 }}>
        <div className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={novoTipo}
              onChange={event => setNovoTipo(event.target.value as TipoAnotacao)}
              className="w-full cursor-pointer rounded-xl border-none bg-[var(--bg-hover)] px-3 py-2.5 text-xs font-semibold  text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-purple)] sm:w-auto"
            >
              {TIPOS.map(tipo => <option key={tipo}>{tipo}</option>)}
            </select>

            <input
              type="text"
              value={novoCapitulo}
              onChange={event => setNovoCapitulo(event.target.value)}
              placeholder="Cap. / página"
              className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-3 py-2.5 text-xs font-bold text-[var(--text-primary)] placeholder:opacity-40 focus:ring-1 focus:ring-[var(--accent-purple)] sm:w-40"
            />
          </div>

          <textarea
            value={novaAnotacao}
            onChange={event => setNovaAnotacao(event.target.value)}
            placeholder="Escreva uma nova nota..."
            rows={4}
            className="custom-scrollbar mt-4 w-full resize-none border-none bg-transparent p-0 text-sm leading-6 text-[var(--text-primary)] placeholder:opacity-30 focus:ring-0"
          />

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border-color)] pt-3">
            <span className="t-label t-label-uppercase font-semibold text-[var(--text-tertiary)] opacity-45">
              Nova nota
            </span>

            <button
              onClick={handleAddAnotacao}
              disabled={!novaAnotacao.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--text-primary)] px-4 py-2.5 text-xs font-semibold  text-[var(--bg-primary)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30"
            >
              <Plus className="h-3 w-3" />
              Adicionar
            </button>
          </div>
        </div>

        <div className="mt-4 stack-lg">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="t-label t-label-uppercase font-semibold text-[var(--text-tertiary)] opacity-55">
                Filtros
              </span>
              <span className="t-label t-label-uppercase font-semibold text-[var(--text-tertiary)] opacity-55">
                {anotacoesFiltradas.length} {anotacoesFiltradas.length === 1 ? 'nota' : 'notas'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['Todos', ...TIPOS] as string[]).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 t-label t-label-uppercase font-semibold transition-all',
                    filtroTipo === tipo
                      ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-secondary)]'
                      : 'border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] opacity-55 hover:opacity-100'
                  )}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {anotacoesFiltradas.length === 0 ? (
            <div className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] py-16 text-center opacity-35">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-[var(--text-primary)] opacity-20" />
              <p className="text-xs font-semibold ">
                Nenhuma anotação neste filtro
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {anotacoesFiltradas.map(anotacao => (
                <AnnotationNoteCard
                  key={anotacao.id}
                  anotacao={anotacao}
                  showHighlight={false}
                  showTransformContent={false}
                  onTransformIdea={
                    anotacao.contentPotential ? undefined : () => handleTransformarEmIdeia(anotacao)
                  }
                  onDelete={() => handleDeleteAnotacao(anotacao.id)}
                  footer={
                    <div className="mt-2 flex items-center justify-end border-t border-[var(--border-color)] pt-2">
                      <span className="text-xs font-medium text-[var(--text-tertiary)]">
                        {formatNoteDate(anotacao.createdAt)}
                      </span>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="h-3 shrink-0 pb-safe" />
    </BottomSheetModal>
  );
}
