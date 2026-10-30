import {useEffect, useRef, useState, type ReactNode} from 'react';
import {ArrowDown, ArrowUp, Copy, ExternalLink, ImagePlus, Plus, Trash2, X} from 'lucide-react';
import {RichTextEditor} from '../../../../components/editors/RichTextEditor';
import {newCommentId, type CommentPatch} from '../../../../components/editors/commentModel';
import {ConfirmModal} from '../../../../components/feedback/modals/ConfirmModal';
import {AppButton} from '../../../../components/ui/AppButton';
import {Skeleton} from '../../../../components/ui/Skeleton';
import {Surface} from '../../../../components/ui/Surface';
import {Text} from '../../../../components/ui/Text';
import {useAuth} from '../../../../context/AuthContext';
import type {CarouselImageRef, CarouselSlide, ScriptNote} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
import {
  addSlideAfter,
  createCarouselImage,
  duplicateSlide,
  imageRefHref,
  moveSlide,
  removeSlide,
  slideHasContent,
  slideLabel,
  updateSlide,
} from '../../lib/carouselSlides';
import {roteiroTypographyStyle} from '../../lib/roteiroTypography';
import {useRoteiroTypography} from '../../lib/useRoteiroTypography';

interface CarouselSlidesEditorProps {
  slides: CarouselSlide[];
  onChange: (slides: CarouselSlide[]) => void;
  documentTitle: string;
  authorName: string;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  bodyLoading?: boolean;
  bodyError?: string | null;
  onRetryBody?: () => void;
  /** Na barra de ferramentas da primeira tela, antes de "Mais" (ex.: botão "Notas"). */
  toolbarEnd?: ReactNode;
  notesPanelOpen?: boolean;
  className?: string;
}

const LINK_ICON_CLASS = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:h-11 pointer-coarse:w-11';

type ImageUpdate = (images: CarouselImageRef[]) => CarouselImageRef[];

function imageLink(value: string): string | null {
  const href = imageRefHref(value);
  if (!href) return null;
  try {
    const {protocol} = new URL(href);
    return protocol === 'http:' || protocol === 'https:' ? href : null;
  } catch {
    return null;
  }
}

/**
 * Modo Carrossel: telas numeradas, cada uma com texto (mesmo editor do roteiro, com
 * destaque e comentários) e uma lista de links ou notas de imagem para o design.
 * Sem limite nem contador de caracteres.
 */
