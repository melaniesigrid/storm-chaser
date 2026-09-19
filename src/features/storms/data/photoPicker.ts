import * as ImagePicker from 'expo-image-picker';

import { err, ok, type Result } from '@/core/utils/result';

import type { PhotoSource } from '../model/types';

export interface PickedPhoto {
  /** Temporary URI, on the same footing as camera output: copy it before use. */
  uri: string;
  capturedAt: string;
  source: PhotoSource;
}

/** The subset of an image picker asset this module reads. */
export interface PickedAssetLike {
  uri: string;
  creationTime?: number | null;
  exif?: Record<string, unknown> | null;
}

/**
 * Opens the system photo library so an existing photograph can be filed.
 *
 * The camera remains the primary path: a field report is normally shot in the
 * moment. Import exists because storms do not wait for the person holding the
 * phone, and a photo taken on a real camera and copied across still documents
 * the same event.
 *
 * Resolves to `null` when the picker is dismissed, which is a normal outcome
 * rather than a failure.
 */
export async function pickPhotoFromLibrary(
  now: () => Date = () => new Date(),
): Promise<Result<PickedPhoto | null>> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return err(
        'permission',
        'Storm Chaser needs access to your photos to import an existing shot.',
      );
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      // The original timestamp is the whole point of importing: without EXIF
      // the report would be stamped with the moment of the import instead.
      exif: true,
    });

    if (result.canceled) return ok(null);

    const asset = result.assets[0];
    if (!asset?.uri) {
      return err('not_found', 'That photo could not be read. Try another one.');
    }

    return ok({
      uri: asset.uri,
      capturedAt: resolveCapturedAt(asset, now()),
      source: 'library',
    });
  } catch (cause) {
    return err('unknown', 'The photo library could not be opened.', cause);
  }
}

/**
 * Best available capture time for an imported photo, in preference order:
 * EXIF original date, the asset's creation time, then the clock.
 *
 * A wrong timestamp is worse than an honest fallback here, so anything that
 * does not parse cleanly is discarded rather than guessed at.
 */
export function resolveCapturedAt(asset: PickedAssetLike, fallback: Date): string {
  const exif = asset.exif ?? {};
  const exifDate =
    parseExifDate(exif.DateTimeOriginal) ??
    parseExifDate(exif.DateTimeDigitized) ??
    parseExifDate(exif.DateTime);
  if (exifDate) return exifDate.toISOString();

  if (typeof asset.creationTime === 'number' && Number.isFinite(asset.creationTime)) {
    const created = new Date(asset.creationTime);
    if (!Number.isNaN(created.getTime())) return created.toISOString();
  }

  return fallback.toISOString();
}

/**
 * EXIF dates look like `2025:06:11 18:04:22` and carry no timezone, so they are
 * read as local time — the same wall clock the photographer was standing in.
 */
function parseExifDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;

  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match.map(Number) as number[];
  if (month === undefined || month < 1 || month > 12) return null;

  const date = new Date(
    year as number,
    (month as number) - 1,
    day as number,
    hour as number,
    minute as number,
    second as number,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}
