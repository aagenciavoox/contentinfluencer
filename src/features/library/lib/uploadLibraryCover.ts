import { supabase } from '../../../lib/supabase';
import { generateUUID } from '../../../utils/uuid';
import { compressLibraryCover } from './compressLibraryCover';
import {
  LIBRARY_COVERS_BUCKET,
  extensionForLibraryCover,
  validateLibraryCoverFile,
} from './libraryCoverFile';
import { deleteLibraryCoverByUrl } from './libraryCoverStorage';

export {
  LIBRARY_COVERS_BUCKET,
  LIBRARY_COVER_MAX_BYTES,
  validateLibraryCoverFile,
} from './libraryCoverFile';

export async function uploadLibraryCover(params: {
  file: File;
  userId: string;
  itemId?: string | null;
  previousUrl?: string | null;
}): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase nao configurado.');
  }

  const validationError = validateLibraryCoverFile(params.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const file = await compressLibraryCover(params.file);
  const folder = params.itemId?.trim() || 'pending';
  const extension = extensionForLibraryCover(file);
  const path = `${params.userId}/${folder}/${generateUUID()}.${extension}`;

  const { error } = await supabase.storage.from(LIBRARY_COVERS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || `image/${extension}`,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || 'Nao foi possivel enviar a capa.');
  }

  const { data } = supabase.storage.from(LIBRARY_COVERS_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('Capa enviada, mas a URL publica nao ficou disponivel.');
  }

  if (params.previousUrl && params.previousUrl !== data.publicUrl) {
    void deleteLibraryCoverByUrl(params.previousUrl);
  }

  return data.publicUrl;
}
