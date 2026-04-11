import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { FileText, Edit3, Trash2, Layers, Radio, MessageSquare, Settings2, Check, ChevronRight, Hash, Clapperboard, Plus } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ConfirmModal } from '../components/ConfirmModal';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { PLATFORMS, VISUAL_FORMATS } from '../constants';
import { Platform, VisualFormat, SlotType, Content } from '../types';

const STATUS_COLOR: Record<string, string> = {
  'Postado':            'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20',
  'Gravado':            'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/20',
  'A Editar':           'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] border-[var(--accent-orange)]/20',
  'Editado':            'bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border-[var(--accent-yellow)]/20',
  'Programado':         'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] border-[var(--accent-purple)]/20',
  'Pronto para Gravar': 'bg-[var(--accent-pink)]/10 text-[var(--accent-pink)] border-[var(--accent-pink)]/20',
  'Ideia':              'bg-[var(--bg-hover)] text-[var(--text-tertiary)] border-[var(--border-color)]',
};

const FREQ_OPTIONS: Array<'Semanal' | 'Quinzenal' | 'Mensal' | 'Sob demanda'> = [
  'Semanal', 'Quinzenal', 'Mensal', 'Sob demanda',
];
const SLOT_OPTIONS: SlotType[] = ['Curto', 'Série', 'Janela'];

type Tab = 'roteiros' | 'configuracoes';

