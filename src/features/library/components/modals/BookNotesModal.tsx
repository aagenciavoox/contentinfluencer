import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, Lightbulb, MessageSquare, Star } from 'lucide-react';
import { useAppContext } from '../../../../context/AppContext';
import { BibliotecaItem, Anotacao } from '../../../../lib/database';
import { generateUUID } from '../../../../utils/uuid';
import { cn } from '../../../../lib/utils';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';

type TipoAnotacao = Anotacao['tipo'];

interface BookNotesModalProps {
  book: BibliotecaItem;
  onClose: () => void;
}

const TIPO_CORES: Record<string, string> = {
  'Anotação': 'bg-[rgba(148,163,184,0.14)] text-[rgb(100,116,139)]',
  Trecho: 'bg-[rgba(59,130,246,0.12)] text-[rgb(37,99,235)]',
  Reação: 'bg-[rgba(244,114,182,0.12)] text-[rgb(225,29,72)]',
  Análise: 'bg-[rgba(168,85,247,0.12)] text-[rgb(126,34,206)]',
  'Ideia de conteúdo': 'bg-[rgba(34,197,94,0.12)] text-[rgb(22,163,74)]',
  Pergunta: 'bg-[rgba(249,115,22,0.12)] text-[rgb(234,88,12)]',
};

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
    dispatch({
      type: 'ADD_IDEA',
      payload: {
        id: generateUUID(),
        userId: '',
        text: anotacao.texto,
        pilarId: null,
        seriesId: null,
        origemId: book.id,
        promotedToContentId: null,
        archived: false,
        createdAt: new Date().toISOString(),
      },
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
            <p className="line-clamp-1 text-[10px] font-semibold text-[var(--text-secondary)] opacity-65">
              {book.titulo}
            </p>
            <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)] opacity-50">
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
        <div className="rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={novoTipo}
              onChange={event => setNovoTipo(event.target.value as TipoAnotacao)}
              className="w-full cursor-pointer rounded-xl border-none bg-[var(--bg-hover)] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-purple)] sm:w-auto"
            >
              {TIPOS.map(tipo => <option key={tipo}>{tipo}</option>)}
            </select>

            <input
              type="text"
              value={novoCapitulo}
              onChange={event => setNovoCapitulo(event.target.value)}
              placeholder="Cap. / página"
              className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-3 py-2.5 text-[11px] font-bold text-[var(--text-primary)] placeholder:opacity-40 focus:ring-1 focus:ring-[var(--accent-purple)] sm:w-40"
            />
          </div>

          <textarea
            value={novaAnotacao}
            onChange={event => setNovaAnotacao(event.target.value)}
            placeholder="Escreva uma nova nota..."
            rows={4}
            className="custom-scrollbar mt-4 w-full resize-none border-none bg-transparent p-0 text-[14px] leading-6 text-[var(--text-primary)] placeholder:opacity-30 focus:ring-0"
          />

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border-color)] pt-3">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--text-tertiary)] opacity-45">
              Nova nota
            </span>

            <button
              onClick={handleAddAnotacao}
              disabled={!novaAnotacao.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--text-primary)] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--bg-primary)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30"
            >
              <Plus className="h-3 w-3" />
              Adicionar
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] opacity-55">
                Filtros
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] opacity-55">
                {anotacoesFiltradas.length} {anotacoesFiltradas.length === 1 ? 'nota' : 'notas'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['Todos', ...TIPOS] as string[]).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] transition-all',
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
            <div className="rounded-[24px] border border-dashed border-[var(--border-color)] py-16 text-center opacity-35">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-[var(--text-primary)] opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Nenhuma anotação neste filtro
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {anotacoesFiltradas.map(anotacao => (
                <motion.div
                  key={anotacao.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)]"
                >
                  <div className="flex items-start justify-between gap-3 px-4 pt-4">
                    <div className="min-w-0 flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em]',
                          TIPO_CORES[anotacao.tipo] || TIPO_CORES['Anotação']
                        )}
                      >
                        {anotacao.tipo}
                      </span>

                      {anotacao.capituloRef && (
                        <span className="truncate text-[10px] font-bold text-[var(--text-secondary)] opacity-60">
                          {anotacao.capituloRef}
                        </span>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {anotacao.contentPotential && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-amber-700">
                          <Star className="h-3 w-3 fill-current" />
                          Destaque
                        </span>
                      )}

                      {!anotacao.contentPotential && (
                        <button
                          onClick={() => handleTransformarEmIdeia(anotacao)}
                          className="rounded-full p-2 text-[var(--accent-green)] transition-all hover:bg-[var(--accent-green)]/10"
                          aria-label="Transformar em ideia"
                        >
                          <Lightbulb className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteAnotacao(anotacao.id)}
                        className="rounded-full p-2 text-[var(--accent-pink)]/60 transition-all hover:bg-[var(--accent-pink)]/10 hover:text-[var(--accent-pink)]"
                        aria-label="Excluir nota"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-3">
                    <p className="text-[14px] leading-6 text-[var(--text-primary)]">
                    {anotacao.texto}
                    </p>

                    <div className="mt-3 flex items-center justify-end border-t border-[var(--border-color)] pt-2">
                      <span className="text-[10px] font-bold text-[var(--text-tertiary)] opacity-60">
                        {formatNoteDate(anotacao.createdAt)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="h-3 shrink-0 pb-safe" />
    </BottomSheetModal>
  );
}
