import {
  StyleSheet,
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';
import type { Theme } from '@/core/theme/themes';

export type TextVariant =
  | 'hero'
  | 'score'
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'message'
  | 'caption'
  | 'figure'
  | 'label'
  | 'readout';

export type TextTone = 'default' | 'muted' | 'onAccent';

/** Every variant, so a test can walk the scale without restating it. */
export const TEXT_VARIANTS: TextVariant[] = [
  'hero',
  'score',
  'display',
  'title',
  'heading',
  'body',
  'message',
  'caption',
  'figure',
  'label',
  'readout',
];

/**
 * How tall each face's ink actually is, as a multiple of its font size.
 *
 * Read straight out of the shipped TTFs: `hhea.ascender - hhea.descender +
 * hhea.lineGap`, over `head.unitsPerEm`. Not one of these faces declares a
 * lineGap, so the number is exactly ascent plus descent -- the box the glyphs
 * are drawn in, and the line height the platform picks when nothing sets one.
 *
 * These are measurements, not preferences. Do not round them down to make a
 * layout fit; a face needs what it needs, and the whole point of the floor
 * below is that the scale cannot quietly ask for less. A layout that wants to
 * be tighter than the ink should give the space back with a negative margin,
 * which moves the neighbours without shrinking the box the letters live in.
 *
 * If a theme brings a new face, add it here with its real number. An absent
 * one falls back to the tallest entry rather than to a guess, so the failure
 * mode is loose leading and never a crop; a test walks every face the themes
 * declare so the fallback is never silently load-bearing.
 */
const FACE_INK: Readonly<Record<string, number>> = {
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
 * The line height a variant actually gets: its designed value, or the face's
 * own ink, whichever is taller.
 *
 * The scale used to set leading as the font size plus a small constant, which
 * put twenty-one of the forty-four variant-and-theme combinations under the
 * ink of the face they were setting. React Native clips a glyph to its line
 * box, so every one of those cropped -- ascenders off the top, descenders off
 * the bottom. It was worst where the face is tallest and the constant was
 * smallest: Anton at `score` wanted 84.3px and was given 62, and `hero` in IBM
 * Plex Mono wanted 83.2 and was given 70.
 *
 * `max` rather than a replacement, because the designed value is right
 * wherever it is already generous -- body copy at 17/24 is a deliberate
 * reading rhythm, well clear of Instrument Sans' 1.22, and nothing here should
 * pull it back to the floor. This only ever adds room.
 */
export function leadingFor(fontFamily: string, fontSize: number, designed: number): number {
  return Math.max(designed, Math.ceil(fontSize * inkFor(fontFamily)));
}

/**
 * The tallest face in the table, and what an unmeasured one is treated as.
 *
 * An unknown family used to throw. That was right for a pure function read by
 * a test and wrong for the render path, where it turns a mistyped font name
 * into a crashed screen. Erring tall instead costs some leading and cannot
 * crop, which is the direction to be wrong in. Drift is caught by a test that
 * walks every face the four themes declare, not by a runtime failure.
 */
const FALLBACK_INK = Math.max(...Object.values(FACE_INK));

export function inkFor(fontFamily: string): number {
  return FACE_INK[fontFamily] ?? FALLBACK_INK;
}

/**
 * The faces that carry a real measurement, so a test can check that every
 * family the themes actually set is one of them. Without that check the
 * fallback above becomes load-bearing the first time a theme brings a new
 * face, and loose leading is the kind of wrong nobody files a bug about.
 */
export const MEASURED_FACES: readonly string[] = Object.keys(FACE_INK);

/**
 * The type scale.
 *
 * Every size moved up from the previous scale, which topped out at 34px and
 * bottomed out at a 10px uppercase mono label used for whole sentences. The
 * floor is now 12px and long-form copy has its own variant.
 *
 * `hero` and `readout` are always mono so columns of figures line up.
 * `score`, `display` and `title` take the theme's display face, which is what
 * carries the personality difference between Skyward and Field Card.
 *
 * `score` exists because a headline number is not a column: the Chase Index is
 * one figure with nothing to align to, and setting it in the display face is
 * what makes it read as the app's own number rather than as instrument output.
 *
 * The `lineHeight` written into each case below is a REQUEST, not the final
 * answer. It passes through `leadingFor`, which raises it to the face's own
 * ink where the request is too tight -- so a number here can be read as the
 * rhythm this variant wants, and never as a promise that the glyphs fit in it.
 */
export function variantStyle(variant: TextVariant, theme: Theme): TextStyle {
  const style = designedStyle(variant, theme);

  return {
    ...style,
    lineHeight: leadingFor(
      style.fontFamily as string,
      style.fontSize as number,
      style.lineHeight as number,
    ),
  };
}

/** The scale as designed, before the ink floor is applied. */
function designedStyle(variant: TextVariant, theme: Theme): TextStyle {
  const { type, colors } = theme;

  // Display tracking is a theme's to refuse: a face as tight as Anton clips
  // its own glyphs when the scale pulls it tighter still.
  const track = (amount: number) => amount * type.displayTracking;

  switch (variant) {
    case 'hero':
      return { fontFamily: type.monoBold, fontSize: 64, lineHeight: 70, letterSpacing: -2, color: colors.text };
    case 'score':
      // This is the case that kept losing glyphs. It shipped at 54 under a
      // 56px face, was raised to 62 against a rule that only required the line
      // box to clear the font SIZE, and still cropped: Anton's ink is 1.505em,
      // so at 56px it needs 85. Requesting 62 here is now safe because
      // `leadingFor` raises it per face rather than per guess.
      return { fontFamily: type.display, fontSize: 56, lineHeight: 62, letterSpacing: track(-2), color: colors.text };
    case 'display':
      return { fontFamily: type.display, fontSize: 40, lineHeight: 44, letterSpacing: track(-1), color: colors.text };
    case 'title':
      return { fontFamily: type.display, fontSize: 24, lineHeight: 30, letterSpacing: track(-0.5), color: colors.text };
    case 'heading':
      return { fontFamily: type.bodySemibold, fontSize: 17, lineHeight: 22, color: colors.text };
    case 'body':
      return { fontFamily: type.body, fontSize: 17, lineHeight: 24, color: colors.text };
    // Long-form copy in banners and explanations. Sentence case, never the
    // tracked uppercase mono that `label` uses.
    case 'message':
      return { fontFamily: type.bodyMedium, fontSize: 17, lineHeight: 24, color: colors.text };
    case 'caption':
      return { fontFamily: type.body, fontSize: 15, lineHeight: 21, color: colors.textMuted };
    // Mono readings inside a chart: hourly temperatures, the ends of an
    // outlook bar. Sized between `label` and `body` on purpose, because these are
    // numbers to be read at a glance in a narrow column, and body-sized mono
    // digits are wide enough to crowd the chart they annotate. Charts used to
    // set 13, 14 and 16 inline; this is the one size they share.
    case 'figure':
      return { fontFamily: type.monoMedium, fontSize: 16, lineHeight: 20, color: colors.text };
    // Instrument labels only: single words like CAPE or GUSTS.
    case 'label':
      return {
        fontFamily: type.monoMedium,
        fontSize: 12,
        lineHeight: 16,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.textMuted,
      };
    case 'readout':
      return { fontFamily: type.monoBold, fontSize: 26, lineHeight: 30, color: colors.text };
  }
}

/**
 * Horizontal breathing room for a variant, in points.
 *
 * React Native measures a text box from the font's advance widths and then
 * clips to that box. A display face with real side bearings, Anton especially,
 * and worse once negative tracking pulls the glyphs tighter, paints outside
 * that measurement, so the first and last letters lose a sliver of ink. It is
 * most obvious on a capital that overhangs, and it gets worse as the size goes
 * up, which is why it showed on headings and not on body copy.
 *
 * The allowance is padding cancelled by an equal negative margin: the drawing
 * box gets wider, the layout box does not move, and alignment (including the
 * right-aligned readouts) is unchanged. Sized off the font rather than fixed,
 * so it holds for any typeface a future theme brings with it.
 *
 * `tracking` is the variant's own letterSpacing, and it is added to the
 * allowance rather than ignored. Negative tracking is not a visual effect the
 * platform applies after measuring -- it shortens the advance of EVERY glyph,
 * the last one included, so the measured box comes up short by the full amount
 * while the final letter still paints its own ink. That is the difference
 * between a display face that merely looks tight and one whose last character
 * arrives with a slice taken off it, and it is worst exactly where the scale
 * tightens hardest: the 64px reading and the 56px score.
 */
export function bleedFor(
  variant: TextVariant,
  fontSize: number,
  tracking = 0,
): TextStyle | null {
  switch (variant) {
    case 'hero':
    case 'score':
    case 'display':
    case 'title': {
      const bleed = Math.ceil(fontSize * 0.08) + Math.ceil(Math.abs(tracking));
      return { paddingHorizontal: bleed, marginHorizontal: -bleed };
    }
    // Tracked uppercase mono: letterSpacing adds a trailing gap after the last
    // glyph, so it needs room on the right but never clips on the left.
    case 'label':
      return { paddingRight: 2, marginRight: -2 };
    default:
      return null;
  }
}

function toneColor(tone: TextTone, theme: Theme): string | undefined {
  switch (tone) {
    case 'muted':
      return theme.colors.textMuted;
    case 'onAccent':
      return theme.colors.onAccent;
    case 'default':
      return undefined;
  }
}

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Escape hatch for tier colours, which are data driven rather than semantic. */
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function Text({
  variant = 'body',
  tone = 'default',
  color,
  style,
  ...rest
}: TextProps) {
  const { theme } = useAppTheme();

  const override = color ?? toneColor(tone, theme);

  /**
   * Flatten before measuring, because the caller wins.
   *
   * The ink floor used to live in `variantStyle` alone, which made it a
   * suggestion: `style` is applied after the variant, so any caller passing
   * its own `lineHeight` -- and a dozen of them do, the wordmark and the theme
   * previews included -- put the line box straight back under the face and
   * cropped the glyphs again. The wordmark asked for `size * 0.94`, which is
   * 21px of box for Anton at 22px, where Anton needs 34.
   *
   * So the floor is applied here instead, to the style that actually renders,
   * and it is the LAST thing in the array. A caller can still ask for more
   * leading and get it; it can no longer ask for less than the face needs.
   * A component that wants the tight stack back should give the space back to
   * layout with a negative margin, the way `Wordmark` does, rather than by
   * shrinking the box the letters are drawn in.
   */
  const resolved = StyleSheet.flatten<TextStyle>([
    variantStyle(variant, theme),
    override ? { color: override } : null,
    style,
  ]);

  const fontSize = resolved.fontSize ?? 17;

  return (
    <RNText
      style={[
        // First, so a caller's own margins still override the allowance. Sized
        // off the resolved size rather than the variant's, for the same reason
        // the leading is: the caller may have changed it.
        bleedFor(variant, fontSize, resolved.letterSpacing ?? 0),
        resolved,
        {
          lineHeight: leadingFor(
            resolved.fontFamily ?? theme.type.body,
            fontSize,
            resolved.lineHeight ?? 0,
          ),
        },
      ]}
      {...rest}
    />
  );
}
