import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, isAfter, isBefore, isToday, startOfToday, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Zap, 
  Calendar as CalendarIcon, 
  AlertCircle, 
  Plus, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  LayoutDashboard,
  ArrowRight,
  TrendingUp,
  FileText,
  Lightbulb
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { STATUS_STAGES } from '../constants';
import { generateUUID } from '../utils/uuid';
import { BookAnnotation, Idea, Book } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { BookNotesModal } from '../components/BookNotesModal';
import { PageGuide } from '../components/PageGuide';

export function Dashboard() {
  const { state, dispatch } = useAppContext();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // Quick Capture State
  const [quickInput, setQuickInput] = useState('');
  const [captureType, setCaptureType] = useState<'idea' | 'annotation'>('idea');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Book Modal State
  const [viewingNotesBook, setViewingNotesBook] = useState<Book | null>(null);

  // Current Week Interval
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  // Filter books being read
  const currentBooks = state.books.filter(b => b.statusLeitura === 'Lendo');

  // KPIs
  const weeklyKpis = useMemo(() => {
    const newIdeas = state.ideas.filter(i => 
      isWithinInterval(new Date(i.createdAt), { start: weekStart, end: weekEnd })
    ).length;

    const editedPieces = state.contents.filter(c => 
      ['Editado', 'Programado', 'Postado'].includes(c.status) && 
      isWithinInterval(new Date(c.createdAt), { start: weekStart, end: weekEnd })
    ).length;

    const scheduledPieces = state.contents.filter(c => 
      c.status === 'Programado' || (c.publishDate && isAfter(new Date(c.publishDate), today))
    ).length;

    return { newIdeas, editedPieces, scheduledPieces };
  }, [state.ideas, state.contents, weekStart, weekEnd, today]);

  const metaSemanal = state.pilares
    .filter(p => p.ativo)
    .reduce((acc, p) => acc + (p.metaSemanalMin || 0), 0);

  const upcomingAgenda = state.agenda
    .filter(item => !isBefore(new Date(item.date + 'T12:00:00'), startOfToday()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const currentEnergy = state.energyLogs.find(l => l.date === todayStr)?.level || 0;

  const handleQuickCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    if (captureType === 'idea') {
      const newIdea: Idea = {
        id: generateUUID(),
        text: quickInput,
        createdAt: new Date().toISOString(),
        archived: false,
      };
      dispatch({ type: 'ADD_IDEA', payload: newIdea });
    } else {
      if (!selectedBookId) return;
      const newAnnotation: BookAnnotation = {
        id: generateUUID(),
        livroId: selectedBookId,
        texto: quickInput,
        tipo: 'Reação', // Default
        destilada: false,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_ANNOTATION', payload: newAnnotation });
    }

    setQuickInput('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2000);
  };

  const handleEnergyLog = (level: number) => {
    dispatch({ type: 'LOG_ENERGY', payload: { date: todayStr, level } });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 md:py-12 px-6 md:px-10 space-y-8 md:space-y-12">
      <PageGuide 
        pageId="dashboard"
        title="Command Center"
        description="Esta é sua visão geral. Use o 'Quick Capture' para salvar ideias e notas de livros sem sair da tela. Acompanhe suas metas semanais e o progresso da sua leitura atual."
        icon={LayoutDashboard}
      />
      {/* ── HEADER OPERACIONAL ────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight italic">
            Command Center
          </h1>
          <p className="text-[var(--text-secondary)] text-sm font-medium opacity-60 uppercase tracking-widest">
            {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Mini Energy Log (Compacto) */}
        <div className="flex items-center gap-3 bg-[var(--bg-secondary)] p-3 rounded-2xl border border-[var(--border-color)]">
          <Zap className={cn("w-4 h-4", currentEnergy > 0 ? "text-[var(--accent-orange)]" : "opacity-30")} />
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => handleEnergyLog(level)}
                className={cn(
                  "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                  currentEnergy === level 
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-lg scale-110' 
                    : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:bg-[var(--border-strong)]'
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── QUICK CAPTURE (O FOCO OPERACIONAL) ──────────────────────────────── */}
      <section className="relative mb-8">
        <div className="flex items-center gap-4 md:gap-8 mb-4 px-4 overflow-x-auto no-scrollbar flex-nowrap whitespace-nowrap">
          <button 
            type="button"
            onClick={() => setCaptureType('idea')}
            className={cn(
              "text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] pb-2 transition-all border-b-2 shrink-0", 
              captureType === 'idea' ? "border-[var(--text-primary)] text-[var(--text-primary)]" : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] opacity-60"
            )}
          >
            Caixa de Ideias
          </button>
          <button 
            type="button"
            onClick={() => setCaptureType('annotation')}
            className={cn(
              "text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] pb-2 transition-all border-b-2 shrink-0", 
              captureType === 'annotation' ? "border-[var(--text-primary)] text-[var(--text-primary)]" : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] opacity-60"
            )}
          >
            Anotação de Livro
          </button>
        </div>

        <form 
          onSubmit={handleQuickCapture}
          className="bg-[var(--bg-secondary)] border-2 border-[var(--border-strong)] rounded-3xl p-6 shadow-xl focus-within:border-[var(--accent-blue)] transition-all group relative"
        >
          <div className="flex flex-col gap-4">
            <textarea 
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder={captureType === 'idea' ? "Escreva sua ideia aqui..." : "Destaque ou reação do livro..."}
              className="w-full bg-transparent border-none focus:ring-0 text-base md:text-lg font-medium text-[var(--text-primary)] placeholder:opacity-30 px-2 min-h-[100px] resize-none custom-scrollbar"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleQuickCapture(e);
                }
              }}
            />
            
            <AnimatePresence>
              {isSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-6 top-6 flex items-center gap-2 text-[var(--accent-green)] font-black text-[10px] uppercase tracking-widest"
                >
                  <CheckCircle2 className="w-4 h-4" /> SALVO
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-[var(--border-color)] pt-5 px-1 gap-5">
              {captureType === 'annotation' ? (
                currentBooks.length > 0 ? (
                  <div className="flex-1 w-full">
                    <select
                      value={selectedBookId}
                      onChange={(e) => setSelectedBookId(e.target.value)}
                      className="w-full bg-[var(--bg-hover)] border-none rounded-xl text-[10px] font-black uppercase tracking-widest px-4 py-3 text-[var(--text-primary)] cursor-pointer focus:ring-2 focus:ring-[var(--accent-blue)] shadow-sm"
                    >
                      <option value="">Selecione o Livro</option>
                      {currentBooks.map(b => (
                        <option key={b.id} value={b.id}>{b.titulo.length > 30 ? b.titulo.slice(0, 30) + '...' : b.titulo}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <Link to="/biblioteca" className="flex-1 text-[10px] font-bold text-[var(--text-tertiary)] italic opacity-60 hover:opacity-100 transition-all flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    Adicione um livro em leitura na Biblioteca
                  </Link>
                )
              ) : <div className="hidden sm:block flex-1" />}

              <button 
                type="submit"
                disabled={!quickInput.trim() || (captureType === 'annotation' && !selectedBookId)}
                className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-8 py-3.5 rounded-2xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 shadow-lg justify-center sm:w-auto w-full shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-widest">Enviar</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* ── LEFT COLUMN: FOCUS & STATS ──────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-8">
          {/* Micro KPIs */}
          <div className="grid grid-cols-1 gap-4">
            <div className="p-5 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] opacity-60 italic">Metas Semanais</span>
                <TrendingUp className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-secondary)]">Ideias</span>
                  <span className="text-xl font-black text-[var(--text-primary)]">{weeklyKpis.newIdeas}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Editados</span>
                    <span className="text-xl font-black text-[var(--accent-green)]">
                      {weeklyKpis.editedPieces}
                      {metaSemanal > 0 && <span className="text-[11px] font-bold opacity-40">/{metaSemanal}</span>}
                    </span>
                  </div>
                  {metaSemanal > 0 && (
                    <div className="h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-green)] transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round((weeklyKpis.editedPieces / metaSemanal) * 100))}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-secondary)]">Programados</span>
                  <span className="text-xl font-black text-[var(--accent-blue)]">{weeklyKpis.scheduledPieces}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current Reading Section */}
          <div className="p-6 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-sm overflow-hidden relative group">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="w-4 h-4 text-[var(--accent-purple)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Livro Atual</span>
            </div>
            
            {currentBooks.length > 0 ? (
              <div className="space-y-5">
                {currentBooks.map(book => (
                  <div 
                    key={book.id} 
                    onClick={() => setViewingNotesBook(book)}
                    className="block group/item cursor-pointer"
                  >
                    <div className="flex gap-4 items-start">
                      {book.capaUrl ? (
                        <img src={book.capaUrl} alt={book.titulo} className="w-16 aspect-[2/3] object-cover rounded-xl shadow-md group-hover/item:scale-105 transition-transform" />
                      ) : (
                        <div className="w-16 aspect-[2/3] bg-[var(--bg-hover)] rounded-xl flex items-center justify-center border border-[var(--border-strong)]">
                          <BookOpen className="w-6 h-6 opacity-10" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-[var(--text-primary)] leading-snug line-clamp-2 italic">"{book.titulo}"</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] opacity-60 mt-1 uppercase tracking-wider">{book.autor}</p>
                        {book.totalPaginas && book.totalPaginas > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent-purple)] transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.round(((book.paginasLidas || 0) / book.totalPaginas) * 100))}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-black opacity-30">
                            {Math.min(100, Math.round(((book.paginasLidas || 0) / book.totalPaginas) * 100))}%
                          </span>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Link to="/biblioteca" className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-[var(--border-color)] rounded-2xl opacity-40 hover:opacity-100 transition-all">
                <Plus className="w-6 h-6 mb-2" />
                <span className="text-[9px] font-black uppercase tracking-widest">Abrir Biblioteca</span>
              </Link>
            )}
            
            <Link to="/biblioteca" className="mt-6 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--accent-purple)] opacity-60 hover:opacity-100 transition-all border-t border-[var(--border-color)] pt-4">
              Gerenciar Biblioteca <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* ── RIGHT COLUMN: PIPELINE & AGENDA ──────────────────────────────── */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Active Pipeline (Operational Focus) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4 text-[var(--accent-blue)]" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Operação Conteúdo</h3>
              </div>
              <Link to="/contents" className="text-[9px] font-black uppercase tracking-widest text-[var(--accent-blue)] opacity-60 hover:opacity-100 flex items-center gap-1">
                Ver Tudo <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {STATUS_STAGES.filter(s => !['Postado', 'Ideia', 'Gravado'].includes(s)).map(status => {
                const count = state.contents.filter(c => c.status === status).length;
                return (
                  <div 
                    key={status}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all",
                      count > 0 ? "bg-[var(--bg-secondary)] border-[var(--border-color)] shadow-sm" : "bg-[var(--bg-hover)]/30 border-transparent opacity-40"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-1.5 h-1.5 rounded-full", count > 0 ? "bg-[var(--accent-blue)]" : "bg-[var(--text-tertiary)]")} />
                      <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">{status}</span>
                    </div>
                    <span className="text-lg font-black text-[var(--text-primary)]">{count}</span>
                  </div>
                );
              })}
            </div>
            
            {/* No Escuro Alert (Contextual) */}
            {state.contents.some(c => c.status === 'Pronto para Gravar' && (!c.recordingDate || !c.lookId)) && (
              <Link to="/contents?status=No+Escuro" className="block">
                <div className="p-4 bg-[var(--accent-orange)]/5 border border-[var(--accent-orange)]/20 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-[var(--accent-orange)]/10 transition-all">
                  <div className="flex items-center gap-3 text-[var(--accent-orange)]">
                    <AlertCircle className="w-4 h-4 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Pendências "No Escuro"</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--accent-orange)] group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}
          </section>

          {/* Upcoming Milestones */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-4 h-4 text-[var(--accent-orange)]" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Próximos Passos</h3>
              </div>
              <Link to="/calendar" className="text-[9px] font-black uppercase tracking-widest text-[var(--accent-orange)] opacity-60 hover:opacity-100 flex items-center gap-1">
                Agenda completa <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-4">
              {upcomingAgenda.length > 0 ? upcomingAgenda.map((item) => {
                const itemIsToday = isToday(new Date(item.date + 'T12:00:00'));
                return (
                  <div key={item.id} className="relative p-5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-sm hover:border-[var(--border-strong)] transition-all overflow-hidden group">
                    <div className={cn(
                      "absolute top-0 left-0 w-1 h-full transition-opacity",
                      itemIsToday ? "bg-[var(--accent-green)] opacity-100" : "bg-[var(--accent-orange)] opacity-40 group-hover:opacity-100"
                    )} />
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-[var(--text-primary)]">{item.title}</span>
                        {itemIsToday && (
                          <span className="text-[8px] font-black uppercase tracking-widest bg-[var(--accent-green)]/10 text-[var(--accent-green)] px-2 py-0.5 rounded-full shrink-0">Hoje</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 opacity-30" />
                        <span className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
                          {itemIsToday ? 'Hoje' : format(new Date(item.date + 'T12:00:00'), "dd 'DE' MMMM", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="py-12 text-center border-2 border-dashed border-[var(--border-color)] rounded-3xl opacity-20">
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Nenhum marco planejado</p>
                </div>
              )}
            </div>

            <Link 
              to="/calendar" 
              className="block w-full text-center py-4 rounded-2xl bg-[var(--bg-hover)] border border-[var(--border-strong)] text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all"
            >
              Planejar Semana
            </Link>
          </section>
        </div>
      </div>

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingNotesBook && (
          <BookNotesModal 
            book={viewingNotesBook} 
            onClose={() => setViewingNotesBook(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
