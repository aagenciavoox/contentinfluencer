/** Max longest side after client-side cover compression. */
export const LIBRARY_COVER_MAX_SIDE = 800;
export const LIBRARY_COVER_JPEG_QUALITY = 0.82;

/**
 * Resize/compress cover images in the browser before upload.
 * GIFs are left unchanged to preserve animation.
 */
export async function compressLibraryCover(
  file: File,
  options?: { maxSide?: number; quality?: number },
): Promise<File> {
  const maxSide = options?.maxSide ?? LIBRARY_COVER_MAX_SIDE;
  const quality = options?.quality ?? LIBRARY_COVER_JPEG_QUALITY;

  if (file.type === 'image/gif') {
    return file;
  }

  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > maxSide ? maxSide / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    if (scale === 1 && file.size <= 400 * 1024 && file.type === 'image/jpeg') {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'capa';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