export function SeriesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const series = state.series.find(s => s.id === id);

  const [tab, setTab] = useState<Tab>('roteiros');
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(series?.name || '');
  const [openContent, setOpenContent] = useState<Content | null>(null);

  if (!series) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="p-6 bg-[var(--bg-secondary)] rounded-full border border-[var(--border-color)]">
        <Edit3 className="w-12 h-12 text-[var(--text-tertiary)] opacity-20" />
      </div>
      <p className="text-sm font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] italic">Série não encontrada</p>
      <button onClick={() => navigate('/')} className="px-8 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl">
        Voltar
      </button>
    </div>
  );

  const seriesContents = state.contents.filter(c => c.seriesId === id);
  const postados = seriesContents.filter(c => c.status === 'Postado').length;
  const emProd = seriesContents.filter(c => c.status !== 'Postado' && c.status !== 'Ideia').length;

  const update = (updates: Partial<typeof series>) => {
    dispatch({ type: 'UPDATE_SERIES', payload: { ...series, ...updates } });
  };

  const handleNameSave = () => {
    if (nameValue.trim() && nameValue.trim() !== series.name) update({ name: nameValue.trim() });
    setEditingName(false);
  };

  const handleDelete = () => {
    setConfirm({
      message: 'Excluir esta série? Os conteúdos continuarão existindo, mas perderão a vinculação.',
      onConfirm: () => { dispatch({ type: 'DELETE_SERIES', payload: series.id }); navigate('/'); }
    });
  };

  const togglePlatform = (plat: Platform) => {
    const atual = series.plataformasPrincipais || [];
    update({ plataformasPrincipais: atual.includes(plat) ? atual.filter(p => p !== plat) : [...atual, plat] });
  };

  const updateHashtag = (plat: Platform, value: string) => {
    update({ hashtagsPorPlataforma: { ...(series.hashtagsPorPlataforma || {}), [plat]: value } });
  };

  const activePlatforms: Platform[] = series.plataformasPrincipais?.length
    ? series.plataformasPrincipais
    : PLATFORMS;

  return (
    <div className="content-narrow mx-auto py-10 md:py-14 px-6 md:px-10">
      <PageHeader 
        title={series.name} 
        subtitle="Série de Conteúdos"
        className="mb-10"
      />

      {/* ── ABAS ── */}
      <div className="flex gap-1 mb-8 p-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-fit">
        {([
          { id: 'roteiros', label: 'Roteiros', icon: Clapperboard },
          { id: 'configuracoes', label: 'Configurações', icon: Settings2 },
        ] as { id: Tab; label: string; icon: any }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              tab === t.id
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-primary)] opacity-40 hover:opacity-100'
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── ABA: ROTEIROS ── */}
        {tab === 'roteiros' && (
          <motion.div
            key="roteiros"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-3"
          >
            {seriesContents.length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed border-[var(--border-color)] rounded-2xl opacity-25 flex flex-col items-center gap-4">
                <Radio className="w-10 h-10" />
                <p className="text-xs font-black uppercase tracking-[0.3em] italic">Nenhum conteúdo vinculado ainda</p>
              </div>
            ) : seriesContents.map(content => (
              <motion.button
                key={content.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setOpenContent(content)}
                className="w-full text-left flex items-center gap-5 px-6 py-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--text-primary)]/20 hover:bg-[var(--bg-hover)] rounded-2xl transition-all group"
              >
                {/* ícone roteiro */}
                <div className="shrink-0 w-8 h-8 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-all" />
                </div>

                {/* info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[var(--text-primary)] truncate uppercase italic">{content.title || 'Sem título'}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {content.pillar && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">{content.pillar}</span>
                    )}
                    {content.plataformas?.length ? (
                      <span className="text-[9px] text-[var(--text-tertiary)] opacity-35">{content.plataformas.join(' · ')}</span>
                    ) : null}
                    {content.script ? (
                      <span className="text-[9px] text-[var(--accent-green)] font-black uppercase tracking-widest">Com roteiro</span>
                    ) : (
                      <span className="text-[9px] text-[var(--text-tertiary)] italic">Sem roteiro</span>
                    )}
                  </div>
                </div>

                {/* status + data */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
                    STATUS_COLOR[content.status] || STATUS_COLOR['Ideia']
                  )}>
                    {content.status}
                  </span>
                  <span className="text-[10px] font-black text-[var(--text-tertiary)] opacity-30 w-14 text-right hidden md:block">
                    {content.publishDate ? format(new Date(content.publishDate), 'dd/MM/yy') : '—'}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* ── ABA: CONFIGURAÇÕES ── */}
        {tab === 'configuracoes' && (
          <motion.div
            key="configuracoes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 xl:grid-cols-2 gap-8"
          >
            {/* Coluna esquerda */}
            <div className="space-y-6">

              {/* Template */}
              <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-7 py-5 border-b border-[var(--border-color)]">
                  <FileText className="w-4 h-4 opacity-30" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Blueprint — Template</span>
                </div>
                <textarea
                  value={series.template}
                  onChange={e => update({ template: e.target.value })}
                  rows={7}
                  className="w-full text-sm font-medium text-[var(--text-primary)] leading-relaxed border-none focus:ring-0 p-7 bg-transparent resize-none placeholder:italic placeholder:opacity-20"
                  placeholder="Lógica universal desta série: ganchos, ritmos, estrutura narrativa..."
                />
              </section>

              {/* Estrutura de Roteiro */}
              <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-7 py-5 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 opacity-30" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Estrutura de Roteiro</span>
                  </div>
                  <span className="text-[9px] text-[var(--text-tertiary)] italic">{'{{livro}}'} {'{{autor}}'}</span>
                </div>
                <textarea
                  value={series.estruturaRoteiro || ''}
                  onChange={e => update({ estruturaRoteiro: e.target.value })}
                  rows={7}
                  className="w-full text-sm font-medium text-[var(--text-primary)] leading-relaxed border-none focus:ring-0 p-7 bg-transparent resize-none placeholder:italic placeholder:opacity-20"
                  placeholder={"Cena 1 — Gancho:\nCena 2 — Desenvolvimento:\nCena 3 — CTA:"}
                />
              </section>

              {/* Bordão */}
              <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-7 py-5 border-b border-[var(--border-color)]">
                  <MessageSquare className="w-4 h-4 opacity-30" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Bordão / Frase de Identidade</span>
                </div>
                <div className="px-7 py-5">
                  <input
                    value={series.bordao || ''}
                    onChange={e => update({ bordao: e.target.value })}
                    className="w-full text-base font-black italic text-[var(--text-primary)] bg-transparent border-none focus:ring-0 p-0 placeholder:opacity-20"
                    placeholder="A frase que define esta série..."
                  />
                </div>
              </section>

              {/* Notas */}
              <section className="bg-[var(--text-primary)] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-7 py-5 border-b border-[var(--bg-primary)]/10">
                  <Edit3 className="w-4 h-4 text-[var(--bg-primary)] opacity-40" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--bg-primary)] opacity-40">Evolução de Formato</span>
                </div>
                <div className="p-7">
                  <textarea
                    value={series.notes}
                    onChange={e => update({ notes: e.target.value })}
                    rows={8}
                    className="w-full bg-transparent text-sm font-medium text-[var(--bg-primary)] leading-relaxed border-none focus:ring-0 p-0 resize-none placeholder:text-[var(--bg-primary)] placeholder:opacity-20 italic"
                    placeholder="O que funcionou? O que o público pediu? Próximas evoluções..."
                  />
                </div>
              </section>
            </div>

            {/* Coluna direita */}
            <div className="space-y-6">

              {/* Configurações gerais */}
              <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-7 py-5 border-b border-[var(--border-color)]">
                  <Settings2 className="w-4 h-4 opacity-30" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Configurações Gerais</span>
                </div>
                <div className="p-7 space-y-7">

                  {/* Cor */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-3 block">Cor de Identidade</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={series.cor || '#F5C543'}
                        onChange={e => update({ cor: e.target.value })}
                        className="w-9 h-9 rounded-xl border border-[var(--border-color)] cursor-pointer bg-transparent p-0.5"
                      />
                      <span className="text-xs font-black opacity-40 uppercase">{series.cor || '#F5C543'}</span>
                    </div>
                  </div>

                  {/* Pilar */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-3 block">Pilar</label>
                    <select
                      value={series.pilarId || ''}
                      onChange={e => update({ pilarId: e.target.value || undefined })}
                      className="w-full text-xs bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] focus:ring-0"
                    >
                      <option value="">Sem pilar</option>
                      {state.pilares.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>

                  {/* Frequência */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-3 block">Frequência</label>
                    <div className="flex flex-wrap gap-2">
                      {FREQ_OPTIONS.map(f => (
                        <button
                          key={f}
                          onClick={() => update({ frequenciaRecomendada: series.frequenciaRecomendada === f ? undefined : f })}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                            series.frequenciaRecomendada === f
                              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                              : 'text-[var(--text-secondary)] italic hover:bg-[var(--bg-primary)]/50'
                          )}
                        >{f}</button>
                      ))}
                    </div>
                  </div>

                  {/* Slot */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-3 block">Slot Padrão</label>
                    <div className="flex gap-2">
                      {SLOT_OPTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => update({ slotPadrao: series.slotPadrao === s ? undefined : s })}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                            series.slotPadrao === s
                              ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                              : 'border-[var(--border-color)] opacity-40 hover:opacity-100'
                          )}
                        >{s}</button>
                      ))}
                    </div>
                  </div>

                  {/* Formato Visual */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-3 block">Formato Visual</label>
                    <select
                      value={series.formatoVisualPadrao || ''}
                      onChange={e => update({ formatoVisualPadrao: e.target.value as VisualFormat || undefined })}
                      className="w-full text-xs bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] focus:ring-0"
                    >
                      <option value="">Sem formato fixo</option>
                      {VISUAL_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  {/* Plataformas */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-3 block">Plataformas Principais</label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map(plat => (
                        <button
                          key={plat}
                          onClick={() => togglePlatform(plat)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                            (series.plataformasPrincipais || []).includes(plat)
                              ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                              : 'border-[var(--border-color)] opacity-40 hover:opacity-100'
                          )}
                        >{plat}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Hashtags por plataforma */}
              <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-7 py-5 border-b border-[var(--border-color)]">
                  <Hash className="w-4 h-4 opacity-30" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Hashtags por Rede</span>
                </div>
                <div className="p-7 space-y-5">
                  {activePlatforms.map(plat => (
                    <div key={plat}>
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2 block">{plat}</label>
                      <textarea
                        value={series.hashtagsPorPlataforma?.[plat] || ''}
                        onChange={e => updateHashtag(plat, e.target.value)}
                        rows={2}
                        className="w-full text-xs text-[var(--text-primary)] bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:ring-0 resize-none placeholder:italic placeholder:opacity-20"
                        placeholder={`#hashtag1 #hashtag2 #hashtag3`}
                      />
                    </div>
                  ))}
                  <p className="text-[9px] italic opacity-25 leading-relaxed">
                    As hashtags aparecem aqui por plataforma ativa. Para alterar as plataformas, ajuste em "Plataformas Principais" acima.
                  </p>
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de conteúdo */}
      {openContent && (
        <ContentDetailModal
          content={openContent}
          onClose={() => setOpenContent(null)}
        />
      )}

      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
