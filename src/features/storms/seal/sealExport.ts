import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { PixelRatio } from 'react-native';
import type Svg from 'react-native-svg';

import { err, ok, type Result } from '@/core/utils/result';

import { SEAL_HEIGHT, SEAL_WIDTH } from './sealSvg';

/**
 * Turning the on-screen seal into a file, and getting it off the device.
 *
 * The rasterise step is the one decision in here worth reading. It uses
 * react-native-svg's own `toDataURL` WITHOUT size options, from an Svg
 * mounted offscreen at full size -- not `captureRef`, and not
 * `toDataURL(cb, { width, height })`.
 *
 * `{ width, height }` is not portable. On Android SvgView allocates a bitmap
 * at the requested size and draws into it, which is what you would expect.
 * On iOS the renderer is handed the requested rect but `drawRect:` passes
 * `[self bounds]` instead -- the mounted view's on-screen frame -- so the
 * seal draws at preview size in the corner of a 1080-wide canvas, and screen
 * scale is applied on top. Called with no options both platforms agree with
 * the mount, so the mount is what sets the size.
 *
 * That is also why `captureRef` and react-native-view-shot are absent: an SVG
 * rasterised by its own renderer stays sharp, where a screenshot of a 340pt
 * preview upscaled to 1080 is soft type on a share card.
 */

/**
 * Mount the export Svg at this many dp so it rasterises to 1080x1350 px.
 *
 * Dividing by the pixel ratio first is not tidiness. An offscreen mount of
 * 1080 *points* is 1080 x PixelRatio pixels, which at @3x is a 3240x4050
 * image -- roughly 8MB of PNG arriving as an 11MB base64 string to be decoded
 * on the JS thread. A ninth of that is the difference between a snappy export
 * and a multi-second freeze on a mid-range phone.
 */
export const SEAL_EXPORT_DP = SEAL_WIDTH / PixelRatio.get();
export const SEAL_EXPORT_DP_HEIGHT = SEAL_HEIGHT / PixelRatio.get();

const SEAL_DIRECTORY = 'storm-seals';

/** No Buffer in React Native, and the repo has no decoder of its own. */
function base64ToBytes(base64: string): Uint8Array {
  const binary = global.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** `toDataURL` is callback-only and can simply never answer. */
function rasterise(svg: Svg | null): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!svg?.toDataURL) {
      reject(new Error('The seal is not ready to export yet'));
      return;
    }

    // Without this a failed rasterise leaves the caller's spinner running
    // forever, which reads as the app having hung rather than having failed.
    const timeout = setTimeout(() => reject(new Error('Rendering the seal timed out')), 20_000);

    svg.toDataURL((base64) => {
      clearTimeout(timeout);
      if (base64) resolve(base64);
      else reject(new Error('The seal rendered empty'));
    });
  });
}

/** A stable, sortable, human-readable name. */
export function sealFileName(serial: string, classification: string): string {
  const slug = classification.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `storm-seal-${slug}-${serial}.png`;
}

/**
 * Rasterises and writes the seal to a file, returning its URI.
 *
 * The cache directory rather than documents: this is a derived artifact that
 * can be regenerated from the report at any time, so it has no business
 * competing with the photographs for space the system will not reclaim.
 */
export async function writeSeal(
  svg: Svg | null,
  fileName: string,
): Promise<Result<string>> {
  try {
    const base64 = await rasterise(svg);

    const directory = new Directory(Paths.cache, SEAL_DIRECTORY);
    directory.create({ intermediates: true, idempotent: true });

    const file = new File(directory, fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(base64ToBytes(base64));

    return ok(file.uri);
  } catch (cause) {
    return err('storage', 'The seal could not be created', cause);
  }
}

/**
 * Saves the seal to the camera roll.
 *
 * Permission is requested here, on the tap, rather than on mount. The app
 * already has an open note about permission timing, and a prompt that appears
 * because a screen opened is the exact pattern being fixed elsewhere.
 */
export async function saveSealToLibrary(
  fileUri: string,
  _fileName?: string,
): Promise<Result<true>> {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) {
      return err(
        'permission',
        'Storm Chaser needs permission to add the seal to your photos. You can still share it instead.',
      );
    }

    await MediaLibrary.saveToLibraryAsync(fileUri);
    return ok(true);
  } catch (cause) {
    return err('storage', 'The seal could not be added to your photos', cause);
  }
}

/**
 * Whether the OS share sheet can be offered at all.
 *
 * The screen asks before it decides which single action to run, so that the
 * one button it shows is the one that will actually work here.
 */
export async function canShareSeal(): Promise<boolean> {
  try {
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Opens the OS share sheet.
 *
 * This is the primary way off the device, not the fallback. The sheet on both
 * platforms carries "Save Image" alongside the apps, so it saves AND shares,
 * and it needs no photo-library permission to be shown -- where the direct
 * `saveToLibrary` path does, and on iOS that permission is exactly where the
 * save was failing.
 */
export async function shareSeal(
  fileUri: string,
  _fileName?: string,
): Promise<Result<true>> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return err('unknown', 'Sharing is not available on this device');
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'image/png',
      dialogTitle: 'Share this storm seal',
      UTI: 'public.png',
    });
    return ok(true);
  } catch (cause) {
    return err('unknown', 'The seal could not be shared', cause);
  }
}
