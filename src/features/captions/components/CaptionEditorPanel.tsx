import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Calendar, Check, Copy, Layers, MoreVertical, Plus, Trash2, X } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { cn } from '../../../lib/utils';
import type { Content, ContentPlataforma, Pilar, Serie } from '../../../lib/database';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { contaDaRef, iconeDaConta, rotuloConta, redeDaRef, type ContaRef } from '../../contas/lib/contas';
import { CopyCaptionToAccountsModal } from './CopyCaptionToAccountsModal';
import { limiteDoCampo } from '../../editorial/lib/platformFields';
import { parseHashtags, joinHashtags } from '../../contents/lib/captionHashtags';
import { legendaEfetiva, hashtagsNaLegenda, legendasQueSeriamApagadas, publicacaoJaPostada } from '../../editorial/lib/captions';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { alternarDestino } from '../../editorial/lib/destinations';

interface CaptionEditorPanelProps {
  content: Content;
  selectedPublicacaoId: string | null;
  onSelectPublicacaoId: (id: string) => void;
  onSaveContent: (content: Content) => Promise<void>;
  series: Serie[];
  pilares: Pilar[];
  contas: readonly ContaRef[];
  onBackToList?: () => void;
}

export function CaptionEditorPanel({
  content,
  selectedPublicacaoId,
  onSelectPublicacaoId,
  onSaveContent,
  series,
  pilares,
  contas,
  onBackToList,
}: CaptionEditorPanelProps) {
  const activePublicacoes = useMemo(() => {
    return content.plataformas.filter(p => !publicacaoJaPostada(p, content));
  }, [content.plataformas, content]);

  const publicacao = useMemo(() => {
    if (selectedPublicacaoId) {
      const match = activePublicacoes.find(p => p.id === selectedPublicacaoId);
      if (match) return match;
    }
    return activePublicacoes[0] || null;
  }, [activePublicacoes, selectedPublicacaoId]);

  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving'>('saved');
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copiedPronto, setCopiedPronto] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [desativarPendente, setDesativarPendente] = useState<string | null>(null);

  // Local draft state for the current publication
  const [localText, setLocalText] = useState('');
  const [localTags, setLocalTags] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const rede = redeDaRef(publicacao?.platformId, contas) || 'instagram';

  const pubDesativarPendente = content.plataformas.find(p => p.id === desativarPendente);
  const contaDesativarPendente = pubDesativarPendente ? contaDaRef(pubDesativarPendente.platformId, contas) : null;
  const nomeDesativarPendente = contaDesativarPendente
    ? rotuloConta(contaDesativarPendente)
    : pubDesativarPendente?.platformId ?? 'esta conta';

  const serie = series.find(s => s.id === content.seriesId);
  const pilar = pilares.find(p => p.id === content.pilarId);

  const limiteCaracteres = limiteDoCampo(rede, 'legenda') || 2200;
  const limiteTags = 30;

  // Unconfigured accounts that can be activated
  const contasDisponiveisParaAtivar = useMemo(() => {
    const idsAtivos = new Set(activePublicacoes.map(p => p.platformId));
    return contas.filter(c => !idsAtivos.has(c.id));
  }, [activePublicacoes, contas]);

  // Sync draft when publicacao or content changes
  useEffect(() => {
    if (!publicacao) return;
    const initialText = legendaEfetiva(content.legendaBase, publicacao);
    setLocalText(initialText);

    const fromText = hashtagsNaLegenda(initialText);
    const fromField = parseHashtags(publicacao.hashtags || '');
    const combined = Array.from(new Set([...fromText, ...fromField]));
    setLocalTags(combined);
  }, [publicacao?.id, content.id, content.legendaBase]);

  // Auto-resize textarea smoothly with max height
  useLayoutEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    const nextHeight = Math.max(200, Math.min(node.scrollHeight, 550));
    node.style.height = `${nextHeight}px`;
  }, [localText]);

  // Debounced auto-save
  const timerRef = useRef<number | null>(null);
  const onSaveRef = useRef(onSaveContent);
  onSaveRef.current = onSaveContent;

  const triggerSave = useCallback(
    (textToSave: string, tagsToSave: string[]) => {
      if (!publicacao) return;
      setSavingStatus('saving');
      if (timerRef.current) window.clearTimeout(timerRef.current);

      timerRef.current = window.setTimeout(async () => {
        timerRef.current = null;
        const updatedPlataformas = content.plataformas.map(p => {
          if (p.id === publicacao.id) {
            return {
              ...p,
              legenda: textToSave,
              hashtags: joinHashtags(tagsToSave),
              legendaPropria: true,
            };
          }
          return p;
        });

        try {
          await onSaveRef.current({
            ...content,
            plataformas: updatedPlataformas,
          });
          setSavingStatus('saved');
        } catch {
          setSavingStatus('saved');
        }
      }, 600);
    },
    [content, publicacao],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleTextChange = (newText: string) => {
    setLocalText(newText);
    const fromText = hashtagsNaLegenda(newText);
    const combined = Array.from(new Set([...fromText, ...localTags]));
    setLocalTags(combined);
    triggerSave(newText, combined);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = localTags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
    setLocalTags(nextTags);

    // Also remove tag from text if it's there
    const regex = new RegExp(`(^|\\s)#?${tagToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'gi');
    const nextText = localText.replace(regex, ' ').replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    setLocalText(nextText);

    triggerSave(nextText, nextTags);
  };

  const handleAddTag = () => {
    const raw = newTagInput.trim().replace(/^#+/, '');
    if (!raw) return;

    if (!localTags.some(t => t.toLowerCase() === raw.toLowerCase())) {
      const nextTags = [...localTags, raw];
      setLocalTags(nextTags);

      // Append tag to text if not present
      const tagWithHash = `#${raw}`;
      const nextText = localText.includes(tagWithHash)
        ? localText
        : localText.trim()
        ? `${localText.trim()} ${tagWithHash}`
        : tagWithHash;

      setLocalText(nextText);
      triggerSave(nextText, nextTags);
    }
    setNewTagInput('');
  };

  // Interpolate template variables
  const templateDaSerie = serie
    ? serie.plataformas?.find(p => p.platformId === publicacao?.platformId)?.legenda ||
      serie.legendaBase ||
      serie.template ||
      ''
    : '';

  const handleApplyTemplate = () => {
    if (!serie) return;
    const templateText = templateDaSerie;

    if (!templateText.trim()) return;

    const dataPublicacao = publicacao?.publishDate || content.publishDate || '';
    const interpolado = templateText
      .replace(/\{titulo\}/gi, content.title || '')
      .replace(/\{serie\}/gi, serie.name || '')
      .replace(/\{pilar\}/gi, pilar?.nome || '')
      .replace(/\{data\}/gi, dataPublicacao);

    setLocalText(interpolado);
    const fromText = hashtagsNaLegenda(interpolado);
    const combined = Array.from(new Set([...fromText, ...localTags]));
    setLocalTags(combined);
    triggerSave(interpolado, combined);
  };

  // Quick action: copy ready caption with tags to clipboard
  const handleCopyReadyCaption = async () => {
    const fullText = [localText.trim(), joinHashtags(localTags).trim()]
      .filter(Boolean)
      .join('\n\n');

    if (!fullText) return;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedPronto(true);
      window.setTimeout(() => setCopiedPronto(false), 1600);
    } catch {
      setCopiedPronto(false);
    }
  };

  const handleConfirmCopyToAccounts = async (
    targetIds: string[],
    copyText: boolean,
    copyTags: boolean,
  ) => {
    const updatedPlataformas = content.plataformas.map(p => {
      if (targetIds.includes(p.id)) {
        return {
          ...p,
          legenda: copyText ? localText : p.legenda,
          hashtags: copyTags ? joinHashtags(localTags) : p.hashtags,
          legendaPropria: true,
        };
      }
      return p;
    });

    await onSaveContent({
      ...content,
      plataformas: updatedPlataformas,
    });
  };

  // Activate an account for this content
  const handleAtivarConta = async (contaParaAtivar: ContaRef) => {
    const nextPlataformas = alternarDestino({
      publicacoes: content.plataformas,
      plataforma: contaParaAtivar,
      contentId: content.id,
      marcar: true,
    });

    const nova = nextPlataformas.find(p => p.platformId === contaParaAtivar.id);
    const updated = {
      ...content,
      plataformas: nextPlataformas.map(p =>
        p.platformId === contaParaAtivar.id && content.legendaBase
          ? { ...p, legenda: content.legendaBase }
          : p,
      ),
    };

    await onSaveContent(updated);
    if (nova) {
      onSelectPublicacaoId(nova.id);
    }
  };

  // Desativar apaga a legenda escrita para a conta (inclusive a que ainda está para salvar): pergunta antes.
  const pedirDesativarConta = (publicacaoId: string) => {
    const pub = content.plataformas.find(p => p.id === publicacaoId);
    const contaAlvo = pub ? contaDaRef(pub.platformId, contas) : null;
    if (!contaAlvo) return;
    const editandoAgora = timerRef.current !== null && publicacaoId === publicacao?.id && localText.trim().length > 0;
    if (editandoAgora || legendasQueSeriamApagadas(content.legendaBase, content.plataformas, contaAlvo).length > 0) {
      setDesativarPendente(publicacaoId);
      return;
    }
    void handleDesativarConta(publicacaoId);
  };

  // Deactivate an account from this content
  const handleDesativarConta = async (publicacaoId: string) => {
    const pubParaRemover = content.plataformas.find(p => p.id === publicacaoId);
    if (!pubParaRemover) return;
    const contaAlvo = contaDaRef(pubParaRemover.platformId, contas);
    if (!contaAlvo) return;

    const nextPlataformas = alternarDestino({
      publicacoes: content.plataformas,
      plataforma: contaAlvo,
      contentId: content.id,
      marcar: false,
    });

    const remaining = nextPlataformas.filter(p => !publicacaoJaPostada(p, content));
    await onSaveContent({
      ...content,
      plataformas: nextPlataformas,
    });

    if (remaining.length > 0) {
      if (publicacaoId === publicacao?.id) {
        onSelectPublicacaoId(remaining[0].id);
      }
    }
  };

  const menuItems: MoreMenuItem[] = [
    ...(serie && templateDaSerie.trim()
      ? [{ id: 'aplicar-padrao', label: `Aplicar padrão de ${serie.name}`, onClick: handleApplyTemplate }]
      : []),
    { id: 'copiar-contas', label: 'Copiar para outras contas…', onClick: () => setCopyModalOpen(true) },
  ];

  return (
    <div className="stack-md min-w-0">
      {/* Mobile back button */}
      {onBackToList ? (
        <div className="lg:hidden pb-1">
          <AppButton size="sm" variant="ghost" onClick={onBackToList} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Voltar para lista de saídas
          </AppButton>
        </div>
      ) : null}

      {/* Account tabs */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Contas desta pauta">
        {activePublicacoes.map(pub => {
          const pubConta = contaDaRef(pub.platformId, contas);
          const pubNome = pubConta ? rotuloConta(pubConta) : pub.platformId;
          const isActive = pub.id === publicacao?.id;

          return (
            <div
              key={pub.id}
              className={cn(
                'group inline-flex items-center rounded-[var(--radius-pill)] border transition-colors select-none',
                isActive
                  ? 'border-[var(--text-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs'
                  : 'border-[var(--border-color)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectPublicacaoId(pub.id)}
                className="inline-flex items-center gap-1.5 py-1.5 pl-3 pr-1.5"
              >
                <PlatformIcon platform={pubConta ? iconeDaConta(pubConta) : pub.platformId} colored className="h-4 w-4" />
                <span className={cn('t-label text-current', isActive && 'font-semibold')}>{pubNome}</span>
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  pedirDesativarConta(pub.id);
                }}
                className={cn(
                  'mr-1.5 p-0.5 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 hover:text-[var(--danger)] transition-opacity',
                  'text-[var(--text-tertiary)]',
                )}
                title={`Desativar ${pubNome} desta pauta`}
                aria-label={`Desativar ${pubNome} desta pauta`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        {contasDisponiveisParaAtivar.length > 0 ? (
          <MoreMenu
            size="sm"
            align="left"
            label="Ativar conta nesta pauta"
            trigger={<Plus className="h-3.5 w-3.5" />}
            items={contasDisponiveisParaAtivar.map(c => ({
              id: c.id,
              label: `Ativar ${rotuloConta(c)}`,
              onClick: () => void handleAtivarConta(c),
            }))}
          />
        ) : null}
      </div>

      {/* Main Editor Surface */}
      {!publicacao ? (
        <Surface padding="lg" className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-6 text-center stack-md shadow-xs">
          <Layers className="h-8 w-8 text-[var(--text-secondary)] mx-auto" />
          <div className="stack-xs">
            <Text variant="sectionTitle" as="h2">Nenhuma rede ativada nesta pauta</Text>
            <Text variant="secondary">Ative uma das redes disponíveis acima para começar a redigir a legenda.</Text>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {contas.map(c => (
              <AppButton
                key={c.id}
                variant="secondary"
                onClick={() => handleAtivarConta(c)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Ativar {rotuloConta(c)}
              </AppButton>
            ))}
          </div>
        </Surface>
      ) : (
        <Surface padding="none" className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-6 stack-md shadow-xs">
          {/* Editor Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0 text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                <Text variant="meta" as="span">
                  {(publicacao.publishDate || content.publishDate || 'Sem data')}
                  {publicacao.publishTime ? ` às ${publicacao.publishTime}` : ''}
                </Text>
              </span>
              {savingStatus === 'saving' ? (
                <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">Salvando…</Text>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <AppButton
                size="xs"
                variant={copiedPronto ? 'primary' : 'secondary'}
                onClick={handleCopyReadyCaption}
                leftIcon={copiedPronto ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              >
                {copiedPronto ? 'Copiada' : 'Copiar legenda'}
              </AppButton>
              <MoreMenu size="sm" items={menuItems} trigger={<MoreVertical className="h-3.5 w-3.5" />} />
              <Link
                to={buildContentDetailRoute(content.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                title="Abrir roteiro"
                aria-label="Abrir roteiro"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Textarea */}
          <div className="stack-xs">
            <textarea
              ref={textareaRef}
              id="caption-textarea"
              aria-label="Legenda"
              rows={8}
              value={localText}
              onChange={e => handleTextChange(e.target.value)}
              placeholder="Escreva a legenda desta publicação..."
              className="input w-full resize-y p-3.5 text-[var(--text-primary)] outline-none transition-shadow placeholder:text-[var(--text-tertiary)] focus-visible:shadow-[var(--focus-ring)] min-h-[200px]"
            />
            <Text
              variant="meta"
              as="p"
              className={cn('text-right tabular-nums', localText.length >= 125 && 'text-[var(--success)]')}
              title="No feed, o texto costuma ser cortado após ~125 caracteres com o botão '… mais'."
            >
              {localText.length}/{limiteCaracteres}
            </Text>
          </div>

          {/* Hashtags */}
          <div className="stack-sm pt-3 border-t border-[var(--border-color)]">
            <div className="flex flex-wrap items-center gap-2">
              {localTags.map(tag => {
                const cleanTag = tag.replace(/^#+/, '');
                return (
                  <span
                    key={cleanTag}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--border-color)] bg-[var(--surface-subtle)] px-3 text-[var(--text-primary)] transition-colors hover:border-[var(--border-input)]"
                  >
                    <Text variant="label" as="span">#{cleanTag}</Text>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(cleanTag)}
                      className="text-[var(--text-tertiary)] transition-colors hover:text-[var(--danger)]"
                      aria-label={`Remover hashtag #${cleanTag}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                );
              })}

              {/* Inline add tag input with pill styling */}
              <div className="inline-flex h-8 items-center gap-1 rounded-[var(--radius-pill)] border border-dashed border-[var(--border-input)] px-3 focus-within:border-[var(--brand-accent)] focus-within:bg-[var(--bg-hover)] transition-colors">
                <Text variant="meta" as="span">#</Text>
                <input
                  type="text"
                  placeholder="adicionar tag"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  onBlur={handleAddTag}
                  className="w-24 bg-transparent t-label text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                />
              </div>
              <Text variant="meta" as="span" className="tabular-nums text-[var(--text-tertiary)]">
                {localTags.length}/{limiteTags}
              </Text>
            </div>
          </div>
        </Surface>
      )}

      {/* Copy Modal */}
      {publicacao ? (
        <CopyCaptionToAccountsModal
          open={copyModalOpen}
          onClose={() => setCopyModalOpen(false)}
          content={content}
          currentPublicacao={publicacao}
          contas={contas}
          onConfirm={handleConfirmCopyToAccounts}
        />
      ) : null}

      <ConfirmModal
        open={desativarPendente !== null}
        message={`Desativar ${nomeDesativarPendente} desta pauta? A legenda escrita para essa conta será apagada.`}
        confirmLabel="Desativar e apagar"
        cancelLabel="Manter conta"
        onConfirm={() => {
          const publicacaoId = desativarPendente;
          setDesativarPendente(null);
          if (publicacaoId) void handleDesativarConta(publicacaoId);
        }}
        onCancel={() => setDesativarPendente(null)}
      />
    </div>
  );
}
