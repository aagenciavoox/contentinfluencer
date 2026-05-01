import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ChevronDown, ChevronUp, Layout, Plus, Trash2} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import type {Template, TemplateBloco} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';

type TemplateTypeFilter = 'roteiro' | 'legenda' | 'outro';

export function TemplatesSettingsPage() {
  const {state, dispatch} = useAppContext();
  const {user} = useAuth();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TemplateTypeFilter>('roteiro');

  const [novoNome, setNovoNome] = useState('');
  const [novoTipo, setNovoTipo] = useState<TemplateTypeFilter>('roteiro');
  const [novaSerieId, setNovaSerieId] = useState('');
  const [novaPlatformId, setNovaPlatformId] = useState('');

  const [novoBlocoLabel, setNovoBlocoLabel] = useState('');
  const [novoBlocoTipo, setNovoBlocoTipo] = useState<'fixo' | 'variavel'>('variavel');

  const filteredTemplates = useMemo(
    () => state.templates.filter(template => (template.type || 'roteiro') === typeFilter),
    [state.templates, typeFilter]
  );

  const selectedTemplate = filteredTemplates.find(template => template.id === selectedId) || null;

  const handleCreateTemplate = () => {
    if (!novoNome.trim()) return;

    const template: Template = {
      id: crypto.randomUUID(),
      userId: user?.id || '',
      nome: novoNome.trim(),
      type: novoTipo,
      seriesId: novaSerieId || null,
      platformId: novaPlatformId || null,
      estrutura: [],
      ativo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch({type: 'ADD_TEMPLATE', payload: template});
    setNovoNome('');
    setNovaSerieId('');
    setNovaPlatformId('');
    setNovoTipo(typeFilter);
    setShowNewForm(false);
    setSelectedId(template.id);
    setTypeFilter(template.type || 'roteiro');
  };

  const updateTemplate = (template: Template) => {
    dispatch({
      type: 'UPDATE_TEMPLATE',
      payload: {
        ...template,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const deleteTemplate = (id: string) => {
    if (!window.confirm('Excluir este template?')) return;
    dispatch({type: 'DELETE_TEMPLATE', payload: id});
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

    updateTemplate({...selectedTemplate, estrutura: [...selectedTemplate.estrutura, bloco]});
    setNovoBlocoLabel('');
  };

  const updateBloco = (bloco: TemplateBloco, field: keyof TemplateBloco, value: string) => {
    if (!selectedTemplate) return;
    updateTemplate({
      ...selectedTemplate,
      estrutura: selectedTemplate.estrutura.map(item =>
        item.id === bloco.id ? {...item, [field]: value} : item
      ),
    });
  };

  const deleteBloco = (blocoId: string) => {
    if (!selectedTemplate) return;
    updateTemplate({
      ...selectedTemplate,
      estrutura: selectedTemplate.estrutura.filter(bloco => bloco.id !== blocoId),
    });
  };

  const moveBloco = (bloco: TemplateBloco, dir: -1 | 1) => {
    if (!selectedTemplate) return;
    const list = [...selectedTemplate.estrutura];
    const idx = list.findIndex(item => item.id === bloco.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= list.length) return;
    [list[idx], list[swap]] = [list[swap], list[idx]];
    updateTemplate({...selectedTemplate, estrutura: list});
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <header className="desktop-header-sticky transition-colors duration-300">
        <div className="desktop-header-frame">
          <DesktopPageHeader
            section="Configurações"
            title="Templates"
            subtitle="Crie estruturas reutilizáveis por tipo de template, série e plataforma."
            icon={Layout}
            backLabel="Configurações"
            onBack={() => navigate('/configuracoes')}
            actions={
              <button
                onClick={() => {
                  setNovoTipo(typeFilter);
                  setShowNewForm(true);
                }}
                className="flex shrink-0 items-center gap-2 rounded-2xl bg-[var(--text-primary)] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-[var(--bg-primary)] hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Novo
              </button>
            }
          />
        </div>
      </header>

      <div className="desktop-content-frame space-y-6">
        <div className="flex flex-wrap gap-2">
          {(['roteiro', 'legenda', 'outro'] as TemplateTypeFilter[]).map(type => (
            <button
              key={type}
              onClick={() => {
                setTypeFilter(type);
                setSelectedId(null);
              }}
              className={cn(
                'rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all',
                typeFilter === type
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'bg-[var(--bg-primary)] text-[var(--text-tertiary)] border border-[var(--border-color)]'
              )}
            >
              {type}
            </button>
          ))}
        </div>

        {showNewForm && (
          <div className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Novo Template</p>
            <input
              autoFocus
              value={novoNome}
              onChange={event => setNovoNome(event.target.value)}
              placeholder="Nome do template"
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
            />
            <div className="flex flex-wrap gap-3">
              <select
                value={novoTipo}
                onChange={event => setNovoTipo(event.target.value as TemplateTypeFilter)}
                className="flex-1 min-w-[120px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 text-[11px] font-black uppercase text-[var(--text-primary)] focus:outline-none"
              >
                <option value="roteiro">Roteiro</option>
                <option value="legenda">Legenda</option>
                <option value="outro">Outro</option>
              </select>
              <select
                value={novaSerieId}
                onChange={event => setNovaSerieId(event.target.value)}
                className="flex-1 min-w-[120px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none"
              >
                <option value="">Série (opcional)</option>
                {state.series.map(serie => (
                  <option key={serie.id} value={serie.id}>
                    {serie.name}
                  </option>
                ))}
              </select>
              <select
                value={novaPlatformId}
                onChange={event => setNovaPlatformId(event.target.value)}
                className="flex-1 min-w-[120px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none"
              >
                <option value="">Plataforma (opcional)</option>
                {state.platforms.filter(platform => platform.ativo).map(platform => (
                  <option key={platform.id} value={platform.id}>
                    {platform.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateTemplate}
                disabled={!novoNome.trim()}
                className="rounded-xl bg-[var(--text-primary)] px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-30"
              >
                Criar
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="rounded-xl border border-[var(--border-color)] px-6 py-2.5 text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-80"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6 md:flex-row">
          <div className="shrink-0 space-y-2 md:w-72">
            {filteredTemplates.length === 0 && !showNewForm && (
              <div className="py-12 text-center">
                <Layout className="mx-auto mb-2 h-8 w-8 opacity-10" />
                <p className="text-sm font-black uppercase tracking-widest opacity-30">
                  Nenhum template de {typeFilter}
                </p>
              </div>
            )}

            {filteredTemplates.map(template => {
              const serie = state.series.find(item => item.id === template.seriesId);
              const platform = state.platforms.find(item => item.id === template.platformId);
              return (
                <div
                  key={template.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all',
                    selectedId === template.id
                      ? 'border-[var(--text-primary)]/30 bg-[var(--bg-hover)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--text-primary)]/20'
                  )}
                  onClick={() => setSelectedId(template.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[var(--text-primary)]">{template.nome}</p>
                    <p className="truncate text-[10px] font-bold opacity-40">
                      {[template.type || 'roteiro', serie?.name, platform?.nome].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      deleteTemplate(template.id);
                    }}
                    className="shrink-0 p-1 opacity-20 transition-all hover:text-red-400 hover:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {selectedTemplate && (
            <div className="min-w-0 flex-1">
              <div className="space-y-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    Blocos — {selectedTemplate.nome}
                  </p>
                  <span className="rounded-full bg-[var(--bg-hover)] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)]">
                    {selectedTemplate.type || 'roteiro'}
                  </span>
                </div>

                {selectedTemplate.estrutura.length === 0 && (
                  <p className="py-4 text-center text-sm font-bold opacity-30">Nenhum bloco ainda</p>
                )}

                {selectedTemplate.estrutura.map((bloco, idx) => (
                  <div
                    key={bloco.id}
                    className="flex items-start gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                  >
                    <div className="mt-1 flex shrink-0 flex-col gap-0.5">
                      <button
                        onClick={() => moveBloco(bloco, -1)}
                        disabled={idx === 0}
                        className="p-0.5 opacity-30 hover:opacity-80 disabled:opacity-10"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveBloco(bloco, 1)}
                        disabled={idx === selectedTemplate.estrutura.length - 1}
                        className="p-0.5 opacity-30 hover:opacity-80 disabled:opacity-10"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          defaultValue={bloco.label}
                          onBlur={event => updateBloco(bloco, 'label', event.target.value)}
                          className="min-w-[100px] flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1.5 text-[11px] font-black text-[var(--text-primary)] focus:outline-none"
                        />
                        <span
                          className={cn(
                            'rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest',
                            bloco.tipo === 'fixo'
                              ? 'bg-blue-400/10 text-blue-400'
                              : 'bg-orange-400/10 text-orange-400'
                          )}
                        >
                          {bloco.tipo}
                        </span>
                      </div>

                      {bloco.tipo === 'fixo' ? (
                        <textarea
                          defaultValue={bloco.conteudo}
                          onBlur={event => updateBloco(bloco, 'conteudo', event.target.value)}
                          placeholder="Conteúdo fixo..."
                          rows={2}
                          className="w-full resize-none rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                        />
                      ) : (
                        <input
                          defaultValue={bloco.placeholder}
                          onBlur={event => updateBloco(bloco, 'placeholder', event.target.value)}
                          placeholder="Placeholder da variável..."
                          className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => deleteBloco(bloco.id)}
                      className="mt-1 shrink-0 p-1.5 opacity-20 transition-all hover:text-red-400 hover:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex gap-2 border-t border-[var(--border-color)] pt-2">
                  <input
                    value={novoBlocoLabel}
                    onChange={event => setNovoBlocoLabel(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && addBloco()}
                    placeholder="Label do bloco"
                    className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                  />
                  <select
                    value={novoBlocoTipo}
                    onChange={event => setNovoBlocoTipo(event.target.value as 'fixo' | 'variavel')}
                    className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-[10px] font-black uppercase text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="variavel">Variável</option>
                    <option value="fixo">Fixo</option>
                  </select>
                  <button
                    onClick={addBloco}
                    disabled={!novoBlocoLabel.trim()}
                    className="rounded-lg bg-[var(--text-primary)] p-2 text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-30"
                  >
                    <Plus className="h-4 w-4" />
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
