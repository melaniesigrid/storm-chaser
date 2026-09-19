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
function variantStyle(variant: TextVariant, theme: Theme): TextStyle {
  const { type, colors } = theme;

  // Display tracking is a theme's to refuse: a face as tight as Anton clips
  // its own glyphs when the scale pulls it tighter still.
  const track = (amount: number) => amount * type.displayTracking;

  switch (variant) {
    case 'hero':
      return { fontFamily: type.monoBold, fontSize: 64, lineHeight: 66, letterSpacing: -2, color: colors.text };
    case 'score':
      return { fontFamily: type.display, fontSize: 56, lineHeight: 54, letterSpacing: track(-2), color: colors.text };
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

  return (
    <RNText
      style={[variantStyle(variant, theme), override ? { color: override } : null, style]}
      {...rest}
    />
  );
}
