import { supabase } from '../../../lib/supabase';
import { LIBRARY_COVERS_BUCKET, libraryCoverPathFromUrl } from './libraryCoverFile';

export { libraryCoverPathFromUrl, isLibraryCoverStorageUrl } from './libraryCoverFile';

/** Best-effort delete of a single cover object. Never throws. */
export async function deleteLibraryCoverByUrl(url: string | null | undefined): Promise<void> {
  if (!supabase) return;
  const path = libraryCoverPathFromUrl(url);
  if (!path) return;

  try {
    await supabase.storage.from(LIBRARY_COVERS_BUCKET).remove([path]);
  } catch {
    // ignore storage cleanup failures
  }
}

/** Best-effort cleanup when an item is deleted or its cover is replaced. */
export async function deleteLibraryItemCovers(params: {
  userId: string;
  itemId: string;
  capaUrl?: string | null;
}): Promise<void> {
  if (!supabase) return;

  await deleteLibraryCoverByUrl(params.capaUrl);

  const folder = `${params.userId}/${params.itemId}`;
  try {
    const { data } = await supabase.storage.from(LIBRARY_COVERS_BUCKET).list(folder, { limit: 100 });
    const paths = (data || [])
      .map(entry => entry.name)
      .filter(Boolean)
      .map(name => `${folder}/${name}`);
    if (paths.length > 0) {
      await supabase.storage.from(LIBRARY_COVERS_BUCKET).remove(paths);
    }
  } catch {
    // ignore storage cleanup failures
  }
}
