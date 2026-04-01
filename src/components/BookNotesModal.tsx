import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Plus,
  Trash2,
  Lightbulb,
  CheckCircle2,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Book, BookAnnotation, TipoAnotacao } from '../types';
import { generateUUID } from '../utils/uuid';
import { cn } from '../lib/utils';
import { BottomSheetModal } from './BottomSheetModal';

interface BookNotesModalProps {
  book: Book;
  onClose: () => void;
}

const TIPO_CORES: Record<TipoAnotacao, string> = {
  Trecho: 'bg-blue-100 text-blue-700',
  Reação: 'bg-pink-100 text-pink-700',
  Análise: 'bg-purple-100 text-purple-700',
  'Ideia de conteúdo': 'bg-green-100 text-green-700',
  Pergunta: 'bg-orange-100 text-orange-700',
};

const TIPOS: TipoAnotacao[] = ['Trecho', 'Reação', 'Análise', 'Ideia de conteúdo', 'Pergunta'];

export function BookNotesModal({ book, onClose }: BookNotesModalProps) {
  const { state, dispatch } = useAppContext();
  const [filtroTipo, setFiltroTipo] = useState<TipoAnotacao | 'Todos'>('Todos');
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoAnotacao>('Reação');
  const [novoCapitulo, setNovoCapitulo] = useState('');

  const anotacoesFiltradas = book.anotacoes
    .filter(a => filtroTipo === 'Todos' || a.tipo === filtroTipo)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAddAnotacao = () => {
    if (!novaAnotacao.trim()) return;
    const anotacao: BookAnnotation = {
      id: generateUUID(),
      livroId: book.id,
      texto: novaAnotacao.trim(),
      tipo: novoTipo,
      capituloRef: novoCapitulo.trim() || undefined,
      destilada: false,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_ANNOTATION', payload: anotacao });
    setNovaAnotacao('');
    setNovoCapitulo('');
  };

  const handleTransformarEmIdeia = (anotacao: BookAnnotation) => {
    const ideia = {
      id: generateUUID(),
      text: anotacao.texto,
      createdAt: new Date().toISOString(),
      livroOrigemId: book.id,
      archived: false,
    };
    dispatch({ type: 'ADD_IDEA', payload: ideia });
    dispatch({ type: 'DISTILL_ANNOTATION', payload: { livroId: book.id, annotationId: anotacao.id } });
  };

  const handleDeleteAnotacao = (anotacaoId: string) => {
    dispatch({ type: 'DELETE_ANNOTATION', payload: { livroId: book.id, annotationId: anotacaoId } });
  };

  return (
    <BottomSheetModal open={true} onClose={onClose} desktopMaxW="max-w-4xl" zIndex="z-[100]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-8 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-16 bg-[var(--bg-hover)] rounded-lg overflow-hidden shrink-0 border border-[var(--border-strong)]">
              {book.capaUrl ? (
                <img src={book.capaUrl} alt={book.titulo} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-[var(--text-primary)] opacity-20" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-black text-[var(--text-primary)] line-clamp-1 italic">"{book.titulo}"</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-60 mt-0.5">Anotações e Insights</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-[var(--bg-hover)] rounded-full transition-all text-[var(--text-primary)] opacity-40 hover:opacity-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar" style={{ minHeight: 0 }}>
          {/* Form nova anotação */}
          <div className="bg-[var(--bg-primary)] rounded-3xl p-6 border-2 border-[var(--border-strong)] shadow-lg space-y-4 focus-within:border-[var(--accent-purple)] transition-all">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={novoTipo}
                onChange={e => setNovoTipo(e.target.value as TipoAnotacao)}
                className="w-full sm:w-auto text-[10px] font-black bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 text-[var(--text-primary)] uppercase tracking-widest cursor-pointer focus:ring-1 focus:ring-[var(--accent-purple)] shadow-sm"
              >
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
              <input
                type="text"
                value={novoCapitulo}
                onChange={e => setNovoCapitulo(e.target.value)}
                placeholder="Cap. / Página (opcional)"
                className="w-full sm:w-48 text-xs font-bold bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:opacity-40 focus:ring-1 focus:ring-[var(--accent-purple)] shadow-sm"
              />
            </div>
            <textarea
              value={novaAnotacao}
              onChange={e => setNovaAnotacao(e.target.value)}
              placeholder="O que você acabou de ler ou pensou?"
              rows={4}
              className="w-full text-base font-medium bg-transparent border-none focus:ring-0 p-0 resize-none text-[var(--text-primary)] placeholder:opacity-30 custom-scrollbar"
            />
            <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-30 italic">Pense, capture, extraia o valor.</span>
              <button
                onClick={handleAddAnotacao}
                disabled={!novaAnotacao.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" /> Adicionar Nota
              </button>
            </div>
          </div>

          {/* Filtros e Lista */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <div className="flex gap-2 flex-wrap">
                {(['Todos', ...TIPOS] as (TipoAnotacao | 'Todos')[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setFiltroTipo(t)}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-full border transition-all",
                      filtroTipo === t
                        ? "bg-[var(--text-primary)] text-[var(--bg-secondary)] border-[var(--text-primary)]"
                        : "bg-transparent text-[var(--text-primary)] border-[var(--border-strong)] opacity-40 hover:opacity-100"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-black text-[var(--text-tertiary)] opacity-40 uppercase tracking-widest">{anotacoesFiltradas.length} notas</span>
            </div>

            {anotacoesFiltradas.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-[var(--border-color)] rounded-[2rem] opacity-30">
                <MessageSquare className="w-12 h-12 text-[var(--text-primary)] mx-auto mb-4 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">Nenhuma anotação neste filtro</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {anotacoesFiltradas.map(a => (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "group relative p-6 rounded-3xl border transition-all h-fit",
                      a.destilada 
                        ? "bg-[var(--accent-green)]/5 border-[var(--accent-green)]/30" 
                        : "bg-[var(--bg-primary)] border-[var(--border-color)] hover:border-[var(--border-strong)] shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className={cn("text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full", TIPO_CORES[a.tipo])}>
                        {a.tipo}
                      </span>
                      {a.capituloRef && (
                        <span className="text-[9px] text-[var(--text-secondary)] opacity-50 font-black uppercase tracking-widest">
                          {a.capituloRef}
                        </span>
                      )}
                      {a.destilada && (
                        <div className="ml-auto flex items-center gap-1 text-[8px] text-[var(--accent-green)] font-black uppercase tracking-widest">
                          <CheckCircle2 className="w-3 h-3" /> EXTRAÍDO
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed italic">"{a.texto}"</p>
                    
                    <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {!a.destilada && (
                        <button
                          onClick={() => handleTransformarEmIdeia(a)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[var(--accent-green)]/20 transition-all"
                        >
                          <Lightbulb className="w-3 h-3" /> Transformar em Ideia
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAnotacao(a.id)}
                        className="p-1.5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-[var(--bg-hover)] border-t border-[var(--border-color)] text-center shrink-0 pb-safe">
           <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] opacity-30 italic">As notas são as sementes do seu ecossistema de conteúdo.</p>
        </div>
    </BottomSheetModal>
  );
}
