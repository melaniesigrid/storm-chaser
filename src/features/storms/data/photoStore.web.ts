import { err, ok, type Result } from '@/core/utils/result';

/**
 * Photo persistence for the web build.
 *
 * The native store copies the camera's temporary file into the app document
 * directory. None of that exists in a browser, and `expo-file-system`'s web
 * implementation is a stub -- `FileSystemFile` has an empty constructor and
 * its methods are no-ops -- so the shared code path returned "the photo could
 * not be saved to this device", which was accurate and useless.
 *
 * What a browser does have: a canvas. So the photo is decoded, scaled down
 * and re-encoded as a JPEG data URL, and that string IS the URI the report
 * carries. Everywhere the app already does `<Image source={{ uri }} />` keeps
 * working untouched, the photo survives a reload because it lives inside the
 * report record, and deleting a report deletes its photo by construction --
 * there is no second store to keep in step.
 *
 * The cost is honest and worth stating: reports live in AsyncStorage, which
 * on web is `localStorage`, which is a handful of megabytes. A full-size
 * phone photo as base64 would fill it in three shots. So the encoder below
 * spends effort getting each photo under a budget instead.
 */

/**
 * The longest edge a stored photo may have, in pixels.
 *
 * 1280 is chosen against what the photo is FOR rather than against the
 * camera: a field log entry is looked at on a phone screen and inside a
 * 1080x1350 seal, and neither can show more than this.
 */
const MAX_EDGE = 1280;

/**
 * Target size of the encoded data URL, in bytes.
 *
 * ~350KB of base64 means roughly a dozen reports inside a conservative 5MB
 * localStorage budget, alongside everything else the app stores. Past that
 * the repository's own write fails with a quota error, which is a worse
 * message in a worse place, so it is better to spend the quality here.
 */
const TARGET_BYTES = 350_000;

/** Quality steps to try, in order, before giving up and shrinking further. */
const QUALITY_STEPS = [0.72, 0.6, 0.48] as const;

/** The floor, named rather than indexed off the end of the list above. */
const LOWEST_QUALITY = 0.48;

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // The picker hands back a blob: or data: URL from this same origin, but
    // crossOrigin keeps a remote URI from tainting the canvas and making
    // toDataURL throw a SecurityError several steps later.
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not decode the image at ${uri}`));
    image.src = uri;
  });
}

function encodeAt(image: HTMLImageElement, maxEdge: number, quality: number): string | null {
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return null;

  // White underneath: a PNG with transparency re-encoded to JPEG goes black
  // in the transparent regions otherwise, which on a sky photo is dramatic.
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Data URLs are base64, so the encoded string is about 4/3 of the bytes it
 * represents. Measuring the string is what matters here anyway: the string is
 * what goes into storage.
 */
function byteLength(dataUrl: string): number {
  return dataUrl.length;
}

export async function persistPhoto(
  temporaryUri: string,
  _reportId: string,
): Promise<Result<string>> {
  try {
    const image = await loadImage(temporaryUri);

    // Drop the long edge as well as the quality. Quality alone bottoms out
    // around 0.4 with visible blocking; halving the dimensions is a quarter
    // of the pixels and looks far better at the same file size.
    for (const maxEdge of [MAX_EDGE, 960, 720]) {
      for (const quality of QUALITY_STEPS) {
        const encoded = encodeAt(image, maxEdge, quality);
        if (!encoded) {
          return err('storage', 'This browser could not prepare the photo for saving');
        }
        if (byteLength(encoded) <= TARGET_BYTES) return ok(encoded);
      }
    }

    // Everything tried and still too big. Return the smallest rather than
    // failing: an oversized photo that might not fit is a better outcome than
    // a lost report, and the repository reports a quota failure honestly if
    // it does not fit.
    const smallest = encodeAt(image, 720, LOWEST_QUALITY);
    return smallest
      ? ok(smallest)
      : err('storage', 'This browser could not prepare the photo for saving');
  } catch (cause) {
    return err('storage', 'The photo could not be saved in this browser', cause);
  }
}

/**
 * Nothing to delete.
 *
 * On web the photo is not a file beside the report, it is a string inside it,
 * so removing the report removes the photo. Returning ok rather than throwing
 * keeps the delete path identical on both platforms.
 */
export async function deletePhoto(_uri: string): Promise<Result<true>> {
  return ok(true);
}

export async function photoExists(uri: string): Promise<boolean> {
  // A data URL is self-contained, so it exists as long as the record does.
  // A blob: URL from a previous session does not survive a reload, and
  // reporting it as present would render a broken image.
  return uri.startsWith('data:');
}

/** Same reasoning as `deletePhoto`: erasing the records erases the photos. */
export async function deleteAllPhotos(): Promise<Result<true>> {
  return ok(true);
}
