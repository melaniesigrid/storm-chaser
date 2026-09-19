import type Svg from 'react-native-svg';

import { err, ok, type Result } from '@/core/utils/result';

import { SEAL_HEIGHT, SEAL_WIDTH } from './sealSvg';

/**
 * Seal export in a browser.
 *
 * The native path writes a file into the cache directory and hands its URI to
 * MediaLibrary or the OS share sheet. A browser has none of those: there is
 * no camera roll, expo-file-system is a stub on web, and expo-sharing only
 * wraps the native sheet. What a browser does have is a download and,
 * sometimes, the Web Share API.
 *
 * So on web the "file URI" IS the data URL. Nothing is written to disk until
 * the person chooses to save, which is what a download already means.
 */

/** No pixel-ratio division on web: the SVG rasterises at its own viewBox. */
export const SEAL_EXPORT_DP = SEAL_WIDTH;
export const SEAL_EXPORT_DP_HEIGHT = SEAL_HEIGHT;

function rasterise(svg: Svg | null): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!svg?.toDataURL) {
      reject(new Error('The seal is not ready to export yet'));
      return;
    }
    const timeout = setTimeout(() => reject(new Error('Rendering the seal timed out')), 20_000);
    svg.toDataURL((base64) => {
      clearTimeout(timeout);
      if (base64) resolve(base64);
      else reject(new Error('The seal rendered empty'));
    });
  });
}

export function sealFileName(serial: string, classification: string): string {
  const slug = classification.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `storm-seal-${slug}-${serial}.png`;
}

/**
 * Returns a data URL rather than a path.
 *
 * `toDataURL` on web already hands back base64, so this only has to put the
 * `data:` prefix back on. Keeping the same signature as the native module is
 * what lets the screen stay platform-agnostic.
 */
export async function writeSeal(svg: Svg | null, _fileName: string): Promise<Result<string>> {
  try {
    const base64 = await rasterise(svg);
    return ok(base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`);
  } catch (cause) {
    return err('storage', 'The seal could not be created', cause);
  }
}

/**
 * "Save" on web is a download.
 *
 * There is no photo library to ask permission for, so this never prompts and
 * never fails for permission reasons -- the browser's own download UI is the
 * consent step.
 */
export async function saveSealToLibrary(dataUrl: string): Promise<Result<true>> {
  try {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'storm-seal.png';
    // Firefox requires the anchor to be in the document before a click on it
    // counts as a user-initiated download.
    document.body.appendChild(link);
    link.click();
    link.remove();
    return ok(true);
  } catch (cause) {
    return err('storage', 'The seal could not be downloaded', cause);
  }
}

/**
 * The Web Share API, where it exists.
 *
 * Only over HTTPS and only on browsers that implement `canShare` for files,
 * which in practice means mobile Safari and Chrome on Android -- exactly the
 * phones this build is being looked at on. Everywhere else it reports that
 * sharing is unavailable so the screen can offer the download instead,
 * rather than silently doing nothing.
 */
export async function shareSeal(dataUrl: string): Promise<Result<true>> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], 'storm-seal.png', { type: 'image/png' });

    const shareData = { files: [file], title: 'Storm seal' };
    if (typeof navigator.share !== 'function' || !navigator.canShare?.(shareData)) {
      return err('unknown', 'This browser cannot share files. Use Save instead.');
    }

    await navigator.share(shareData);
    return ok(true);
  } catch (cause) {
    // A dismissed share sheet rejects with AbortError. That is the person
    // changing their mind, not a failure, and must not raise an alert.
    if (cause instanceof Error && cause.name === 'AbortError') return ok(true);
    return err('unknown', 'The seal could not be shared', cause);
  }
}
