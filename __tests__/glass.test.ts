import { AA_TEXT, compositeHex, contrastRatio, meetsAA } from '@/core/theme/contrast';
import { THEME_NAMES, getTheme } from '@/core/theme/themes';

/**
 * The frost, held to the same standard as every other theme token.
 *
 * This lives apart from `theme.test.ts` for one reason: the frost is the only
 * colour in the system that is not opaque, and a translucent surface cannot be
 * checked the way the rest of the palette is. Every other assertion over there
 * compares two declared values. These have to composite first -- the panel is
 * a pane in front of a four-stop gradient, so what the eye actually gets
 * depends on which stop is behind it, and the answer has to hold for all four.
 */
describe.each(THEME_NAMES)('%s glass', (name) => {
  const theme = getTheme(name);

  it('defines every glass token, frosted or not', () => {
    const { glass } = theme;
    const colour = /^(#[0-9A-Fa-f]{6}|rgba?\([0-9.,\s]+\))$/;

    expect(typeof glass.enabled).toBe('boolean');
    // Real values even where the frost is off, so nothing downstream has to
    // handle a missing one.
    expect(glass.fill).toMatch(colour);
    expect(glass.rim).toMatch(colour);
    expect(glass.shade).toMatch(colour);
    expect(glass.sheen).toHaveLength(2);
    for (const stop of glass.sheen) expect(stop).toMatch(colour);
  });

  /**
   * The worst stop is the one that decides whether body copy is readable, so
   * every stop is checked rather than the one the designer had in mind.
   */
  it('keeps text readable through the frost, over every stop behind it', () => {
    if (!theme.glass.enabled) return;

    const fill = parseRgba(theme.glass.fill);

    for (const stop of theme.colors.backgroundGradient) {
      const behind = compositeHex(fill.hex, stop, fill.alpha);

      expect(meetsAA(theme.colors.text, behind, AA_TEXT)).toBe(true);
      expect(meetsAA(theme.colors.textMuted, behind, AA_TEXT)).toBe(true);
    }
  });

  /**
   * Frost that is nearly opaque is a tint, and frost you can read a cloud
   * through is not a surface. Both ends are failures, so both are pinned: the
   * fill has to actually let the sky through, and it has to stay recognisably
   * the surface it is standing in for rather than drifting into a colour of
   * its own -- which is the mistake that would quietly undo the contrast
   * guarantees the opaque palette is built on.
   */
  it('keeps the frost between a tint and a window', () => {
    if (!theme.glass.enabled) return;

    const { alpha, hex } = parseRgba(theme.glass.fill);

    expect(alpha).toBeGreaterThanOrEqual(0.5);
    expect(alpha).toBeLessThan(0.9);
    expect(contrastRatio(hex, theme.colors.surface)).toBeLessThan(1.2);
  });
});

/**
 * Only the themes with a sky behind a card are allowed to frost one. This is
 * the whole reason the token is per-theme rather than a global switch, and it
 * is worth asserting because "turn it on everywhere, it looks nice" is exactly
 * the change someone would make.
 */
it('frosts the Skyward variants and nothing else', () => {
  const frosted = THEME_NAMES.filter((name) => getTheme(name).glass.enabled);

  expect([...frosted].sort()).toEqual(['skyward-day', 'skyward-night']);
});

/**
 * `rgba(r, g, b, a)` split into the hex and alpha `compositeHex` wants. The
 * themes declare the frost the way a native view accepts it and the contrast
 * module works in hex, so one of the two has to give.
 */
function parseRgba(value: string): { hex: string; alpha: number } {
  const parts = value
    .replace(/^rgba?\(/, '')
    .replace(/\)$/, '')
    .split(',')
    .map((part) => Number(part.trim()));

  const [r = 0, g = 0, b = 0, a = 1] = parts;
  const channel = (n: number) => Math.round(n).toString(16).padStart(2, '0');

  return { hex: `#${channel(r)}${channel(g)}${channel(b)}`, alpha: a };
}
