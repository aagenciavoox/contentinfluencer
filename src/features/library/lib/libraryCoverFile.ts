export const LIBRARY_COVERS_BUCKET = 'library-covers';
export const LIBRARY_COVER_MAX_BYTES = 5 * 1024 * 1024;

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
    return 'A capa deve ter no maximo 5 MB.';
  }
  return null;
}
