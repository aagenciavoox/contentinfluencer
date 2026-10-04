export const LIBRARY_COVERS_BUCKET = 'library-covers';
export const LIBRARY_COVER_MAX_BYTES = 5 * 1024 * 1024;
export const LIBRARY_COVER_UPLOAD_ERROR =
  'Não foi possível enviar a capa. Use JPG, PNG, WEBP ou GIF de até 5 MB e tente novamente.';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function extensionForLibraryCover(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 5) {
    return fromName === 'jpg' ? 'jpeg' : fromName;
  }
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpeg';
}

export function validateLibraryCoverFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Use uma imagem JPG, PNG, WEBP ou GIF.';
  }
  if (file.size > LIBRARY_COVER_MAX_BYTES) {
    return 'Use uma imagem de até 5 MB.';
  }
  return null;
}

export function libraryCoverPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = `/object/public/${LIBRARY_COVERS_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

export function isLibraryCoverStorageUrl(url: string | null | undefined): boolean {
  return Boolean(libraryCoverPathFromUrl(url));
}

export function coverInitial(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return '?';
  return Array.from(trimmed)[0]?.toUpperCase() ?? '?';
}
