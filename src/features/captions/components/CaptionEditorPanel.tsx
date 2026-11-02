import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Calendar, Check, Copy, FileText, Layers, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { CountBadge } from '../../../components/ui/CountBadge';
import { cn } from '../../../lib/utils';
import type { Content, ContentPlataforma, Pilar, Serie } from '../../../lib/database';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { getDisplayStatus, getDisplayStatusLabel } from '../../contents/lib/contentPipeline';
import { contaDaRef, rotuloConta, redeDaRef, type ContaRef } from '../../contas/lib/contas';
import { getPlatformDotClass, inferPlatformFormat } from './CaptionQueueItemCard';
import { CopyCaptionToAccountsModal } from './CopyCaptionToAccountsModal';
import { limiteDoCampo } from '../../editorial/lib/platformFields';
import { parseHashtags, joinHashtags } from '../../contents/lib/captionHashtags';
import { legendaEfetiva, hashtagsNaLegenda, publicacaoJaPostada } from '../../editorial/lib/captions';
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

  // Local draft state for the current publication
  const [localText, setLocalText] = useState('');
  const [localTags, setLocalTags] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const conta = contaDaRef(publicacao?.platformId, contas);
  const contaNome = conta ? rotuloConta(conta) : publicacao?.platformId || '';
  const rede = redeDaRef(publicacao?.platformId, contas) || 'instagram';
  const dotClass = getPlatformDotClass(publicacao?.platformId || '', conta);
  const formato = inferPlatformFormat(publicacao?.platformId || '', content.formatoVisual, conta);
  const statusLabel = getDisplayStatusLabel(content);

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
  const handleApplyTemplate = () => {
    if (!serie) return;
    const templateText =
      serie.plataformas?.find(p => p.platformId === publicacao?.platformId)?.legenda ||
      serie.legendaBase ||
      serie.template ||
      '';

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

      {/* Top Switcher Bar with Account Activation/Deactivation and Clear Sectioning */}
      <Surface padding="sm" className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-elevated)] border border-[var(--border-color)] shadow-xs">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--platform-instagram)] shrink-0" aria-hidden />
          <Text variant="bodyStrong" as="span">
            Alternar Conta desta Pauta <CountBadge count={activePublicacoes.length} />:
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Active accounts pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {activePublicacoes.map(pub => {
              const pubConta = contaDaRef(pub.platformId, contas);
              const pubNome = pubConta ? rotuloConta(pubConta) : pub.platformId;
              const pubFormato = inferPlatformFormat(pub.platformId, content.formatoVisual, pubConta);
              const isActive = pub.id === publicacao?.id;
              const dot = getPlatformDotClass(pub.platformId, pubConta);

              return (
                <div
                  key={pub.id}
                  className={cn(
                    'inline-flex items-center rounded-[var(--radius-pill)] border transition-all select-none',
                    isActive
                      ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-sm'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPublicacaoId(pub.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5"
                  >
                    <span className={cn('h-2 w-2 rounded-full shrink-0', dot)} aria-hidden />
                    <Text variant="label" as="span">{pubNome} ({pubFormato})</Text>
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      void handleDesativarConta(pub.id);
                    }}
                    className={cn(
                      'mr-1.5 p-0.5 rounded-full hover:bg-[color-mix(in_srgb,var(--danger)_20%,transparent)] hover:text-[var(--danger)] transition-colors',
                      isActive ? 'text-[var(--bg-primary)]/80 hover:text-[var(--danger)]' : 'text-[var(--text-tertiary)]',
                    )}
                    title={`Desativar ${pubNome} desta pauta`}
                    aria-label={`Desativar ${pubNome} desta pauta`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Visual divider if there are inactive accounts to add */}
          {contasDisponiveisParaAtivar.length > 0 && activePublicacoes.length > 0 ? (
            <span className="hidden sm:inline-block w-px h-5 bg-[var(--border-color)] shrink-0" aria-hidden />
          ) : null}

          {/* Inactive accounts that can be activated with 1 click */}
          <div className="flex flex-wrap items-center gap-1.5">
            {contasDisponiveisParaAtivar.map(c => {
              const nome = rotuloConta(c);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleAtivarConta(c)}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-dashed border-[var(--border-input)] bg-transparent px-2.5 py-1 hover:border-[var(--brand-accent)] hover:bg-[var(--bg-hover)] transition-colors"
                  title={`Ativar ${nome} nesta pauta`}
                >
                  <Plus className="h-3 w-3" />
                  <Text variant="meta" as="span">Ativar {nome}</Text>
                </button>
              );
            })}
          </div>
        </div>
      </Surface>

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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="stack-xs min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', dotClass)} aria-hidden />
                <Text variant="sectionTitle" as="h2">
                  {contaNome}
                </Text>
                <Badge variant="neutral" className="uppercase">
                  {formato}
                </Badge>
                <Badge variant="neutral">
                  {statusLabel}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                  <Text variant="meta" as="span">
                    {(publicacao.publishDate || content.publishDate || 'Sem data')} às {(publicacao.publishTime || '18:30')}
                  </Text>
                </span>
                <Text variant="meta" as="span">•</Text>
                <Text variant="meta" as="span" className="text-[var(--success)]">
                  {savingStatus === 'saving' ? 'Salvando...' : '• Salvo no aparelho'}
                </Text>
              </div>
            </div>

            {/* Actions on the far right */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Quick action: Copy Ready Caption for posting */}
              <AppButton
                size="xs"
                variant={copiedPronto ? 'primary' : 'secondary'}
                onClick={handleCopyReadyCaption}
                leftIcon={copiedPronto ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              >
                {copiedPronto ? 'Copiada para postar!' : 'Copiar Legenda Pronta'}
              </AppButton>

              {/* Link to original pauta/content */}
              <Link
                to={buildContentDetailRoute(content.id)}
                className="inline-flex max-w-[240px] items-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 py-1.5 text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] truncate"
                title={content.title}
              >
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />
                <Text variant="label" as="span" className="truncate">{content.title || 'Ver pauta'}</Text>
              </Link>
            </div>
          </div>

          {/* Compact Single-Row Pattern / Quick Action Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--platform-instagram)_24%,var(--border-color))] bg-[color-mix(in_srgb,var(--platform-instagram)_5%,var(--bg-primary))] p-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-[var(--platform-instagram)] shrink-0" />
              <button
                type="button"
                onClick={handleApplyTemplate}
                disabled={!serie}
                className={cn(
                  'text-left truncate',
                  serie ? 'hover:underline cursor-pointer' : 'opacity-60 cursor-default',
                )}
              >
                <Text variant="bodyStrong" as="span" className="truncate">
                  Aplicar padrão de &ldquo;{serie?.name || 'Sem série vinculada'}&rdquo;
                </Text>
              </button>
              <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
                ({'{titulo}'}, {'{serie}'}, {'{pilar}'}, {'{data}'})
              </Text>
            </div>

            <div className="shrink-0">
              <AppButton
                size="xs"
                variant="secondary"
                onClick={() => setCopyModalOpen(true)}
                leftIcon={<Copy className="h-3.5 w-3.5" />}
              >
                Copiar para outras contas...
              </AppButton>
            </div>
          </div>

          {/* Textarea Section with Feed Cutoff (125 chars) and Total Limit */}
          <div className="stack-xs">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="caption-textarea" className="flex items-center gap-1.5 cursor-pointer">
                <FileText className="h-4 w-4 text-[var(--text-secondary)]" />
                <Text variant="bodyStrong" as="span">Texto da Legenda / Copy</Text>
              </label>

              <div className="flex items-center gap-2">
                {/* 125 chars feed hook indicator */}
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 t-meta',
                    localText.length >= 125
                      ? 'bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]'
                      : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)]',
                  )}
                  title="No Instagram e TikTok, a timeline costuma truncar o texto após ~125 caracteres exibindo o botão '... mais'."
                >
                  Gancho feed: {Math.min(localText.length, 125)}/125
                </span>

                <Text variant="meta" as="span" className="tabular-nums">
                  {localText.length} / {limiteCaracteres} caracteres
                </Text>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              id="caption-textarea"
              rows={8}
              value={localText}
              onChange={e => handleTextChange(e.target.value)}
              placeholder="Escreva a legenda desta publicação..."
              className="input w-full resize-y p-3.5 font-mono text-[var(--text-primary)] outline-none transition-shadow placeholder:text-[var(--text-tertiary)] focus-visible:shadow-[var(--focus-ring)] min-h-[200px]"
            />
          </div>

          {/* Hashtags Section with Comfortable Chips and Touch Targets */}
          <div className="stack-md pt-3 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Text variant="bodyStrong" as="span" className="text-[var(--platform-instagram)]">#</Text>
                <Text variant="bodyStrong" as="span">
                  Bloco de Hashtags <CountBadge count={localTags.length} />
                </Text>
              </div>
              <Text variant="meta" as="span">
                Máx recomendado: {limiteTags} tags
              </Text>
            </div>

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
    </div>
  );
}
