import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronUp, ChevronDown, Layout, Check, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import type { Template, TemplateBloco } from '../../lib/database';
import { cn } from '../../lib/utils';
import { DesktopPageHeader } from '../../components/layout/DesktopPageHeader';

export function TemplatesSettings() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  // Form novo template
  const [novoNome, setNovoNome] = useState('');
  const [novaSerieId, setNovaSerieId] = useState('');
  const [novaPlatformId, setNovaPlatformId] = useState('');

  // Editor de blocos (para template selecionado)
  const [novoBlocoLabel, setNovoBlocoLabel] = useState('');
  const [novoBlocoTipo, setNovoBlocoTipo] = useState<'fixo' | 'variavel'>('variavel');

  const selectedTemplate = state.templates.find(t => t.id === selectedId);

  const handleCreateTemplate = () => {
    if (!novoNome.trim()) return;
    const template: Template = {
      id: crypto.randomUUID(),
      userId: user?.id || '',
      nome: novoNome.trim(),
      seriesId: novaSerieId || null,
      platformId: novaPlatformId || null,
      estrutura: [],
      ativo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TEMPLATE', payload: template });
    setNovoNome('');
    setNovaSerieId('');
    setNovaPlatformId('');
    setShowNewForm(false);
    setSelectedId(template.id);
  };

  const updateTemplate = (template: Template) => {
    dispatch({ type: 'UPDATE_TEMPLATE', payload: { ...template, updatedAt: new Date().toISOString() } });
  };

  const deleteTemplate = (id: string) => {
    if (!window.confirm('Excluir este template?')) return;
    dispatch({ type: 'DELETE_TEMPLATE', payload: id });
    if (selectedId === id) setSelectedId(null);
  };

  const addBloco = () => {
    if (!selectedTemplate || !novoBlocoLabel.trim()) return;
    const bloco: TemplateBloco = {
      id: crypto.randomUUID(),
      tipo: novoBlocoTipo,
      label: novoBlocoLabel.trim(),
      conteudo: '',
      placeholder: '',
    };
    updateTemplate({ ...selectedTemplate, estrutura: [...selectedTemplate.estrutura, bloco] });
    setNovoBlocoLabel('');
  };

  const updateBloco = (bloco: TemplateBloco, field: keyof TemplateBloco, value: string) => {
    if (!selectedTemplate) return;
    const estrutura = selectedTemplate.estrutura.map(b => b.id === bloco.id ? { ...b, [field]: value } : b);
    updateTemplate({ ...selectedTemplate, estrutura });
  };

  const deleteBloco = (blocoId: string) => {
    if (!selectedTemplate) return;
    updateTemplate({ ...selectedTemplate, estrutura: selectedTemplate.estrutura.filter(b => b.id !== blocoId) });
  };

  const moveBloco = (bloco: TemplateBloco, dir: -1 | 1) => {
    if (!selectedTemplate) return;
    const list = [...selectedTemplate.estrutura];
    const idx = list.findIndex(b => b.id === bloco.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= list.length) return;
    [list[idx], list[swap]] = [list[swap], list[idx]];
    updateTemplate({ ...selectedTemplate, estrutura: list });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <header className="desktop-header-sticky transition-colors duration-300">
        <div className="desktop-header-frame">
        <DesktopPageHeader
          section="Configurações"
          title="Templates"
          subtitle="Crie estruturas reutilizáveis para acelerar a produção de roteiros e formatos."
          icon={Layout}
          backLabel="Configurações"
          onBack={() => navigate('/configuracoes')}
          actions={(
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-2 px-5 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Novo
            </button>
          )}
        />
        </div>
      </header>

      <div className="desktop-content-frame">

        {/* Form novo template */}
        {showNewForm && (
          <div className="mb-6 p-6 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Novo Template</p>
            <input
              autoFocus
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              placeholder="Nome do template"
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
            />
            <div className="flex flex-wrap gap-3">
              <select value={novaSerieId} onChange={e => setNovaSerieId(e.target.value)} className="flex-1 min-w-[120px] px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] font-bold text-[var(--text-primary)] focus:outline-none">
                <option value="">Série (opcional)</option>
                {state.series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={novaPlatformId} onChange={e => setNovaPlatformId(e.target.value)} className="flex-1 min-w-[120px] px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] font-bold text-[var(--text-primary)] focus:outline-none">
                <option value="">Plataforma (opcional)</option>
                {state.platforms.filter(p => p.ativo).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreateTemplate} disabled={!novoNome.trim()} className="px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-30">Criar</button>
              <button onClick={() => setShowNewForm(false)} className="px-6 py-2.5 border border-[var(--border-color)] rounded-xl text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-80">Cancelar</button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Lista de templates */}
          <div className="md:w-64 shrink-0 space-y-2">
            {state.templates.length === 0 && !showNewForm && (
              <div className="text-center py-12">
                <Layout className="w-8 h-8 mx-auto opacity-10 mb-2" />
                <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhum template</p>
              </div>
            )}
            {state.templates.map(t => {
              const serie = state.series.find(s => s.id === t.seriesId);
              const platform = state.platforms.find(p => p.id === t.platformId);
              return (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border',
                    selectedId === t.id
                      ? 'border-[var(--text-primary)]/30 bg-[var(--bg-hover)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--text-primary)]/20'
                  )}
                  onClick={() => setSelectedId(t.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[var(--text-primary)] truncate">{t.nome}</p>
                    <p className="text-[10px] font-bold opacity-40 truncate">
                      {[serie?.name, platform?.nome].filter(Boolean).join(' · ') || 'Geral'}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteTemplate(t.id); }}
                    className="p-1 opacity-20 hover:opacity-60 hover:text-red-400 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Editor de blocos */}
          {selectedTemplate && (
            <div className="flex-1 min-w-0">
              <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  Blocos — {selectedTemplate.nome}
                </p>

                {/* Blocos existentes */}
                {selectedTemplate.estrutura.length === 0 && (
                  <p className="text-sm opacity-30 font-bold text-center py-4">Nenhum bloco ainda</p>
                )}
                {selectedTemplate.estrutura.map((bloco, idx) => (
                  <div key={bloco.id} className="flex gap-3 items-start p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                    <div className="flex flex-col gap-0.5 shrink-0 mt-1">
                      <button onClick={() => moveBloco(bloco, -1)} disabled={idx === 0} className="p-0.5 opacity-30 hover:opacity-80 disabled:opacity-10">
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => moveBloco(bloco, 1)} disabled={idx === selectedTemplate.estrutura.length - 1} className="p-0.5 opacity-30 hover:opacity-80 disabled:opacity-10">
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          defaultValue={bloco.label}
                          onBlur={e => updateBloco(bloco, 'label', e.target.value)}
                          className="flex-1 min-w-[100px] px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[11px] font-black text-[var(--text-primary)] focus:outline-none"
                        />
                        <span className={cn(
                          'px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
                          bloco.tipo === 'fixo' ? 'bg-blue-400/10 text-blue-400' : 'bg-orange-400/10 text-orange-400'
                        )}>
                          {bloco.tipo}
                        </span>
                      </div>
                      {bloco.tipo === 'fixo' ? (
                        <textarea
                          defaultValue={bloco.conteudo}
                          onBlur={e => updateBloco(bloco, 'conteudo', e.target.value)}
                          placeholder="Conteúdo fixo..."
                          rows={2}
                          className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none resize-none"
                        />
                      ) : (
                        <input
                          defaultValue={bloco.placeholder}
                          onBlur={e => updateBloco(bloco, 'placeholder', e.target.value)}
                          placeholder="Placeholder para variável..."
                          className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                        />
                      )}
                    </div>
                    <button onClick={() => deleteBloco(bloco.id)} className="p-1.5 opacity-20 hover:opacity-60 hover:text-red-400 transition-all mt-1 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Adicionar bloco */}
                <div className="flex gap-2 pt-2 border-t border-[var(--border-color)]">
                  <input
                    value={novoBlocoLabel}
                    onChange={e => setNovoBlocoLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addBloco()}
                    placeholder="Label do bloco"
                    className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                  />
                  <select
                    value={novoBlocoTipo}
                    onChange={e => setNovoBlocoTipo(e.target.value as 'fixo' | 'variavel')}
                    className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[10px] font-black uppercase text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="variavel">Variável</option>
                    <option value="fixo">Fixo</option>
                  </select>
                  <button
                    onClick={addBloco}
                    disabled={!novoBlocoLabel.trim()}
                    className="p-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg hover:opacity-90 disabled:opacity-30"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
