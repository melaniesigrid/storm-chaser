import { Directory, File, Paths } from 'expo-file-system';

import { err, ok, type Result } from '@/core/utils/result';

const PHOTO_DIRECTORY_NAME = 'storm-photos';

/** The permanent home for captured photos, inside the app document directory. */
function photoDirectory(): Directory {
  return new Directory(Paths.document, PHOTO_DIRECTORY_NAME);
}

/**
 * Camera output lands in the OS cache directory, which the system is free to
 * purge. Photos are copied into the app document directory so a report still
 * has its image after a reboot or a low storage sweep.
 */
export async function persistPhoto(
  temporaryUri: string,
  reportId: string,
): Promise<Result<string>> {
  try {
    const directory = photoDirectory();
    directory.create({ intermediates: true, idempotent: true });

    const extension = temporaryUri.split('.').pop()?.split('?')[0] ?? 'jpg';
    const destination = new File(directory, `${reportId}.${extension}`);

    await new File(temporaryUri).copy(destination, { overwrite: true });
    return ok(destination.uri);
  } catch (cause) {
    return err('storage', 'The photo could not be saved to this device', cause);
  }
}

export async function deletePhoto(uri: string): Promise<Result<true>> {
  try {
    const file = new File(uri);
    // Deleting an absent file throws, and a missing photo is not a failure here.
    if (file.exists) file.delete();
    return ok(true);
  } catch (cause) {
    return err('storage', 'The photo could not be removed', cause);
  }
}

export async function photoExists(uri: string): Promise<boolean> {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}
