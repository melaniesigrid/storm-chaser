/**
 * WCAG 2.1 relative luminance and contrast ratio.
 *
 * This exists so contrast is a test assertion rather than a design opinion.
 * The previous palette shipped an offline banner at 1.22:1 and a muted token
 * at 2.0:1; both were invisible in one mode and both looked fine in a hex list.
 * A number catches what an eye does not.
 */

/** Parses `#RGB` or `#RRGGBB` into 0-255 channels. Throws on anything else. */
export function parseHex(hex: string): { r: number; g: number; b: number } {
  const value = hex.trim().replace(/^#/, '');

  const expanded =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new Error(`Not a hex colour: ${hex}`);
  }

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Symmetric: order of arguments does not matter. Range 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);

  return (lighter + 0.05) / (darker + 0.05);
}

/** AA: 4.5:1 for body text, 3:1 for large text (24px+, or 19px+ bold). */
export const AA_TEXT = 4.5;
export const AA_LARGE_TEXT = 3;
/** AA: 3:1 for UI component boundaries and meaningful graphics. */
export const AA_NON_TEXT = 3;

/**
 * WCAG 2.3.1 "Three Flashes or Below Threshold". Level A -- a LOWER bar than
 * the AA this project clears everywhere else, and the one an ambient lightning
 * effect is in danger of breaking.
 *
 * A bright change counts as a general flash when it is faster than three per
 * second, changes relative luminance by 0.10 or more, AND covers more than a
 * quarter of the viewport. Failing any one of the three is enough to be safe;
 * the theme tokens stay under all three, because the cost of a wrong call here
 * is somebody's seizure.
 */
export const WCAG_MAX_FLASHES_PER_SECOND = 3;
export const WCAG_GENERAL_FLASH_LUMINANCE_DELTA = 0.1;
export const WCAG_GENERAL_FLASH_AREA_FRACTION = 0.25;

export function meetsAA(foreground: string, background: string, threshold = AA_TEXT): boolean {
  return contrastRatio(foreground, background) >= threshold;
}

/**
 * The colour actually reaching the eye when `top` is drawn over `bottom` at
 * `alpha`.
 *
 * Contrast is a property of what is seen, not of what a token says. The moment
 * anything translucent sits between text and its ground -- a rain band, a
 * scrim, a bloom -- the ground the text is really on is this composite, and
 * that is what the AA check has to run against. Without it the atmosphere layer
 * could quietly wash out a palette that every existing test still calls
 * compliant.
 */
export function compositeHex(top: string, bottom: string, alpha: number): string {
  const over = parseHex(top);
  const under = parseHex(bottom);
  const a = Math.min(1, Math.max(0, alpha));

  const mix = (x: number, y: number) => Math.round(x * a + y * (1 - a));
  const pair = (n: number) => n.toString(16).padStart(2, '0');

  return `#${pair(mix(over.r, under.r))}${pair(mix(over.g, under.g))}${pair(mix(over.b, under.b))}`;
}
