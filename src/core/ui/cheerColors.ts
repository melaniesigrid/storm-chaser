/**
 * The celebration purple, kept apart from the component that draws it.
 *
 * Two values, one file, no React. `StormyCheer` imports Reanimated, which
 * needs the native runtime, so anything that imports the component cannot run
 * in a plain Jest environment -- and a colour nothing can test is a colour
 * nothing is checking. The same split the seal makes between its layout and
 * its SVG, for the same reason.
 *
 * Purple because it is the one hue in this app that means nothing else. The
 * tier ladder owns amber through red and the accent owns the primary action,
 * so a celebration in either would make a successful save read as a severity.
 *
 * Deliberately NOT theme tokens. A token would have to be defined in all four
 * themes and would then be reachable from any screen, which is precisely how
 * a single-purpose colour erodes into just another one. They are held to the
 * same AA floor as the tokens regardless, by `cheerContrast.test.ts`: the
 * worst case is 8.41:1 on the dark themes and 6.96:1 on the light ones,
 * against a 4.5:1 requirement.
 */

export const PURPLE_ON_DARK = '#C9A6FF';
export const PURPLE_ON_LIGHT = '#6B21A8';

/** Which of the two a theme should use. */
export function cheerPurple(isDark: boolean): string {
  return isDark ? PURPLE_ON_DARK : PURPLE_ON_LIGHT;
}
