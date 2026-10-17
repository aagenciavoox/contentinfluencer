import type {CarouselImageRef, CarouselSlide, Content, ScriptNote, WritingMode} from '../../../lib/database.ts';
import {htmlToReadableText} from '../../../lib/utils.ts';
import {generateUUID} from '../../../utils/uuid.ts';

/**
 * Modo de escrita Carrossel: o roteiro vira uma lista de telas numeradas.
 * Cada tela tem texto (HTML do editor) e uma lista de links ou notas de imagem.
 * O texto do modo Texto (`script`) nunca é apagado ao trocar de modo.
 */

export const WRITING_MODE_LABELS: Record<WritingMode, string> = {
  texto: 'Texto',
  carrossel: 'Carrossel',
};

export function normalizeWritingMode(value: unknown): WritingMode {
  return value === 'carrossel' ? 'carrossel' : 'texto';
}

export function isCarouselContent(content: Pick<Content, 'writingMode'> | null | undefined): boolean {
  return content?.writingMode === 'carrossel';
}

export function slideLabel(index: number): string {
  return `Tela ${index + 1}`;
}

export function createCarouselImage(value = ''): CarouselImageRef {
  return {id: generateUUID(), value};
}

export function createCarouselSlide(html = ''): CarouselSlide {
  return {id: generateUUID(), html, images: []};
}

function readImages(value: unknown): CarouselImageRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (typeof item === 'string') return [{id: generateUUID(), value: item}];
    if (!item || typeof item !== 'object') return [];
    const raw = item as Record<string, unknown>;
    const text = typeof raw.value === 'string' ? raw.value : typeof raw.url === 'string' ? raw.url : '';
    return [{id: typeof raw.id === 'string' && raw.id ? raw.id : generateUUID(), value: text}];
  });
}

/** Lê `carousel_slides` do banco ou do cache: só o formato conhecido, sem quebrar com lixo. */
export function readCarouselSlides(value: unknown): CarouselSlide[] {
  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(source)) return [];
  return source.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const raw = item as Record<string, unknown>;
    const slide: CarouselSlide = {
      id: typeof raw.id === 'string' && raw.id ? raw.id : generateUUID(),
      html: typeof raw.html === 'string' ? raw.html : '',
      images: readImages(raw.images),
    };
    if (Array.isArray(raw.comments) && raw.comments.length > 0) {
      slide.comments = raw.comments as ScriptNote[];
    }
    return [slide];
  });
}

export function slideText(slide: Pick<CarouselSlide, 'html'>): string {
  return htmlToReadableText(slide.html).trim();
}

export function slideHasContent(slide: CarouselSlide): boolean {
  return slideText(slide).length > 0 || slide.images.some(image => image.value.trim().length > 0);
}

export function slidesHaveContent(slides: readonly CarouselSlide[] | null | undefined): boolean {
  return (slides ?? []).some(slideHasContent);
}

/** O texto atual vira a Tela 1. Sem texto, começa com uma tela vazia. */
export function scriptToCarouselSlides(script: string | null | undefined): CarouselSlide[] {
  const html = script?.trim() ?? '';
  return [createCarouselSlide(htmlToReadableText(html).trim() ? html : '')];
}

/**
 * Telas ao entrar no modo Carrossel. Telas guardadas (de uma troca anterior) voltam
 * como estavam; só na primeira vez o texto do modo Texto vira a Tela 1.
 */
export function slidesForCarouselMode(
  script: string | null | undefined,
  slides: readonly CarouselSlide[] | null | undefined,
): CarouselSlide[] {
  if (slides && slides.length > 0 && slidesHaveContent(slides)) return [...slides];
  if (htmlToReadableText(script).trim()) return scriptToCarouselSlides(script);
  return slides && slides.length > 0 ? [...slides] : [createCarouselSlide()];
}

export function addSlideAfter(slides: readonly CarouselSlide[], afterId?: string | null): CarouselSlide[] {
  const next = [...slides];
  const index = afterId ? next.findIndex(slide => slide.id === afterId) : -1;
  next.splice(index >= 0 ? index + 1 : next.length, 0, createCarouselSlide());
  return next;
}

export function duplicateSlide(slides: readonly CarouselSlide[], id: string): CarouselSlide[] {
  const index = slides.findIndex(slide => slide.id === id);
  if (index < 0) return [...slides];
  const source = slides[index];
  const copy: CarouselSlide = {
    id: generateUUID(),
    // Comentários ficam na tela original: a cópia leva o texto sem as marcas de comentário.
    html: source.html.replace(/<span[^>]*data-comment-id="[^"]*"[^>]*>(.*?)<\/span>/gi, '$1'),
    images: source.images.map(image => createCarouselImage(image.value)),
  };
  const next = [...slides];
  next.splice(index + 1, 0, copy);
  return next;
}

/** Nunca deixa o carrossel sem telas: apagar a última deixa uma tela vazia. */
export function removeSlide(slides: readonly CarouselSlide[], id: string): CarouselSlide[] {
  const next = slides.filter(slide => slide.id !== id);
  return next.length > 0 ? next : [createCarouselSlide()];
}

export function moveSlide(slides: readonly CarouselSlide[], id: string, direction: -1 | 1): CarouselSlide[] {
  const index = slides.findIndex(slide => slide.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= slides.length) return [...slides];
  const next = [...slides];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function updateSlide(
  slides: readonly CarouselSlide[],
  id: string,
  patch: Partial<Omit<CarouselSlide, 'id'>>,
): CarouselSlide[] {
  return slides.map(slide => (slide.id === id ? {...slide, ...patch} : slide));
}

/**
 * Texto simples das telas, para busca, contagem e prévia.
 * `labels: true` põe "Tela N" antes de cada texto (cópia e exportação).
 */
export function carouselPlainText(
  slides: readonly CarouselSlide[] | null | undefined,
  options: {labels?: boolean} = {},
): string {
  return (slides ?? [])
    .map((slide, index) => {
      const text = slideText(slide);
      if (!options.labels) return text;
      return text ? `${slideLabel(index)}\n${text}` : '';
    })
    .filter(Boolean)
    .join('\n\n');
}

/** Texto legível do roteiro no modo em uso: o texto corrido ou as telas unidas. */
export function contentReadableBody(
  content: Pick<Content, 'script'> & Partial<Pick<Content, 'writingMode' | 'carouselSlides'>>,
): string {
  if (content.writingMode === 'carrossel' && content.carouselSlides) {
    return carouselPlainText(content.carouselSlides);
  }
  return htmlToReadableText(content.script).trim();
}

/** Link clicável quando o texto parece um endereço; nota livre fica como texto. */
export function imageRefHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  if (/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(trimmed)) return trimmed;
  if (/^www\.[^\s]+\.[^\s]+$/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}

export type CarouselExportSlide = {label: string; text: string; images: string[]};

/** Telas para a exportação: "Tela 1", "Tela 2"… com os links e notas de imagem de cada uma. */
export function carouselExportSlides(slides: readonly CarouselSlide[] | null | undefined): CarouselExportSlide[] {
  return (slides ?? [])
    .map((slide, index) => ({
      label: slideLabel(index),
      text: slideText(slide),
      images: slide.images.map(image => image.value.trim()).filter(Boolean),
    }))
    .filter(slide => slide.text || slide.images.length > 0);
}
