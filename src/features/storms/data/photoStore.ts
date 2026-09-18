import * as FileSystem from 'expo-file-system';

import { err, ok, type Result } from '@/core/utils/result';

const PHOTO_DIRECTORY = `${FileSystem.documentDirectory}storm-photos/`;

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
    await FileSystem.makeDirectoryAsync(PHOTO_DIRECTORY, { intermediates: true });

    const extension = temporaryUri.split('.').pop()?.split('?')[0] ?? 'jpg';
    const destination = `${PHOTO_DIRECTORY}${reportId}.${extension}`;

    await FileSystem.copyAsync({ from: temporaryUri, to: destination });
    return ok(destination);
  } catch (cause) {
    return err('storage', 'The photo could not be saved to this device', cause);
  }
}

export async function deletePhoto(uri: string): Promise<Result<true>> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return ok(true);
  } catch (cause) {
    return err('storage', 'The photo could not be removed', cause);
  }
}

export async function photoExists(uri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}
