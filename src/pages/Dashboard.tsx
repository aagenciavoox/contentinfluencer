import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  format, isBefore, isToday, startOfToday, startOfWeek, endOfWeek,
  isWithinInterval, addDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Zap, Calendar as CalendarIcon, AlertCircle, Plus, BookOpen,
  CheckCircle2, Clock, LayoutDashboard, ArrowRight, TrendingUp,
  Lightbulb, ChevronDown, ChevronUp, Mic, Send, AlertTriangle,
  Video,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { generateUUID } from '../utils/uuid';
import { Idea, Book, Content } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { BookNotesModal } from '../components/BookNotesModal';
import { PageGuide } from '../components/PageGuide';
import { ContentDetailModal } from '../components/ContentDetailModal';

const PIPELINE_STATUSES = ['Pronto para Gravar', 'Gravado', 'A Editar', 'Editado', 'Programado'] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  'Pronto para Gravar': { label: 'Pronto p/ Gravar', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-500' },
  'Gravado':            { label: 'Gravado',           color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', dot: 'bg-purple-500' },
  'A Editar':           { label: 'A Editar',           color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  dot: 'bg-amber-500'  },
  'Editado':            { label: 'Editado',            color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   dot: 'bg-blue-500'   },
  'Programado':         { label: 'Programado',         color: 'text-green-500',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  dot: 'bg-green-500'  },
};

export function Dashboard() {
  const { state, dispatch } = useAppContext();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // UI state
  const [quickInput, setQuickInput] = useState('');
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [viewingNotesBook, setViewingNotesBook] = useState<Book | null>(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  // Energy
  const currentEnergy = state.energyLogs.find(l => l.date === todayStr)?.level || 0;
  const handleEnergyLog = (level: number) => {
    dispatch({ type: 'LOG_ENERGY', payload: { date: todayStr, level } });
  };

  // ── TODAY ────────────────────────────────────────────────────────
  const todayRecordings = useMemo(() =>
    state.contents.filter(c => c.recordingDate === todayStr && c.status !== 'Postado'),
  [state.contents, todayStr]);

  const todayPublications = useMemo(() =>
    state.contents.filter(c => c.publishDate === todayStr && c.status !== 'Postado'),
  [state.contents, todayStr]);

  const hasAnythingToday = todayRecordings.length > 0 || todayPublications.length > 0;

  // ── NEXT 3 DAYS ──────────────────────────────────────────────────
  const next3DaysItems = useMemo(() => {
    const items: Array<{ content: Content; type: 'recording' | 'publish'; dateStr: string }> = [];
    for (let i = 1; i <= 3; i++) {
      const dStr = format(addDays(today, i), 'yyyy-MM-dd');
      state.contents.forEach(c => {
        if (c.recordingDate === dStr && c.status !== 'Postado')
          items.push({ content: c, type: 'recording', dateStr: dStr });
        if (c.publishDate === dStr && c.status !== 'Postado')
          items.push({ content: c, type: 'publish', dateStr: dStr });
      });
    }
    return items;
  }, [state.contents, todayStr]);

  // ── ATTENTION ─────────────────────────────────────────────────────
  const overduePublications = useMemo(() =>
    state.contents.filter(c =>
      c.publishDate &&
      isBefore(new Date(c.publishDate + 'T00:00:00'), startOfToday()) &&
      c.status !== 'Postado'
    ),
  [state.contents]);

  const missingRecordDate = useMemo(() =>
    state.contents.filter(c => c.status === 'Pronto para Gravar' && !c.recordingDate),
  [state.contents]);

  const totalAttention = overduePublications.length + missingRecordDate.length;

  // ── PIPELINE ──────────────────────────────────────────────────────
  const pipeline = useMemo(() =>
    PIPELINE_STATUSES.map(status => ({
      status,
      items: state.contents.filter(c => c.status === status),
    })),
  [state.contents]);

  // ── KPIs ─────────────────────────────────────────────────────────
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd   = endOfWeek(today,   { weekStartsOn: 0 });

  const weeklyKpis = useMemo(() => ({
    ideas:     state.ideas.filter(i => isWithinInterval(new Date(i.createdAt), { start: weekStart, end: weekEnd })).length,
    posted:    state.contents.filter(c => c.status === 'Postado' && c.publishDate && isWithinInterval(new Date(c.publishDate + 'T12:00:00'), { start: weekStart, end: weekEnd })).length,
    scheduled: state.contents.filter(c => c.status === 'Programado').length,
  }), [state.ideas, state.contents, weekStart, weekEnd]);

  const metaSemanal = state.pilares.filter(p => p.ativo).reduce((acc, p) => acc + (p.metaSemanalMin || 0), 0);

  // ── ENERGY RECS (only when today is empty) ───────────────────────
  const energyRecs = useMemo(() => {
    if (hasAnythingToday || currentEnergy === 0) return [];
    return state.contents
      .filter(c => c.status === 'Pronto para Gravar' && c.slotType === String(currentEnergy))
      .slice(0, 3);
  }, [hasAnythingToday, state.contents, currentEnergy]);

  // ── BOOKS ─────────────────────────────────────────────────────────
  const currentBooks = state.books.filter(b => b.statusLeitura === 'Lendo');

  // ── QUICK CAPTURE ─────────────────────────────────────────────────
  const handleQuickCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    const newIdea: Idea = {
      id: generateUUID(),
      text: quickInput,
      createdAt: new Date().toISOString(),
      archived: false,
    };
    dispatch({ type: 'ADD_IDEA', payload: newIdea });
    setQuickInput('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2000);
  };

  // ── HELPERS ───────────────────────────────────────────────────────
  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    if (isToday(d)) return 'Hoje';
    const diff = Math.round((d.getTime() - startOfToday().getTime()) / 86400000);
    if (diff === 1) return 'Amanhã';
    return format(d, "EEE, dd/MM", { locale: ptBR });
  };

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto py-8 md:py-12 px-6 md:px-10 space-y-10">
      <PageGuide
        pageId="dashboard"
        title="Command Center"
        description="Visão operacional da sua produção: o que gravar/postar hoje, o que vem nos próximos dias, o que precisa de atenção e o estado geral do pipeline."
        icon={LayoutDashboard}
      />

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight italic">
            Command Center
          </h1>
          <p className="text-[var(--text-secondary)] text-sm font-medium opacity-60 uppercase tracking-widest">
            {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Energy log */}
        <div className="flex items-center gap-3 bg-[var(--bg-secondary)] px-4 py-3 rounded-2xl border border-[var(--border-color)] self-start sm:self-auto">
          <Zap className={cn("w-4 h-4 shrink-0", currentEnergy > 0 ? "text-orange-400" : "opacity-30")} />
          <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60 hidden sm:block">Energia</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                onClick={() => handleEnergyLog(level)}
                className={cn(
                  "w-7 h-7 rounded-lg text-[10px] font-black transition-all",
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

      {/* ── HOJE ────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-2 h-2 rounded-full bg-[var(--accent-green)] shadow-[0_0_8px_var(--accent-green)]" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Hoje</h2>
          {hasAnythingToday && (
            <span className="text-[9px] font-black uppercase tracking-widest bg-[var(--accent-green)]/10 text-[var(--accent-green)] px-2 py-0.5 rounded-full">
              {todayRecordings.length + todayPublications.length} tarefa{todayRecordings.length + todayPublications.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {hasAnythingToday ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayRecordings.map(c => (
              <TodayCard key={`rec-${c.id}`} content={c} type="recording" onClick={() => setSelectedContent(c)} />
            ))}
            {todayPublications.map(c => (
              <TodayCard key={`pub-${c.id}`} content={c} type="publish" onClick={() => setSelectedContent(c)} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
            {energyRecs.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-orange-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                    Sugestões para energia {currentEnergy}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {energyRecs.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContent(c)}
                      className="text-left p-4 rounded-2xl bg-[var(--bg-hover)] border border-[var(--border-color)] hover:border-orange-500/40 transition-all group"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block mb-2">{c.pillar}</span>
                      <span className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">{c.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-orange-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-5 h-5 opacity-20" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-[var(--text-primary)] mb-1">Nenhuma tarefa agendada para hoje</p>
                  <p className="text-[11px] text-[var(--text-tertiary)] opacity-60">Defina sua energia e planeje gravações ou publicações pelo calendário.</p>
                </div>
                <Link to="/calendar" className="shrink-0 px-5 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-all">
                  Planejar
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── PRÓXIMOS DIAS ────────────────────────────────────────────── */}
      {next3DaysItems.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <Clock className="w-4 h-4 text-[var(--accent-blue)] opacity-70" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Próximos 3 dias</h2>
          </div>
          <div className="space-y-2">
            {next3DaysItems.map(({ content: c, type, dateStr }) => (
              <button
                key={`${type}-${c.id}`}
                onClick={() => setSelectedContent(c)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--border-strong)] transition-all group text-left"
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                  type === 'recording' ? 'bg-orange-500/10' : 'bg-blue-500/10'
                )}>
                  {type === 'recording'
                    ? <Mic className="w-4 h-4 text-orange-500" />
                    : <Send className="w-4 h-4 text-blue-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">{c.title}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60 mt-0.5">
                    {c.pillar}{c.formatoVisual ? ` · ${c.formatoVisual}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                    type === 'recording' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
                  )}>
                    {type === 'recording' ? 'Gravar' : 'Postar'} · {formatDateLabel(dateStr)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-60 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── ATENÇÃO ───────────────────────────────────────────────────── */}
      {totalAttention > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <AlertTriangle className="w-4 h-4 text-[var(--accent-pink)] opacity-80" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Atenção necessária</h2>
            <span className="text-[9px] font-black bg-[var(--accent-pink)]/10 text-[var(--accent-pink)] px-2 py-0.5 rounded-full">{totalAttention}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {overduePublications.length > 0 && (
              <div className="p-5 rounded-2xl border border-[var(--accent-pink)]/20 bg-[var(--accent-pink)]/5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-[var(--accent-pink)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-pink)]">
                    {overduePublications.length} publicação{overduePublications.length !== 1 ? 'ões' : ''} atrasada{overduePublications.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {overduePublications.slice(0, 3).map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContent(c)}
                      className="w-full text-left flex items-center gap-2 group"
                    >
                      <div className="w-1 h-1 rounded-full bg-[var(--accent-pink)] opacity-60 shrink-0" />
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate group-hover:underline">{c.title}</span>
                      <span className="text-[9px] text-[var(--accent-pink)] opacity-70 shrink-0">
                        {c.publishDate ? format(new Date(c.publishDate + 'T12:00:00'), 'dd/MM') : ''}
                      </span>
                    </button>
                  ))}
                  {overduePublications.length > 3 && (
                    <Link to="/contents" className="text-[9px] font-black text-[var(--accent-pink)] opacity-60 hover:opacity-100">
                      + {overduePublications.length - 3} mais
                    </Link>
                  )}
                </div>
              </div>
            )}
            {missingRecordDate.length > 0 && (
              <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Mic className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                    {missingRecordDate.length} pronto{missingRecordDate.length !== 1 ? 's' : ''} sem data de gravação
                  </span>
                </div>
                <div className="space-y-2">
                  {missingRecordDate.slice(0, 3).map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContent(c)}
                      className="w-full text-left flex items-center gap-2 group"
                    >
                      <div className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate group-hover:underline">{c.title}</span>
                    </button>
                  ))}
                  {missingRecordDate.length > 3 && (
                    <Link to="/contents" className="text-[9px] font-black text-amber-500 opacity-60 hover:opacity-100">
                      + {missingRecordDate.length - 3} mais
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── PIPELINE ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-4 h-4 text-[var(--accent-blue)] opacity-70" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Pipeline</h2>
          </div>
          <Link to="/contents" className="text-[9px] font-black uppercase tracking-widest text-[var(--accent-blue)] opacity-60 hover:opacity-100 flex items-center gap-1 transition-opacity">
            Ver inventário <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {pipeline.map(({ status, items }) => {
            const cfg = STATUS_CONFIG[status];
            const visible = items.slice(0, 4);
            const extra = items.length - 4;
            return (
              <div key={status} className={cn("rounded-2xl border p-4 flex flex-col gap-3", cfg.bg, cfg.border)}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-[9px] font-black uppercase tracking-widest", cfg.color)}>{cfg.label}</span>
                  <span className={cn("text-lg font-black", cfg.color)}>{items.length}</span>
                </div>
                <div className="space-y-1.5 flex-1">
                  {visible.length === 0 && (
                    <p className="text-[9px] text-[var(--text-tertiary)] opacity-40 italic">Vazio</p>
                  )}
                  {visible.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContent(c)}
                      className="w-full text-left text-[10px] font-medium text-[var(--text-primary)] leading-tight line-clamp-1 hover:underline opacity-80 hover:opacity-100 transition-opacity"
                    >
                      {c.title}
                    </button>
                  ))}
                  {extra > 0 && (
                    <Link to="/contents" className={cn("text-[9px] font-black opacity-60 hover:opacity-100 transition-opacity", cfg.color)}>
                      + {extra} mais
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── BOTTOM ROW ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Quick Capture */}
        <div className="md:col-span-1 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] overflow-hidden">
          <button
            onClick={() => setIsCaptureOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Plus className="w-4 h-4 text-[var(--text-primary)] opacity-60" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Capturar Ideia</span>
            </div>
            {isCaptureOpen
              ? <ChevronUp className="w-4 h-4 opacity-40" />
              : <ChevronDown className="w-4 h-4 opacity-40" />
            }
          </button>

          <AnimatePresence>
            {isCaptureOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleQuickCapture} className="px-5 pb-5 space-y-3">
                  <div className="relative">
                    <textarea
                      value={quickInput}
                      onChange={e => setQuickInput(e.target.value)}
                      placeholder="Escreva sua ideia..."
                      className="w-full bg-[var(--bg-hover)] border border-[var(--border-color)] focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:opacity-30 resize-none focus:outline-none transition-all min-h-[80px]"
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleQuickCapture(e); }}
                    />
                    <AnimatePresence>
                      {isSuccess && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 flex items-center justify-center bg-[var(--bg-hover)] rounded-xl"
                        >
                          <div className="flex items-center gap-2 text-[var(--accent-green)]">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Salvo!</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[var(--text-tertiary)] opacity-40">⌘ + Enter para salvar</span>
                    <button
                      type="submit"
                      disabled={!quickInput.trim()}
                      className="px-5 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 transition-all hover:opacity-80 active:scale-95"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* KPIs compactos */}
        <div className="bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--accent-blue)] opacity-70" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">Esta semana</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-black text-[var(--accent-green)]">
                {weeklyKpis.posted}
                {metaSemanal > 0 && <span className="text-sm opacity-40">/{metaSemanal}</span>}
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60 mt-0.5">Postados</p>
              {metaSemanal > 0 && (
                <div className="h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-[var(--accent-green)] transition-all"
                    style={{ width: `${Math.min(100, Math.round((weeklyKpis.posted / metaSemanal) * 100))}%` }}
                  />
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-[var(--accent-blue)]">{weeklyKpis.scheduled}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60 mt-0.5">Prog.</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-[var(--accent-purple)]">{weeklyKpis.ideas}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60 mt-0.5">Ideias</p>
            </div>
          </div>
        </div>

        {/* Livro atual (mini) */}
        <div className="bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--accent-purple)] opacity-70" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">Lendo agora</span>
            </div>
            <Link to="/biblioteca" className="text-[9px] font-black uppercase tracking-widest text-[var(--accent-purple)] opacity-60 hover:opacity-100 transition-opacity">
              Biblioteca
            </Link>
          </div>

          {currentBooks.length > 0 ? (
            <div className="flex gap-3 items-start">
              {currentBooks[0].capaUrl ? (
                <img
                  src={currentBooks[0].capaUrl}
                  alt={currentBooks[0].titulo}
                  onClick={() => setViewingNotesBook(currentBooks[0])}
                  className="w-12 aspect-[2/3] object-cover rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform shrink-0"
                />
              ) : (
                <div className="w-12 aspect-[2/3] bg-[var(--bg-hover)] rounded-lg flex items-center justify-center border border-[var(--border-strong)] shrink-0">
                  <BookOpen className="w-4 h-4 opacity-20" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[var(--text-primary)] leading-snug line-clamp-2 italic">"{currentBooks[0].titulo}"</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] opacity-60 mt-1">{currentBooks[0].autor}</p>
                {currentBooks[0].totalPaginas && currentBooks[0].totalPaginas > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-purple)] transition-all"
                        style={{ width: `${Math.min(100, Math.round(((currentBooks[0].paginasLidas || 0) / currentBooks[0].totalPaginas) * 100))}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-black opacity-30">
                      {Math.min(100, Math.round(((currentBooks[0].paginasLidas || 0) / currentBooks[0].totalPaginas) * 100))}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              to="/biblioteca"
              className="flex-1 flex flex-col items-center justify-center py-4 border-2 border-dashed border-[var(--border-color)] rounded-2xl opacity-40 hover:opacity-100 transition-all"
            >
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-[9px] font-black uppercase tracking-widest">Adicionar livro</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── MODALS ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingNotesBook && (
          <BookNotesModal book={viewingNotesBook} onClose={() => setViewingNotesBook(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedContent && (
          <ContentDetailModal content={selectedContent} onClose={() => setSelectedContent(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── TodayCard ──────────────────────────────────────────────────────────────────
function TodayCard({
  content,
  type,
  onClick,
}: {
  content: Content;
  type: 'recording' | 'publish';
  onClick: () => void;
}) {
  const isRec = type === 'recording';
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border overflow-hidden hover:scale-[1.02] active:scale-[0.98] transition-all group shadow-sm",
        isRec ? 'border-orange-500/20 bg-orange-500/5' : 'border-blue-500/20 bg-blue-500/5'
      )}
    >
      <div className={cn("h-1", isRec ? 'bg-orange-500' : 'bg-blue-500')} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          {isRec
            ? <Mic className="w-4 h-4 text-orange-500" />
            : <Send className="w-4 h-4 text-blue-500" />
          }
          <span className={cn("text-[9px] font-black uppercase tracking-widest", isRec ? 'text-orange-500' : 'text-blue-500')}>
            {isRec ? 'Gravar hoje' : 'Postar hoje'}
          </span>
        </div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">{content.title}</h3>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {content.pillar && (
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">{content.pillar}</span>
          )}
          {content.formatoVisual && (
            <>
              <span className="text-[var(--text-tertiary)] opacity-30">·</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">{content.formatoVisual}</span>
            </>
          )}
        </div>
      </div>
      <div className={cn(
        "px-5 py-3 border-t flex items-center justify-between",
        isRec ? 'border-orange-500/10' : 'border-blue-500/10'
      )}>
        <span className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest opacity-60">{content.status}</span>
        <ArrowRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity", isRec ? 'text-orange-500' : 'text-blue-500')} />
      </div>
    </button>
  );
}
