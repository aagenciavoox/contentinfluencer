import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ShieldAlert, MessageSquare, Target, Ban, Edit3, Save, Plus, Trash2, Zap, Users,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export function DNAVozDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(state.dnaVoz);

  const handleSave = () => {
    dispatch({ type: 'UPDATE_DNA_VOZ', payload: editData });
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditData(state.dnaVoz);
    setIsEditing(true);
  };

  const addItem = (field: 'naoFaco' | 'alertas' | 'pilares', prompt_label: string) => {
    const item = prompt(prompt_label);
    if (item) setEditData(p => ({ ...p, [field]: [...p[field], item] }));
  };

  const removeItem = (field: 'naoFaco' | 'alertas' | 'pilares', index: number) => {
    setEditData(p => ({ ...p, [field]: p[field].filter((_, i) => i !== index) }));
  };

  const dna = isEditing ? editData : state.dnaVoz;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] md:w-[620px] h-[90vh] md:h-[85vh] bg-[var(--bg-secondary)] shadow-2xl z-50 rounded-3xl border border-[var(--border-color)] flex flex-col overflow-hidden"
          >
            <div className="p-8 md:p-12 flex-1 overflow-y-auto custom-scrollbar">
              {/* Header */}
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-[var(--text-primary)]">DNA & Voz</h2>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-green-700 transition-all"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar
                    </button>
                  ) : (
                    <button
                      onClick={handleStartEdit}
                      className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors"
                    >
                      <Edit3 className="w-5 h-5 text-[var(--text-primary)] opacity-50" />
                    </button>
                  )}
                  <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors">
                    <X className="w-5 h-5 text-[var(--text-primary)] opacity-50" />
                  </button>
                </div>
              </div>

              <div className="space-y-10">
                {/* Promessa Central — NOVO */}
                <section>
                  <div className="flex items-center gap-2 mb-4 text-[var(--text-primary)] opacity-40">
                    <Zap className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Promessa Central</span>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={editData.promessaCentral}
                      onChange={e => setEditData(p => ({ ...p, promessaCentral: e.target.value }))}
                      placeholder="O que você entrega para quem te segue? Ex: 'Faço você amar ainda mais os livros e rir da sua própria vida de leitora.'"
                      className="w-full min-h-[80px] text-sm text-[var(--text-primary)] bg-[var(--bg-hover)] border-none rounded-xl p-4 focus:ring-0 resize-none placeholder:opacity-30"
                    />
                  ) : (
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium opacity-80">
                      {state.dnaVoz.promessaCentral || (
                        <span className="italic opacity-30">Nenhuma promessa central definida ainda.</span>
                      )}
                    </p>
                  )}
                </section>

                {/* Público — NOVO */}
                <section>
                  <div className="flex items-center gap-2 mb-4 text-[var(--text-primary)] opacity-40">
                    <Users className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Público</span>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={editData.publico}
                      onChange={e => setEditData(p => ({ ...p, publico: e.target.value }))}
                      placeholder="Para quem você cria? Ex: 'Leitoras de 20-35 anos apaixonadas por Fantasy e Dark Romance, que querem falar de livros com humor e sem vergonha.'"
                      className="w-full min-h-[80px] text-sm text-[var(--text-primary)] bg-[var(--bg-hover)] border-none rounded-xl p-4 focus:ring-0 resize-none placeholder:opacity-30"
                    />
                  ) : (
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium opacity-80">
                      {state.dnaVoz.publico || (
                        <span className="italic opacity-30">Público não definido ainda.</span>
                      )}
                    </p>
                  )}
                </section>

                {/* Pilares */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[var(--text-primary)] opacity-40">
                      <Target className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-widest font-bold">Valores & Pilares</span>
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => addItem('pilares', 'Novo pilar/valor:')}
                        className="p-1 hover:bg-[var(--bg-hover)] rounded-full"
                      >
                        <Plus className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-40" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dna.pilares.map((p, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="px-3 py-1 text-xs rounded-full bg-[var(--text-primary)] text-[var(--bg-secondary)] font-bold">
                          {p}
                        </span>
                        {isEditing && (
                          <button
                            onClick={() => removeItem('pilares', i)}
                            className="text-[var(--text-primary)] opacity-30 hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Tom de Voz */}
                <section>
                  <div className="flex items-center gap-2 mb-4 text-[var(--text-primary)] opacity-40">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Tom de Voz</span>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={editData.tom}
                      onChange={e => setEditData(p => ({ ...p, tom: e.target.value }))}
                      className="w-full min-h-[100px] text-sm text-[var(--text-primary)] leading-relaxed bg-[var(--bg-hover)] border-none rounded-xl p-4 focus:ring-0 resize-none"
                    />
                  ) : (
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium opacity-80">
                      {state.dnaVoz.tom}
                    </p>
                  )}
                </section>

                {/* O que não faço */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[var(--text-primary)] opacity-40">
                      <Ban className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-widest font-bold">O que não faço</span>
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => addItem('naoFaco', 'O que você não faz?')}
                        className="p-1 hover:bg-[var(--bg-hover)] rounded-full"
                      >
                        <Plus className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-40" />
                      </button>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {dna.naoFaco.map((item, i) => (
                      <li key={i} className="flex items-start justify-between group">
                        <div className="flex items-start gap-3 text-sm text-[var(--text-primary)] opacity-80">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          {item}
                        </div>
                        {isEditing && (
                          <button
                            onClick={() => removeItem('naoFaco', i)}
                            className="p-1 text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Alertas de Desvio */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[var(--text-primary)] opacity-40">
                      <ShieldAlert className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-widest font-bold">Alertas de Desvio</span>
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => addItem('alertas', 'Novo alerta de desvio:')}
                        className="p-1 hover:bg-[var(--bg-hover)] rounded-full"
                      >
                        <Plus className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-40" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {dna.alertas.map((alerta, i) => (
                      <div key={i} className="relative group">
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                          <p className="text-xs text-orange-800 leading-relaxed italic pr-6">"{alerta}"</p>
                        </div>
                        {isEditing && (
                          <button
                            onClick={() => removeItem('alertas', i)}
                            className="absolute top-2 right-2 p-1 text-orange-800 opacity-0 group-hover:opacity-100 hover:bg-orange-100 rounded-full"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