export function CarouselSlidesEditor({
  slides,
  onChange,
  documentTitle,
  authorName,
  saveState,
  bodyLoading = false,
  bodyError = null,
  onRetryBody,
  toolbarEnd,
  notesPanelOpen = false,
  className,
}: CarouselSlidesEditorProps) {
  const {user} = useAuth();
  const {typography} = useRoteiroTypography(user?.id);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Edições seguidas antes do próximo render (texto e comentário) partem sempre da lista mais nova.
  const slidesRef = useRef(slides);
  const receivedSlidesRef = useRef(slides);
  // Um estado local (como abrir a confirmação) não descarta edições ainda sem eco do pai.
  // Uma nova lista recebida por props continua sendo a fonte de verdade.
  if (receivedSlidesRef.current !== slides) {
    receivedSlidesRef.current = slides;
    slidesRef.current = slides;
  }

  useEffect(() => {
    if (pendingDeleteId === null) return;
    if (bodyLoading || bodyError || !slides.some(slide => slide.id === pendingDeleteId)) {
      setPendingDeleteId(null);
    }
  }, [bodyError, bodyLoading, pendingDeleteId, slides]);

  const commit = (next: CarouselSlide[]) => {
    slidesRef.current = next;
    onChange(next);
  };
  const patchSlide = (id: string, patch: Partial<Omit<CarouselSlide, 'id'>>) => {
    if (!slidesRef.current.some(slide => slide.id === id)) return;
    commit(updateSlide(slidesRef.current, id, patch));
  };
  const commentsOf = (id: string): ScriptNote[] =>
    slidesRef.current.find(slide => slide.id === id)?.comments ?? [];

  const updateImages = (id: string, update: ImageUpdate) => {
    const slide = slidesRef.current.find(item => item.id === id);
    if (slide) patchSlide(id, {images: update(slide.images)});
  };

  const requestDelete = (id: string) => {
    const slide = slidesRef.current.find(item => item.id === id);
    if (!slide) return;
    if (slideHasContent(slide)) {
      setPendingDeleteId(id);
      return;
    }
    commit(removeSlide(slidesRef.current, id));
  };

  if (bodyLoading) {
    return (
      <div className={cn('stack-sm', className)} aria-busy="true" aria-label="Carregando telas">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (bodyError) {
    return (
      <div className={cn('stack-md p-6 text-center', className)} role="alert">
        <Text variant="sectionTitle">Não foi possível carregar o carrossel</Text>
        <Text variant="meta" className="mx-auto max-w-md">{bodyError}</Text>
        {onRetryBody ? (
          <AppButton type="button" variant="secondary" size="sm" onClick={onRetryBody}>
            Tentar novamente
          </AppButton>
        ) : null}
      </div>
    );
  }

  const pendingDeleteIndex = slidesRef.current.findIndex(slide => slide.id === pendingDeleteId);
  const pendingDeleteLabel = pendingDeleteIndex >= 0 ? slideLabel(pendingDeleteIndex) : 'Tela';

  return (
    <section className={cn('stack-md', className)} aria-label="Telas do carrossel">
      {/* Sem telas não há barra: o botão fica sozinho no topo. */}
      {toolbarEnd && slides.length === 0 ? <div className="flex justify-end">{toolbarEnd}</div> : null}

      <ol className="stack-md">
        {slides.map((slide, index) => {
          const label = slideLabel(index);
          return (
            <li key={slide.id}>
              <Surface as="article" variant="outlined" padding="none" className="overflow-visible" aria-label={label}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] px-4 py-2">
                  <Text variant="itemTitle" as="h3">{label}</Text>
                  <div className="flex items-center gap-1">
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="xs"
                      iconOnly
                      aria-label={`Mover ${label} para cima`}
                      title="Mover para cima"
                      disabled={index === 0}
                      onClick={() => commit(moveSlide(slidesRef.current, slide.id, -1))}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </AppButton>
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="xs"
                      iconOnly
                      aria-label={`Mover ${label} para baixo`}
                      title="Mover para baixo"
                      disabled={index === slides.length - 1}
                      onClick={() => commit(moveSlide(slidesRef.current, slide.id, 1))}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </AppButton>
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="xs"
                      iconOnly
                      aria-label={`Duplicar ${label}`}
                      title="Duplicar tela"
                      onClick={() => commit(duplicateSlide(slidesRef.current, slide.id))}
                    >
                      <Copy className="h-4 w-4" />
                    </AppButton>
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="xs"
                      iconOnly
                      aria-label={`Apagar ${label}`}
                      title="Apagar tela"
                      onClick={() => requestDelete(slide.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </AppButton>
                  </div>
                </div>

                <div className="roteiro-typography" style={roteiroTypographyStyle(typography)}>
                  <RichTextEditor
                    documentId={slide.id}
                    variant="workspace"
                    formatBar="writing"
                    meter="none"
                    toolbarEnd={index === 0 ? toolbarEnd : undefined}
                    content={slide.html}
                    onChange={html => patchSlide(slide.id, {html})}
                    placeholder={`Escreva a ${label.toLowerCase()}…`}
                    authorName={authorName}
                    documentTitle={`${documentTitle} · ${label}`}
                    annotations={slide.comments ?? []}
                    notesPanelOpen={notesPanelOpen}
                    onAddAnnotation={(text, selection, comment, id) => {
                      const commentId = id ?? newCommentId();
                      const comments = commentsOf(slide.id);
                      if (comments.some(note => note.id === commentId)) return;
                      patchSlide(slide.id, {
                        comments: [...comments, {
                          id: commentId,
                          authorName,
                          text,
                          selection,
                          comment,
                          color: 'color-mix(in srgb, var(--warning), transparent 50%)',
                          createdAt: new Date().toISOString(),
                        }],
                      });
                    }}
                    onRemoveAnnotation={id => patchSlide(slide.id, {
                      comments: commentsOf(slide.id).filter(note => note.id !== id),
                    })}
                    onUpdateAnnotation={(id, comment, color) => patchSlide(slide.id, {
                      comments: commentsOf(slide.id).map(note => (note.id === id ? {...note, comment, color: color ?? note.color} : note)),
                    })}
                    onPatchAnnotation={(id: string, patch: CommentPatch) => patchSlide(slide.id, {
                      comments: commentsOf(slide.id).map(note => (
                        note.id === id
                          ? {...note, ...patch, color: patch.color ?? note.color, comment: patch.comment ?? note.comment}
                          : note
                      )),
                    })}
                    saveState={saveState}
                    className="rounded-none border-0 bg-[var(--bg-elevated)] shadow-none"
                    editorViewportClassName="px-4 py-3 md:px-6 md:py-4"
                    editorCanvasClassName="min-h-[7rem]"
                  />
                </div>

                <SlideImages
                  label={label}
                  images={slide.images}
                  onChange={update => updateImages(slide.id, update)}
                />
              </Surface>
            </li>
          );
        })}
      </ol>

      <div>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => commit(addSlideAfter(slidesRef.current))}
        >
          Adicionar tela
        </AppButton>
      </div>

      <ConfirmModal
        open={pendingDeleteId !== null && pendingDeleteIndex >= 0}
        message={`Apagar a ${pendingDeleteLabel.toLowerCase()}? O texto e as imagens desta tela saem do carrossel.`}
        confirmLabel="Apagar tela"
        cancelLabel="Manter tela"
        onConfirm={() => {
          if (pendingDeleteId !== null && slidesRef.current.some(slide => slide.id === pendingDeleteId)) {
            commit(removeSlide(slidesRef.current, pendingDeleteId));
          }
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </section>
  );
}

function SlideImages({
  label,
  images,
  onChange,
}: {
  label: string;
  images: CarouselImageRef[];
  onChange: (update: ImageUpdate) => void;
}) {
  return (
    <div className="stack-sm border-t border-[var(--border-color)] px-4 py-3">
      <Text variant="label" as="p">Imagens</Text>
      {images.length > 0 ? (
        <ul className="stack-sm">
          {images.map((image, index) => {
            const href = imageLink(image.value);
            const fieldLabel = `Imagem ${index + 1} da ${label.toLowerCase()}`;
            return (
              <li key={image.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={image.value}
                  onChange={event => {
                    const value = event.target.value;
                    onChange(current => current.map(item => (
                      item.id === image.id ? {...item, value} : item
                    )));
                  }}
                  aria-label={fieldLabel}
                  placeholder="Cole um link ou descreva a imagem"
                  className="min-h-[var(--control-height-mobile)] min-w-0 flex-1 rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-elevated)] px-3 t-body text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus-visible:shadow-[var(--focus-ring)] md:min-h-[var(--control-height)]"
                />
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINK_ICON_CLASS}
                    aria-label={`Abrir link da ${fieldLabel.toLowerCase()}`}
                    title="Abrir link em nova aba"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                ) : null}
                <AppButton
                  type="button"
                  variant="ghost"
                  size="xs"
                  iconOnly
                  aria-label={`Remover ${fieldLabel.toLowerCase()}`}
                  title="Remover imagem"
                  onClick={() => onChange(current => current.filter(item => item.id !== image.id))}
                >
                  <X className="h-4 w-4" />
                </AppButton>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div>
        <AppButton
          type="button"
          variant="secondary"
          size="xs"
          leftIcon={<ImagePlus className="h-4 w-4" />}
          onClick={() => onChange(current => [...current, createCarouselImage()])}
        >
          Adicionar imagem
        </AppButton>
      </div>
    </div>
  );
}
