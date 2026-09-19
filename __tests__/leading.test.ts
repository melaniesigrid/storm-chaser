import { THEMES, THEME_NAMES } from '@/core/theme/themes';
import { TEXT_VARIANTS, leadingFor, variantStyle } from '@/core/ui/Text';

/**
 * The ink heights, restated here from the font files rather than imported
 * from `Text.tsx`.
 *
 * Importing the table would make this test a tautology: it would assert that
 * the code agrees with itself, and it would keep agreeing after someone shaved
 * a ratio down to make a layout fit. These numbers are
 * `(hhea.ascender - hhea.descender + hhea.lineGap) / head.unitsPerEm`, read
 * out of the TTFs under `@expo-google-fonts`, and they are the independent
 * half of the check. If the two ever disagree, one of them is wrong about a
 * real font and that is exactly what should fail.
 */
const MEASURED_INK: Readonly<Record<string, number>> = {
  Anton_400Regular: 1.505,
  BigShouldersDisplay_900Black: 1.197,
  BigShouldersDisplay_300Light: 1.197,
  BricolageGrotesque_800ExtraBold: 1.2,
  BricolageGrotesque_200ExtraLight: 1.2,
  IBMPlexMono_400Regular: 1.3,
  IBMPlexMono_500Medium: 1.3,
  IBMPlexMono_600SemiBold: 1.3,
  InstrumentSans_400Regular: 1.22,
  InstrumentSans_500Medium: 1.22,
  InstrumentSans_600SemiBold: 1.22,
  InstrumentSans_700Bold: 1.22,
};

/**
 * The regression this file exists for.
 *
 * React Native clips a glyph to its line box. The scale used to set leading as
 * the font size plus a small constant, which left 21 of the 44
 * variant-and-theme combinations shorter than the ink of the face they were
 * setting -- ascenders cut off the top, descenders off the bottom, worst on
 * Broadcast's `score` (Anton wanted 85px, got 62).
 *
 * The rule that let it ship was `lineHeight >= fontSize`, which every one of
 * those 21 passed. Font size is not the ink height, and no face in this app
 * has an ink height below 1.197em. So the check is against the FACE, per
 * theme, across the whole scale.
 */
describe('vertical leading', () => {
  it('never sets a line box shorter than the ink of the face in it', () => {
    const clipped: string[] = [];

    for (const themeName of THEME_NAMES) {
      for (const variant of TEXT_VARIANTS) {
        const style = variantStyle(variant, THEMES[themeName]);
        const family = style.fontFamily as string;
        const ink = MEASURED_INK[family];

        // A face with no measured height is its own failure: it means the app
        // is setting type in something nobody has checked for cropping.
        expect({ family, measured: ink !== undefined }).toEqual({ family, measured: true });

        const floor = (style.fontSize as number) * (ink as number);
        if ((style.lineHeight as number) < floor) {
          clipped.push(
            `${themeName}/${variant}: ${style.lineHeight}px line box, ${family} needs ${floor.toFixed(1)}px`,
          );
        }
      }
    }

    expect(clipped).toEqual([]);
  });

  /**
   * The floor only ever adds room. Body copy at 17/24 is a reading rhythm well
   * clear of Instrument Sans' 1.22em, and a floor that "corrected" it down to
   * 21 would be the same bug pointing the other way.
   */
  it('leaves a generous designed leading alone', () => {
    expect(leadingFor('InstrumentSans_400Regular', 17, 24)).toBe(24);
    expect(leadingFor('IBMPlexMono_500Medium', 12, 16)).toBe(16);
  });

  it('raises a tight designed leading to the face', () => {
    // Anton at 56px: 1.505em is 84.3, rounded up so the box is never a
    // fraction of a pixel short of the ink it has to hold.
    expect(leadingFor('Anton_400Regular', 56, 62)).toBe(85);
    expect(leadingFor('IBMPlexMono_600SemiBold', 64, 70)).toBe(84);
  });

  /**
   * A new theme bringing an unmeasured face is the way this regression comes
   * back. Guessing a ratio would crop it silently at every size, so it throws.
   */
  it('refuses a face it has never measured rather than guessing', () => {
    expect(() => leadingFor('SomeNewFace_400Regular', 24, 30)).toThrow(/FACE_INK/);
  });

  /** Integer line heights: a fractional line box rounds against the glyph. */
  it('keeps every line height a whole number of pixels', () => {
    for (const themeName of THEME_NAMES) {
      for (const variant of TEXT_VARIANTS) {
        const { lineHeight } = variantStyle(variant, THEMES[themeName]);
        expect(Number.isInteger(lineHeight)).toBe(true);
      }
    }
  });
});
