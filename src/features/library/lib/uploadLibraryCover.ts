import { supabase } from '../../../lib/supabase';
import { generateUUID } from '../../../utils/uuid';
import {
  LIBRARY_COVERS_BUCKET,
  extensionForLibraryCover,
  validateLibraryCoverFile,
} from './libraryCoverFile';

export {
  LIBRARY_COVERS_BUCKET,
  LIBRARY_COVER_MAX_BYTES,
  validateLibraryCoverFile,
} from './libraryCoverFile';

export async function uploadLibraryCover(params: {
  file: File;
  userId: string;
  itemId?: string | null;
}): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase nao configurado.');
  }

  const validationError = validateLibraryCoverFile(params.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const folder = params.itemId?.trim() || 'pending';
  const path = `${params.userId}/${folder}/${generateUUID()}.${extensionForLibraryCover(params.file)}`;

  const { error } = await supabase.storage.from(LIBRARY_COVERS_BUCKET).upload(path, params.file, {
    cacheControl: '3600',
    contentType: params.file.type || `image/${extensionForLibraryCover(params.file)}`,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || 'Nao foi possivel enviar a capa.');
  }

  const { data } = supabase.storage.from(LIBRARY_COVERS_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('Capa enviada, mas a URL publica nao ficou disponivel.');
  }

  return data.publicUrl;
}
