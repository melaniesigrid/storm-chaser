import { AA_TEXT, contrastRatio } from '@/core/theme/contrast';
import { getTheme, THEME_NAMES, SELECTABLE_THEME_NAMES } from '@/core/theme/themes';
import { PURPLE_ON_DARK, PURPLE_ON_LIGHT, cheerPurple } from '@/core/ui/cheerColors';

/**
 * The celebration colour is not a theme token, so the theme contract tests do
 * not reach it. That is exactly why it needs its own: a colour outside the
 * contract is a colour nothing is checking, and "it's only a celebration" is
 * how an unreadable string ships.
 */
describe('the Stormy! cheer clears AA on every theme', () => {
  it.each(THEME_NAMES)('is readable on %s', (name) => {
    const theme = getTheme(name);
    const purple = cheerPurple(theme.isDark);

    // Against both grounds it can land on. The cheer floats over whatever is
    // behind it, which on the field log is the list and on a photo-backed
    // screen is the background.
    expect(contrastRatio(purple, theme.colors.background)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(purple, theme.colors.surface)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('is a different purple on light and dark, not one compromise', () => {
    // One purple that "works everywhere" is a purple that is mediocre
    // everywhere. These are far enough apart that neither is a compromise.
    expect(PURPLE_ON_DARK).not.toBe(PURPLE_ON_LIGHT);
    expect(contrastRatio(PURPLE_ON_DARK, PURPLE_ON_LIGHT)).toBeGreaterThan(3);
  });

  it('does not collide with any tier colour', () => {
    /*
     * The point of purple: a celebration must not read as a severity. If the
     * cheer ever drifted close to the amber or red of the chase ladder, a
     * successful save would look like a warning.
     */
    for (const name of THEME_NAMES) {
      const theme = getTheme(name);
      const purple = cheerPurple(theme.isDark);
      for (const level of ['unsettled', 'active', 'severe'] as const) {
        expect(purple.toLowerCase()).not.toBe(theme.colors.tierText[level].toLowerCase());
      }
    }
  });
});

describe('the bolt on a filled button clears AA', () => {
  it.each(THEME_NAMES)('has readable ink on the accent in %s', (name) => {
    const theme = getTheme(name);
    // The bolt is drawn in `onAccent`, so this is the same guarantee the
    // button label already has -- asserted here because the glyph is a
    // separate component that could be handed a different colour later.
    expect(contrastRatio(theme.colors.onAccent, theme.colors.accent)).toBeGreaterThanOrEqual(
      AA_TEXT,
    );
  });

  it('records why the bolt is not literally black everywhere', () => {
    /*
     * The ask was "make it black", and it is, on three of four themes.
     * Skyward Day's accent is a dark red where pure black reaches only
     * 4.12:1 -- under the floor every other colour in this app clears --
     * while its chosen white reaches 5.10:1. This test exists so that if
     * someone later changes that accent to something black CAN sit on, the
     * assertion fails and the exception gets revisited rather than
     * inherited forever.
     */
    const skywardDay = getTheme('skyward-day');
    expect(contrastRatio('#000000', skywardDay.colors.accent)).toBeLessThan(AA_TEXT);
    expect(contrastRatio(skywardDay.colors.onAccent, skywardDay.colors.accent)).toBeGreaterThanOrEqual(
      AA_TEXT,
    );

    // And on the other three, the theme's own ink really is near-black.
    for (const name of ['skyward-night', 'broadcast', 'field-card'] as const) {
      const theme = getTheme(name);
      expect(contrastRatio(theme.colors.onAccent, '#000000')).toBeLessThan(1.6);
    }
  });
});

describe('the theme picker offers only themes a person can choose', () => {
  it('leaves the two Skyward halves out of the selectable list', () => {
    // Choosing "day" at midnight does not make it day. Both remain real
    // themes that must resolve and satisfy the contract; they are simply not
    // offered as manual options.
    expect(SELECTABLE_THEME_NAMES).not.toContain('skyward-day');
    expect(SELECTABLE_THEME_NAMES).not.toContain('skyward-night');
  });

  it('keeps every selectable theme in the full list', () => {
    for (const name of SELECTABLE_THEME_NAMES) {
      expect(THEME_NAMES).toContain(name);
    }
  });

  it('still holds all four themes to the contract', () => {
    // The guard that matters: dropping two from the picker must not quietly
    // drop them from the themes that get tested.
    expect(THEME_NAMES).toHaveLength(4);
  });
});
