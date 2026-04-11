import React, { useState } from 'react';
import { X, Trash2, CheckCircle2, AlertCircle, Edit3, CalendarRange, Archive, ArchiveRestore } from 'lucide-react';
import { ConfirmModal } from '../ConfirmModal';
import { Partnership, PartnershipStatus } from '../../types';
import { PARTNERSHIP_STAGES } from '../../constants';
import { cn } from '../../lib/utils';
import { differenceInCalendarDays, parseISO } from 'date-fns';

interface PartnershipFormProps {
  initialData: Partnership;
  onSave: (p: Partnership) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function PartnershipForm({ initialData, onSave, onClose, onDelete }: PartnershipFormProps) {
  const [data, setData] = useState<Partnership>({ ...initialData });
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const update = (updates: Partial<Partnership>) => setData(prev => ({ ...prev, ...updates }));

  // Calcula duração em dias quando ambas as datas estão preenchidas
  const durationDays = data.startDate && data.deadline
    ? differenceInCalendarDays(parseISO(data.deadline), parseISO(data.startDate)) + 1
    : null;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] rounded-[3rem] overflow-hidden">
      <div className="p-6 md:p-8 border-b border-[var(--border-color)] flex flex-col md:flex-row items-center justify-between bg-[var(--bg-secondary)] shrink-0 gap-6">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-3 hover:bg-[var(--bg-hover)] rounded-full transition-all">
              <X className="w-6 h-6 text-[var(--text-primary)] opacity-40 hover:opacity-100" />
            </button>
          </div>
        <div className="flex items-center gap-4 px-4 py-3 bg-[var(--bg-hover)] w-full md:flex-1 md:ml-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
          <div className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: data.brandColor }} />
          <input 
            type="text" 
            placeholder="NOME DA MARCA..."
            value={data.brand}
            onChange={(e) => update({ brand: e.target.value })}
            className="bg-transparent border-none text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] focus:ring-0 w-full p-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar" style={{ minHeight: 0 }}>
        <div className="mb-14">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[8px] font-black bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] px-3 py-1.5 rounded-xl uppercase tracking-[0.2em] border border-[var(--accent-blue)]/30">
              Editando Evento (Entrega)
            </span>
          </div>
          <textarea 
            value={data.title}
            onChange={(e) => update({ title: e.target.value })}
            rows={2}
            className="text-4xl font-black text-[var(--text-primary)] bg-transparent border-none focus:ring-0 p-0 w-full mb-8 resize-none leading-tight tracking-tight placeholder:opacity-10"
            placeholder="Título do Projeto..."
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 bg-[var(--bg-secondary)] p-6 md:p-10 rounded-[2.5rem] border border-[var(--border-color)] shadow-inner">
            {/* Status */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1 opacity-60">Fase do Projeto</label>
              <select 
                value={data.status}
                onChange={(e) => update({ status: e.target.value as PartnershipStatus })}
                className="w-full text-xs bg-[var(--bg-hover)] border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)] cursor-pointer shadow-sm"
              >
                {PARTNERSHIP_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Identidade Visual */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1 opacity-60">Cor Identidade (Marca Global)</label>
              <div className="flex items-center gap-4 bg-[var(--bg-hover)] rounded-2xl px-5 py-3 border border-[var(--border-color)] shadow-sm">
                <input 
                  type="color" 
                  value={data.brandColor || '#ffffff'}
                  onChange={(e) => update({ brandColor: e.target.value })}
                  className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                />
                <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase font-bold">{data.brandColor}</span>
              </div>
            </div>

            {/* ── Range de Datas ── */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-[var(--text-tertiary)]" />
                <label className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] opacity-60">
                  Período do Evento
                </label>
                {durationDays !== null && durationDays > 0 && (
                  <span className="ml-auto text-[10px] font-black px-3 py-1 rounded-full bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20">
                    {durationDays} {durationDays === 1 ? 'dia' : 'dias'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1 opacity-50">Início</label>
                  <input 
                    type="date"
                    value={data.startDate || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      update({ startDate: val });
                      // Se deadline não definido, inicializa igual
                      if (!data.deadline) update({ startDate: val, deadline: val });
                    }}
                    className="w-full text-xs bg-[var(--bg-hover)] border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)] shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1 opacity-50">Fim / Prazo</label>
                  <input 
                    type="date"
                    value={data.deadline || ''}
                    min={data.startDate || undefined}
                    onChange={(e) => update({ deadline: e.target.value })}
                    className="w-full text-xs bg-[var(--bg-hover)] border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)] shadow-sm"
                  />
                </div>
              </div>
              {durationDays !== null && durationDays > 1 && (
                <p className="text-[9px] text-[var(--text-tertiary)] opacity-60 font-bold uppercase tracking-widest px-1">
                  ↳ O evento aparecerá em todos os {durationDays} dias no calendário
                </p>
              )}
            </div>

            {/* Link */}
            <div className="space-y-2 md:col-span-2">
               <label className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1 opacity-60">Link / Referência</label>
               <input 
                 type="text" 
                 value={data.link || ''}
                 onChange={(e) => update({ link: e.target.value })}
                 placeholder="Link do drive, pasta, briefing..."
                 className="w-full text-xs bg-[var(--bg-hover)] border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)] shadow-sm"
               />
            </div>
          </div>
        </div>

        <div className="space-y-12">
          {data.status === 'Roteiro' && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[var(--accent-blue)]/10 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-[var(--accent-blue)]" />
                </div>
                <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-[var(--text-primary)]">Roteiro</h3>
              </div>
              <textarea 
                value={data.script || ''}
                onChange={(e) => update({ script: e.target.value })}
                className="w-full min-h-[300px] text-base text-[var(--text-primary)] bg-transparent border border-[var(--border-color)] rounded-[2rem] focus:ring-2 focus:ring-[var(--accent-blue)] p-8 resize-none placeholder:italic placeholder:opacity-20 custom-scrollbar leading-relaxed font-medium"
                placeholder="Desenvolva o roteiro do vídeo ou anotações..."
              />
            </section>
          )}

          <section className="pt-12 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-[var(--text-tertiary)]/10 rounded-xl">
                <Edit3 className="w-4 h-4 text-[var(--text-tertiary)]" />
              </div>
              <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-[var(--text-primary)]">Notas Gerais</h3>
            </div>
            <textarea 
              value={data.notes || ''}
              onChange={(e) => update({ notes: e.target.value })}
              className="w-full min-h-[150px] text-base text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2rem] focus:ring-0 p-8 resize-none placeholder:italic placeholder:opacity-20 custom-scrollbar leading-relaxed font-medium shadow-inner"
              placeholder="Lembretes internos..."
            />
          </section>

          {/* ── SEÇÃO DE GESTÃO ── */}
          <section className="pt-12 border-t border-[var(--border-color)]">
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-[var(--text-primary)] mb-6">Gestão do Evento</h3>
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
                {data.status === 'Finalizado' ? 'Evento Finalizado' : 'Finalizar Evento'}
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
              <p className="mt-4 text-[9px] text-emerald-600 font-bold uppercase tracking-widest text-center opacity-60">
                ↳ Este evento está na aba de "Encerrados"
              </p>
            )}
          </section>
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
          className="w-full flex items-center justify-center gap-2 px-6 py-5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4" />
          Salvar este Evento
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => update({ archived: !data.archived })}
            className={cn(
              "flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
              data.archived 
                ? "bg-amber-500 text-white border-amber-500 shadow-md" 
                : "border-[var(--border-color)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            {data.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            {data.archived ? 'Desarquivar' : 'Arquivar'}
          </button>
          <button
            onClick={() => setConfirm({ message: 'Excluir permanentemente?', onConfirm: () => onDelete(data.id) })}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-40 hover:opacity-100 transition-all"
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
