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

export function meetsAA(foreground: string, background: string, threshold = AA_TEXT): boolean {
  return contrastRatio(foreground, background) >= threshold;
}
