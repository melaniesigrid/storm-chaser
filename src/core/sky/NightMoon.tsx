import { useMemo } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { useNow } from '@/core/utils/useNow';

import { Moon } from './Moon';
import { moonPhase } from './moonPhase';

/**
 * The moon in the night sky, behind everything.
 *
 * Sits with the starfield: drawn only on a dark theme, under all content, and
 * decorative to a screen reader -- the phase is real information, but it is
 * not information this screen is ABOUT, and announcing it on every dark screen
 * would be noise. The Conditions screen surfaces it properly in a panel.
 *
 * High and to the right, clear of the safe-area inset and of any header,
 * because that is the one part of a phone screen nothing else competes for.
 */

/**
 * How often the phase is recomputed.
 *
 * The moon moves about twelve degrees a day, so a drawing of it is stale after
 * roughly an hour at the level of detail visible here. Half an hour is under
 * that with room to spare, and it is thirty-two ticks a day rather than a
 * timer per frame.
 */
const REFRESH_MS = 30 * 60 * 1000;

export interface NightMoonProps {
  size?: number;
  /** Injectable clock, so a screenshot run can pin a phase. */
  now?: Date;
}

export function NightMoon({ size = 54, now }: NightMoonProps) {
  const { theme } = useAppTheme();

  // The app's own ticking clock rather than a second interval in here. It
  // keeps the phase honest on a screen left open overnight, and a pinned
  // `now` simply ignores it.
  const tick = useNow(REFRESH_MS);
  const phase = useMemo(() => moonPhase(now ?? new Date(tick)), [now, tick]);

  if (!theme.isDark) return null;

  /*
   * A new moon is drawn as nothing, correctly -- the lit path has zero area.
   * Rendering an invisible SVG on every dark screen for the two nights either
   * side of new is pure cost, so those nights skip it. The earthshine disc
   * goes with it: on its own, without a sliver, it reads as a smudge.
   */
  if (phase.illuminated < 0.02) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 78, right: 28, opacity: 0.92 }}
    >
      <Moon size={size} phase={phase} />
    </View>
  );
}
