import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Check, ChevronDown, ChevronUp, Layout, Plus, Trash2} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import type {Template, TemplateBloco} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {FixedPanelModal} from '../../../components/overlays/FixedPanelModal';
import {TemplatesMobileScreen} from '../../../mobile/screens/settings/TemplatesMobileScreen';

type TemplateTypeFilter = 'roteiro' | 'legenda' | 'outro';

type TemplateEditorState = {
  nome: string;
  type: TemplateTypeFilter;
  seriesId: string;
  platformId: string;
};

type BlocoEditorState = {
  label: string;
  conteudo: string;
  placeholder: string;
};

const EMPTY_TEMPLATE_EDITOR: TemplateEditorState = {
  nome: '',
  type: 'roteiro',
  seriesId: '',
  platformId: '',
};

const EMPTY_BLOCO_EDITOR: BlocoEditorState = {
  label: '',
  conteudo: '',
  placeholder: '',
};

export function TemplatesSettingsPage() {
  const {state, dispatch} = useAppContext();
  const {user} = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [showNewForm, setShowNewForm] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTipo, setNovoTipo] = useState<TemplateTypeFilter>('roteiro');
  const [novaSerieId, setNovaSerieId] = useState('');
  const [novaPlatformId, setNovaPlatformId] = useState('');

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateEditor, setTemplateEditor] = useState<TemplateEditorState>(EMPTY_TEMPLATE_EDITOR);
  const [editingBlocoId, setEditingBlocoId] = useState<string | null>(null);
  const [blocoEditor, setBlocoEditor] = useState<BlocoEditorState>(EMPTY_BLOCO_EDITOR);
  const [novoBlocoLabel, setNovoBlocoLabel] = useState('');
  const [novoBlocoTipo, setNovoBlocoTipo] = useState<'fixo' | 'variavel'>('variavel');

  const templates = useMemo(
    () => [...state.templates].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [state.templates]
  );

  const selectedTemplate = templates.find(template => template.id === selectedTemplateId) || null;
  const editingBloco = selectedTemplate?.estrutura.find(bloco => bloco.id === editingBlocoId) || null;

  const openTemplateEditor = (template: Template) => {
    setSelectedTemplateId(template.id);
    setTemplateEditor({
      nome: template.nome,
      type: template.type || 'roteiro',
      seriesId: template.seriesId || '',
      platformId: template.platformId || '',
    });

    const firstBloco = template.estrutura[0] || null;
    if (firstBloco) {
      setEditingBlocoId(firstBloco.id);
      setBlocoEditor({
        label: firstBloco.label,
        conteudo: firstBloco.conteudo,
        placeholder: firstBloco.placeholder,
      });
    } else {
      setEditingBlocoId(null);
      setBlocoEditor(EMPTY_BLOCO_EDITOR);
    }
  };

  const closeTemplateEditor = () => {
    setSelectedTemplateId(null);
    setEditingBlocoId(null);
    setTemplateEditor(EMPTY_TEMPLATE_EDITOR);
    setBlocoEditor(EMPTY_BLOCO_EDITOR);
    setNovoBlocoLabel('');
    setNovoBlocoTipo('variavel');
  };

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
    setNovoTipo('roteiro');
    setShowNewForm(false);
    openTemplateEditor(template);
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

  const saveTemplateMeta = () => {
    if (!selectedTemplate || !templateEditor.nome.trim()) return;

    updateTemplate({
      ...selectedTemplate,
      nome: templateEditor.nome.trim(),
      type: templateEditor.type,
      seriesId: templateEditor.seriesId || null,
      platformId: templateEditor.platformId || null,
    });
  };

  const deleteTemplate = (id: string) => {
    if (!window.confirm('Excluir este template?')) return;
    dispatch({type: 'DELETE_TEMPLATE', payload: id});
    if (selectedTemplateId === id) closeTemplateEditor();
  };

  const selectBloco = (bloco: TemplateBloco) => {
    setEditingBlocoId(bloco.id);
    setBlocoEditor({
      label: bloco.label,
      conteudo: bloco.conteudo,
      placeholder: bloco.placeholder,
    });
  };

  const saveBloco = () => {
    if (!selectedTemplate || !editingBloco || !blocoEditor.label.trim()) return;

    updateTemplate({
      ...selectedTemplate,
      estrutura: selectedTemplate.estrutura.map(bloco =>
        bloco.id === editingBloco.id
          ? {
              ...bloco,
              label: blocoEditor.label.trim(),
              conteudo: blocoEditor.conteudo,
              placeholder: blocoEditor.placeholder,
            }
          : bloco
      ),
    });
  };

  const deleteBloco = (blocoId: string) => {
    if (!selectedTemplate) return;

    const nextEstrutura = selectedTemplate.estrutura.filter(bloco => bloco.id !== blocoId);
    updateTemplate({
      ...selectedTemplate,
      estrutura: nextEstrutura,
    });

    const fallback = nextEstrutura[0] || null;
    if (fallback) {
      selectBloco(fallback);
    } else {
      setEditingBlocoId(null);
      setBlocoEditor(EMPTY_BLOCO_EDITOR);
    }
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

  const addBloco = () => {
    if (!selectedTemplate || !novoBlocoLabel.trim()) return;

    const bloco: TemplateBloco = {
      id: crypto.randomUUID(),
      tipo: novoBlocoTipo,
      label: novoBlocoLabel.trim(),
      conteudo: '',
      placeholder: '',
    };

    updateTemplate({
      ...selectedTemplate,
      estrutura: [...selectedTemplate.estrutura, bloco],
    });

    setNovoBlocoLabel('');
    selectBloco(bloco);
  };

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <TemplatesMobileScreen
          templates={state.templates}
          series={state.series}
          platforms={state.platforms}
          onCreate={template => dispatch({type: 'ADD_TEMPLATE', payload: {...template, userId: user?.id || ''}})}
          onDelete={templateId => dispatch({type: 'DELETE_TEMPLATE', payload: templateId})}
        />
      </div>
    );
  }

  const isTemplateMetaDirty =
    !!selectedTemplate &&
    (
      templateEditor.nome !== selectedTemplate.nome ||
      templateEditor.type !== (selectedTemplate.type || 'roteiro') ||
      templateEditor.seriesId !== (selectedTemplate.seriesId || '') ||
      templateEditor.platformId !== (selectedTemplate.platformId || '')
    );

  const isBlocoDirty =
    !!editingBloco &&
    (
      blocoEditor.label !== editingBloco.label ||
      blocoEditor.conteudo !== editingBloco.conteudo ||
      blocoEditor.placeholder !== editingBloco.placeholder
    );

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <header className="desktop-header-sticky transition-colors duration-300">
        <div className="desktop-header-frame">
          <DesktopPageHeader
            section="Configurações"
            title="Templates"
            subtitle="Um catálogo único de estruturas reutilizáveis, com tipo definido por tag."
            icon={Layout}
            backLabel="Configurações"
            onBack={() => navigate('/configuracoes')}
            actions={
              <button
                onClick={() => setShowNewForm(true)}
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
        {showNewForm && (
          <div className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Novo template</p>
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

        {templates.length === 0 && !showNewForm ? (
          <div className="py-16 text-center">
            <Layout className="mx-auto mb-3 h-10 w-10 opacity-10" />
            <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhum template ainda</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.map(template => {
              const serie = state.series.find(item => item.id === template.seriesId);
              const platform = state.platforms.find(item => item.id === template.platformId);

              return (
                <div
                  key={template.id}
                  onClick={() => openTemplateEditor(template)}
                  className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--text-primary)]/20 hover:shadow-lg"
                >
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">
                        {template.type || 'roteiro'}
                      </span>
                      {serie ? (
                        <span className="rounded-full bg-[var(--accent-purple)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--accent-purple)]">
                          {serie.name}
                        </span>
                      ) : null}
                      {platform ? (
                        <span className="rounded-full bg-[var(--accent-green)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--accent-green)]">
                          {platform.nome}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-base font-black text-[var(--text-primary)]">{template.nome}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {template.estrutura.length} bloco{template.estrutura.length === 1 ? '' : 's'} estruturado{template.estrutura.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteTemplate(template.id);
                    }}
                    className="shrink-0 rounded-full p-2 opacity-20 transition-all hover:bg-red-400/10 hover:text-red-400 hover:opacity-80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FixedPanelModal
        open={!!selectedTemplate}
        onClose={closeTemplateEditor}
        desktopMaxW="md:max-w-[1240px]"
        desktopPanelClassName="md:w-[1360px] md:h-[920px] md:max-w-[calc(100vw-32px)] md:max-h-[calc(100dvh-32px)] md:rounded-[32px]"
      >
        {selectedTemplate ? (
          <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-primary)]">
            <div className="border-b border-[var(--border-color)] px-6 py-5 md:px-8 md:py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                    Template
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)] md:text-3xl">
                    {selectedTemplate.nome}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Edite contexto e estrutura no mesmo modal, sem etapa intermediária de visualização.
                  </p>
                </div>
                <button
                  onClick={() => deleteTemplate(selectedTemplate.id)}
                  className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-red-400 hover:bg-red-400/10"
                >
                  Excluir template
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[340px_minmax(0,1fr)]">
              <aside className="border-r border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 md:p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                      Nome
                    </label>
                    <input
                      value={templateEditor.nome}
                      onChange={event => setTemplateEditor(previous => ({...previous, nome: event.target.value}))}
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                      Tipo
                    </label>
                    <select
                      value={templateEditor.type}
                      onChange={event => setTemplateEditor(previous => ({...previous, type: event.target.value as TemplateTypeFilter}))}
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[11px] font-black uppercase text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="roteiro">Roteiro</option>
                      <option value="legenda">Legenda</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                      Série
                    </label>
                    <select
                      value={templateEditor.seriesId}
                      onChange={event => setTemplateEditor(previous => ({...previous, seriesId: event.target.value}))}
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="">Sem série</option>
                      {state.series.map(serie => (
                        <option key={serie.id} value={serie.id}>
                          {serie.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                      Plataforma
                    </label>
                    <select
                      value={templateEditor.platformId}
                      onChange={event => setTemplateEditor(previous => ({...previous, platformId: event.target.value}))}
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="">Sem plataforma</option>
                      {state.platforms.filter(platform => platform.ativo).map(platform => (
                        <option key={platform.id} value={platform.id}>
                          {platform.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={saveTemplateMeta}
                    disabled={!templateEditor.nome.trim() || !isTemplateMetaDirty}
                    className="w-full rounded-xl bg-[var(--text-primary)] px-4 py-3 text-[11px] font-black uppercase tracking-widest text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-30"
                  >
                    Salvar contexto
                  </button>
                </div>

                <div className="mt-6 border-t border-[var(--border-color)] pt-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                      Blocos
                    </p>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                      {selectedTemplate.estrutura.length} itens
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedTemplate.estrutura.map((bloco, idx) => (
                      <div
                        key={bloco.id}
                        className={cn(
                          'rounded-2xl border p-3 transition-all',
                          editingBlocoId === bloco.id
                            ? 'border-[var(--text-primary)]/30 bg-[var(--bg-primary)]'
                            : 'border-[var(--border-color)] bg-[var(--bg-hover)]'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 flex shrink-0 flex-col gap-0.5">
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

                          <button type="button" onClick={() => selectBloco(bloco)} className="min-w-0 flex-1 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-black text-[var(--text-primary)]">{bloco.label}</p>
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
                            <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs leading-relaxed text-[var(--text-secondary)]">
                              {bloco.tipo === 'fixo'
                                ? bloco.conteudo || 'Sem conteúdo fixo ainda.'
                                : bloco.placeholder || 'Sem placeholder definido ainda.'}
                            </p>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-[var(--border-color)] pt-4">
                    <input
                      value={novoBlocoLabel}
                      onChange={event => setNovoBlocoLabel(event.target.value)}
                      onKeyDown={event => event.key === 'Enter' && addBloco()}
                      placeholder="Novo bloco"
                      className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                    />
                    <select
                      value={novoBlocoTipo}
                      onChange={event => setNovoBlocoTipo(event.target.value as 'fixo' | 'variavel')}
                      className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-[10px] font-black uppercase text-[var(--text-primary)] focus:outline-none"
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
              </aside>

              <section className="min-h-0 overflow-y-auto p-5 md:p-8">
                {editingBloco ? (
                  <div className="mx-auto max-w-3xl space-y-5">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                        Edição do bloco
                      </p>
                      <h3 className="text-2xl font-black text-[var(--text-primary)]">{editingBloco.label}</h3>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                        Label
                      </label>
                      <input
                        value={blocoEditor.label}
                        onChange={event => setBlocoEditor(previous => ({...previous, label: event.target.value}))}
                        className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                        {editingBloco.tipo === 'fixo' ? 'Conteúdo fixo' : 'Placeholder da variável'}
                      </label>
                      <textarea
                        value={editingBloco.tipo === 'fixo' ? blocoEditor.conteudo : blocoEditor.placeholder}
                        onChange={event =>
                          editingBloco.tipo === 'fixo'
                            ? setBlocoEditor(previous => ({...previous, conteudo: event.target.value}))
                            : setBlocoEditor(previous => ({...previous, placeholder: event.target.value}))
                        }
                        placeholder={
                          editingBloco.tipo === 'fixo'
                            ? 'Escreva o conteúdo base deste bloco...'
                            : 'Explique o que precisa ser preenchido neste bloco...'
                        }
                        rows={editingBloco.tipo === 'fixo' ? 16 : 12}
                        className="min-h-[340px] w-full resize-y rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4 text-sm leading-7 text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3 border-t border-[var(--border-color)] pt-4">
                      <button
                        onClick={saveBloco}
                        disabled={!blocoEditor.label.trim() || !isBlocoDirty}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-primary)] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-30"
                      >
                        <Check className="h-4 w-4" />
                        Salvar bloco
                      </button>
                      <button
                        onClick={() => deleteBloco(editingBloco.id)}
                        className="rounded-xl border border-red-400/20 bg-red-400/5 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-red-400 hover:bg-red-400/10"
                      >
                        Excluir bloco
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] px-8 text-center">
                    <div className="space-y-3">
                      <Layout className="mx-auto h-10 w-10 opacity-20" />
                      <p className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)] opacity-40">
                        Selecione um bloco
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Clique em qualquer bloco da coluna lateral para abrir a edição direta neste modal.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </FixedPanelModal>
    </div>
  );
}
