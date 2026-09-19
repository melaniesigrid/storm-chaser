import { Text as RNText, type StyleProp, type TextProps as RNTextProps, type TextStyle } from 'react-native';

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
 */
export function variantStyle(variant: TextVariant, theme: Theme): TextStyle {
  const { type, colors } = theme;

  // Display tracking is a theme's to refuse: a face as tight as Anton clips
  // its own glyphs when the scale pulls it tighter still.
  const track = (amount: number) => amount * type.displayTracking;

  switch (variant) {
    case 'hero':
      return { fontFamily: type.monoBold, fontSize: 64, lineHeight: 70, letterSpacing: -2, color: colors.text };
    case 'score':
      // lineHeight was 54 under a 56px face, which cropped every descender and
      // the top of the caps in Anton. No line box may be shorter than its own
      // font size; see `assertLineHeights` in the theme test.
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
    // outlook bar. Sized between `label` and `body` on purpose — these are
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
 * clips to that box. A display face with real side bearings — Anton especially,
 * and worse once negative tracking pulls the glyphs tighter — paints outside
 * that measurement, so the first and last letters lose a sliver of ink. It is
 * most obvious on a capital that overhangs, and it gets worse as the size goes
 * up, which is why it showed on headings and not on body copy.
 *
 * The allowance is padding cancelled by an equal negative margin: the drawing
 * box gets wider, the layout box does not move, and alignment (including the
 * right-aligned readouts) is unchanged. Sized off the font rather than fixed,
 * so it holds for any typeface a future theme brings with it.
 */
export function bleedFor(variant: TextVariant, fontSize: number): TextStyle | null {
  switch (variant) {
    case 'hero':
    case 'score':
    case 'display':
    case 'title': {
      const bleed = Math.ceil(fontSize * 0.08);
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
  const base = variantStyle(variant, theme);

  return (
    <RNText
      style={[
        base,
        bleedFor(variant, base.fontSize ?? 17),
        override ? { color: override } : null,
        style,
      ]}
      {...rest}
    />
  );
}
