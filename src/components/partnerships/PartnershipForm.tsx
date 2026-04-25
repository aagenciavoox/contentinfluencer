import React, { useState } from 'react';
import { X, Trash2, CheckCircle2, AlertCircle, Edit3, CalendarRange, Archive, ArchiveRestore, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { ConfirmModal } from '../ConfirmModal';
import { Partnership, PartnershipStatus, AgendaItem } from '../../types';
import { PARTNERSHIP_STAGES } from '../../constants';
import { cn } from '../../lib/utils';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useAppContext } from '../../context/AppContext';

interface PartnershipFormProps {
  initialData: Partnership;
  onSave: (p: Partnership) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  initialTab?: 'config' | 'agenda';
}

export function PartnershipForm({ initialData, onSave, onClose, onDelete, initialTab = 'agenda' }: PartnershipFormProps) {
  const { state, dispatch } = useAppContext();
  const [data, setData] = useState<Partnership>({ ...initialData });
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'agenda'>(initialTab);

  const update = (updates: Partial<Partnership>) => setData(prev => ({ ...prev, ...updates }));

  // Related events
  const projectEvents = state.agenda.filter(a => a.partnershipId === data.id);
  
  // Event scheduler state
  const [selectedPhase, setSelectedPhase] = useState<PartnershipStatus | ''>('');
  const [phaseDateStart, setPhaseDateStart] = useState('');
  const [phaseDateEnd, setPhaseDateEnd] = useState('');

  const handleAddPhaseEvent = () => {
    if (!selectedPhase) return;

    if (selectedPhase === 'Leitura') {
      if (!phaseDateStart || !phaseDateEnd) {
        alert('Para Leitura, preencha a Data de Início e Data Fim.');
        return;
      }
      // Update project dates directly for Leitura
      update({ startDate: phaseDateStart, deadline: phaseDateEnd });
    } else {
      if (!phaseDateStart) {
        alert('Preencha a data do evento.');
        return;
      }
      // Create an agenda item for other phases
      const newEvent: AgendaItem = {
        id: Math.random().toString(36).substr(2, 9),
        title: selectedPhase,
        date: phaseDateStart,
        type: 'Entrega',
        external: true,
        partnershipId: data.id,
        brandColor: data.brandColor
      };
      dispatch({ type: 'ADD_AGENDA', payload: newEvent });
    }
    
    // Reset scheduler
    setSelectedPhase('');
    setPhaseDateStart('');
    setPhaseDateEnd('');
  };

  const handleRemoveLeitura = () => {
    update({ startDate: undefined, deadline: undefined });
  };

  // Calcula duração em dias para Leitura
  const leituraDuration = data.startDate && data.deadline
    ? differenceInCalendarDays(parseISO(data.deadline), parseISO(data.startDate)) + 1
    : null;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] rounded-[3rem] overflow-hidden">
      {/* ── HEADER ── */}
      <div className="px-6 py-5 md:px-10 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)] shrink-0">
        <div className="flex bg-[var(--bg-primary)] p-1.5 rounded-2xl border border-[var(--border-color)] shadow-inner">
          <button 
            onClick={() => setActiveTab('config')}
            className={cn(
              "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
              activeTab === 'config' ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md scale-105" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            Config
          </button>
          <button 
            onClick={() => setActiveTab('agenda')}
            className={cn(
              "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
              activeTab === 'agenda' ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md scale-105" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Agenda
          </button>
        </div>
        <button onClick={onClose} className="p-2.5 hover:bg-[var(--bg-hover)] rounded-full transition-all border border-transparent hover:border-[var(--border-color)]">
           <X className="w-6 h-6 text-[var(--text-tertiary)] opacity-60 hover:opacity-100" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* ── INFO DO PROJETO ── */}
        {activeTab === 'config' && (
          <div className="p-6 md:p-10 border-b border-[var(--border-color)] animate-in fade-in slide-in-from-top-4 duration-300">
            <textarea 
              value={data.title}
              onChange={(e) => update({ title: e.target.value, brand: e.target.value })}
              rows={2}
              className="text-3xl md:text-4xl font-black text-[var(--text-primary)] bg-transparent border-none focus:ring-0 p-0 w-full mb-6 md:mb-8 resize-none leading-tight tracking-tight placeholder:text-[var(--text-primary)]/20"
              placeholder="Nome da Campanha / Marca..."
            />

            <div className="grid grid-cols-1 gap-6 bg-[var(--bg-secondary)] p-6 md:p-8 rounded-[2rem] border border-[var(--border-color)] shadow-inner">
              {/* Identidade Visual */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">Cor de Identificação</label>
                <div className="flex items-center gap-4 bg-[var(--bg-hover)] rounded-2xl px-4 py-3 md:px-5 border border-[var(--border-color)] shadow-sm">
                  <input 
                    type="color" 
                    value={data.brandColor || '#ffffff'}
                    onChange={(e) => update({ brandColor: e.target.value })}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-xl cursor-pointer border-none bg-transparent shrink-0"
                  />
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase font-bold truncate">{data.brandColor}</span>
                </div>
              </div>

              {/* Descrição / Link */}
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">Descrição / Link de Referência</label>
                 <input 
                   type="text" 
                   value={data.link || ''}
                   onChange={(e) => update({ link: e.target.value })}
                   placeholder="Link do drive, pasta..."
                   className="w-full text-xs bg-[var(--bg-hover)] border border-transparent rounded-2xl px-4 py-3 md:px-5 md:py-4 focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)] shadow-sm"
                 />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="p-6 md:p-10 border-b border-[var(--border-color)] bg-[var(--bg-hover)]/20">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] opacity-60 block mb-1">
               Agendando Eventos para:
             </span>
             <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight truncate">
               {data.title || 'Novo Projeto'}
             </h2>
          </div>
        )}

        {/* ── SEÇÃO DE EVENTOS DO PROJETO ── */}
        {activeTab === 'agenda' && (
          <section className="px-6 md:px-10 py-10 border-b border-[var(--border-color)] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-purple-500/10 rounded-xl">
                <CalendarIcon className="w-4 h-4 text-purple-500" />
              </div>
              <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-[var(--text-primary)]">Agendar Fases / Eventos</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-4 bg-[var(--bg-secondary)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest opacity-70">
                  Agende as datas para as fases deste projeto. A fase "Leitura" possui período (início e fim).
                </p>
                
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 w-full">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Fase</label>
                    <select
                      value={selectedPhase}
                      onChange={(e) => setSelectedPhase(e.target.value as PartnershipStatus | '')}
                      className="w-full text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)] cursor-pointer"
                    >
                      <option value="">Selecionar Fase...</option>
                      {PARTNERSHIP_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  
                  {selectedPhase === 'Leitura' ? (
                    <>
                      <div className="space-y-2 flex-1 w-full">
                        <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Data Início</label>
                        <input
                          type="date"
                          value={phaseDateStart}
                          onChange={(e) => setPhaseDateStart(e.target.value)}
                          className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-xs px-4 py-3 font-bold text-[var(--text-primary)] cursor-pointer"
                        />
                      </div>
                      <div className="space-y-2 flex-1 w-full">
                        <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Data Fim</label>
                        <input
                          type="date"
                          value={phaseDateEnd}
                          min={phaseDateStart}
                          onChange={(e) => setPhaseDateEnd(e.target.value)}
                          className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-xs px-4 py-3 font-bold text-[var(--text-primary)] cursor-pointer"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 flex-1 w-full">
                      <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Data do Evento</label>
                      <input
                        type="date"
                        value={phaseDateStart}
                        onChange={(e) => setPhaseDateStart(e.target.value)}
                        disabled={!selectedPhase}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-xs px-4 py-3 font-bold text-[var(--text-primary)] cursor-pointer disabled:opacity-50"
                      />
                    </div>
                  )}
                  
                  <button
                    onClick={handleAddPhaseEvent}
                    disabled={!selectedPhase || !phaseDateStart || (selectedPhase === 'Leitura' && !phaseDateEnd)}
                    className="flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:scale-105 transition-all shadow-md w-full md:w-auto h-[42px] shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Agendar
                  </button>
                </div>
              </div>

              {/* Listagem de Eventos Agendados */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-4">Cronograma do Projeto</h4>
                
                {/* Leitura (Se existir) */}
                {data.startDate && data.deadline && (
                  <div className="flex items-center justify-between p-4 bg-[var(--accent-blue)]/5 rounded-2xl border border-[var(--accent-blue)]/20 group">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)] shadow-sm" />
                      <div>
                        <span className="text-xs font-bold text-[var(--accent-blue)] block mb-1">Período de Leitura</span>
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-70">
                          <CalendarRange className="w-3 h-3" />
                          {parseISO(data.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} 
                          {' → '} 
                          {parseISO(data.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          {leituraDuration && ` (${leituraDuration} dias)`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveLeitura}
                      className="p-2 text-[var(--accent-pink)] opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--accent-pink)]/10 rounded-xl"
                      title="Remover período de leitura"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Outros Eventos (AgendaItems) */}
                {projectEvents.length > 0 && (
                  <div className="space-y-2">
                    {projectEvents.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(ev => (
                      <div key={ev.id} className="flex items-center justify-between p-4 bg-[var(--bg-hover)]/50 rounded-2xl border border-[var(--border-color)] group">
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ev.brandColor || data.brandColor }} />
                          <span className="text-xs font-bold text-[var(--text-primary)]">{ev.title.split(' - ')[0]}</span>
                          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-color)]">
                            <Clock className="w-3 h-3" />
                            {parseISO(ev.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        <button
                          onClick={() => dispatch({ type: 'DELETE_AGENDA', payload: ev.id })}
                          className="p-2 text-[var(--accent-pink)] opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--accent-pink)]/10 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!data.startDate && projectEvents.length === 0 && (
                  <p className="text-[10px] font-bold text-[var(--text-tertiary)] opacity-50 uppercase tracking-widest text-center py-6 italic border-2 border-dashed border-[var(--border-color)] rounded-[2rem]">
                    Nenhuma fase agendada.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="space-y-0">
          {data.status === 'Roteiro' && (
            <section className="px-6 md:px-10 py-10 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[var(--accent-blue)]/10 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-[var(--accent-blue)]" />
                </div>
                <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-[var(--text-primary)]">Roteiro</h3>
              </div>
              <textarea 
                value={data.script || ''}
                onChange={(e) => update({ script: e.target.value })}
                className="w-full min-h-[300px] text-base text-[var(--text-primary)] bg-transparent border border-[var(--border-color)] rounded-[2rem] focus:ring-2 focus:ring-[var(--accent-blue)] p-8 resize-none placeholder:italic placeholder:text-[var(--text-tertiary)] custom-scrollbar leading-relaxed font-medium"
                placeholder="Desenvolva o roteiro do vídeo ou anotações..."
              />
            </section>
          )}

          <section className="px-6 md:px-10 py-10 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-[var(--text-tertiary)]/10 rounded-xl">
                <Edit3 className="w-4 h-4 text-[var(--text-tertiary)]" />
              </div>
              <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-[var(--text-primary)]">Notas Gerais</h3>
            </div>
            <textarea 
              value={data.notes || ''}
              onChange={(e) => update({ notes: e.target.value })}
              className="w-full min-h-[150px] text-base text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2rem] focus:ring-0 p-8 resize-none placeholder:italic placeholder:text-[var(--text-tertiary)] custom-scrollbar leading-relaxed font-medium shadow-inner"
              placeholder="Lembretes internos..."
            />
          </section>

          {/* ── SEÇÃO DE GESTÃO ── */}
          {activeTab === 'config' && (
            <section className="px-6 md:px-10 py-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-[var(--text-primary)] mb-6">Gestão do Projeto</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => update({ status: 'Finalizado' })}
                  disabled={data.status === 'Finalizado'}
                  className={cn(
                    "flex items-center justify-center gap-2 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                    data.status === 'Finalizado'
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 cursor-default"
                      : "border-[var(--border-color)] text-[var(--text-primary)] hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600"
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {data.status === 'Finalizado' ? 'Projeto Finalizado' : 'Concluir Projeto'}
                </button>

                <button
                  onClick={() => update({ archived: !data.archived })}
                  className={cn(
                    "flex items-center justify-center gap-2 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                    data.archived
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-600"
                      : "border-[var(--border-color)] text-[var(--text-primary)] hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-600"
                  )}
                >
                  {data.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  {data.archived ? 'Desarquivar' : 'Arquivar'}
                </button>

                <button
                  onClick={() => setConfirm({ message: 'Excluir permanentemente?', onConfirm: () => onDelete(data.id) })}
                  className="flex items-center justify-center gap-2 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-500/10 text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
              {data.status === 'Finalizado' && (
                <p className="mt-4 text-[9px] text-emerald-600 font-bold uppercase tracking-widest text-center">
                  ↳ Este projeto está na aba de "Encerrados"
                </p>
              )}
            </section>
          )}
        </div>
      </div>

      <div className="px-10 py-8 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] shrink-0 space-y-4">
        <button
          onClick={() => {
            if (!data.title || !data.brand) {
               alert('Marca e Título são obrigatórios.');
               return;
            }
          onSave(data);
        }}
        className="w-full flex items-center justify-center gap-2 px-6 py-5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg hover-action"
      >
        <CheckCircle2 className="w-4 h-4" />
        Salvar Alterações
      </button>

        <button
          onClick={onClose}
          className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all"
        >
          Cancelar / Fechar
        </button>
      </div>
      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
