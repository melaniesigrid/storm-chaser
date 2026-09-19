import { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  ClipPath,
  Defs,
  G,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { useAppTheme } from '@/core/theme/useAppTheme';

import { strikeTiming } from './launchSequence';

const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * The bolt, in a 0 to 100 box. Taller than the plate on purpose: it is cropped
 * top and bottom by the plate, which is what makes it read as a strike passing
 * through the mark rather than as a sticker sitting inside it.
 */
const BOLT = '56,-14 20,44 46,44 33,114 84,32 54,32 73,-14';

/** How far above the plate the bolt waits before it drops. */
const STRIKE_TRAVEL = -130;

/** One breath of the pulse. Slow enough to read as waiting, not as blinking. */
const PULSE_MS = 900;

/** How far down the bolt dims at the bottom of a breath. */
const PULSE_FLOOR = 0.45;

/**
 * Below this, the mark is bolt and plate only.
 *
 * The same rule `assets/brand/README.md` states for the exported icon, and for
 * the same reason: under about 80px the letters collide with the bolt's own
 * crossbar, and one legible silhouette beats a monogram nobody can resolve.
 * It lives here as well so a 26px mark in a header and a 48px icon on a home
 * screen make the same decision without anyone having to remember to pass a
 * flag.
 */
const LETTER_FLOOR = 80;

export type MonogramMotion =
  /** Chrome: a list row, a header that is not being arrived at. */
  | 'none'
  /**
   * The bolt strikes down once as the mark appears. One shot, not a loop: a
   * mark that keeps re-striking turns into a nervous tic on any screen you sit
   * on. This is what the mark does wherever it is a moment.
   */
  | 'strike'
  /**
   * The bolt breathes, indefinitely. Only legitimate where the loop means
   * something -- the mark standing in for a spinner while a forecast is in
   * flight -- and never as decoration.
   */
  | 'pulse';

export interface MonogramProps {
  size?: number;
  motion?: MonogramMotion;
}

/**
 * The app mark: SC struck through by a bolt, on a plate.
 *
 * Geometry rather than an exported image, so it is sharp from a 24px list row
 * to a 512px store listing and it repaints itself when the theme changes. The
 * SC is drawn twice, stroke pass then fill pass, because SVG `paint-order`
 * is not supported in react-native-svg, and drawing the stroke underneath is
 * the only way to keep it outside the letterforms rather than eating into
 * them.
 *
 * How fast it strikes is the theme's decision, not this component's: the
 * timing comes from `strikeTiming`, so the mark eases on Skyward, stamps on
 * Field Card and cuts on Broadcast like everything else those themes touch.
 */
export function Monogram({ size = 104, motion = 'none' }: MonogramProps) {
  const { theme } = useAppTheme();
  const reduceMotion = useReducedMotion();

  const plate = theme.brand.monogramPlate;
  const mark = theme.brand.monogramMark;

  // Reduced motion collapses every mode to the finished mark. Not a slower
  // version of the animation -- the end state, immediately.
  const still = reduceMotion || motion === 'none';

  const strike = useSharedValue(motion === 'strike' && !still ? STRIKE_TRAVEL : 0);
  const glow = useSharedValue(1);

  const { delayMs, durationMs } = strikeTiming(theme.motion.language, reduceMotion);

  useEffect(() => {
    cancelAnimation(strike);
    cancelAnimation(glow);

    if (still) {
      strike.value = 0;
      glow.value = 1;
    } else if (motion === 'strike') {
      glow.value = 1;
      strike.value = STRIKE_TRAVEL;
      strike.value = withDelay(
        delayMs,
        withTiming(0, { duration: durationMs, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
      );
    } else {
      strike.value = 0;
      glow.value = withRepeat(
        withTiming(PULSE_FLOOR, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    }

    // The pulse is the only mode that outlives its own effect, and an infinite
    // animation left running on an unmounted tree is a leak with a heartbeat.
    return () => {
      cancelAnimation(strike);
      cancelAnimation(glow);
    };
  }, [still, motion, delayMs, durationMs, strike, glow]);

  const boltProps = useAnimatedProps(() => ({
    // A plain translate, not a matrix: react-native-svg animates the `y`
    // transform on the native side without a re-render.
    y: strike.value,
    opacity: glow.value,
  }));

  const radius = theme.brand.monogramRadius * 100;
  const letters = theme.borderWidth > 0 ? 'SC' : 'sc';
  const lettered = size >= LETTER_FLOOR;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="sc-plate">
          <Rect x="0" y="0" width="100" height="100" rx={radius} ry={radius} />
        </ClipPath>
      </Defs>

      <G clipPath="url(#sc-plate)">
        <Rect x="0" y="0" width="100" height="100" rx={radius} ry={radius} fill={plate} />

        <AnimatedG animatedProps={boltProps}>
          <Polygon points={BOLT} fill={mark} />
        </AnimatedG>

        {/* Stroke pass. Doubled width because SVG centres a stroke on the path. */}
        {lettered ? (
          <>
            <SvgText
              x="50"
              y="50"
              textAnchor="middle"
              alignmentBaseline="central"
              fontFamily={theme.type.display}
              fontSize="46"
              fill="none"
              stroke={mark}
              strokeWidth="8"
              strokeLinejoin="round"
            >
              {letters}
            </SvgText>
            <SvgText
              x="50"
              y="50"
              textAnchor="middle"
              alignmentBaseline="central"
              fontFamily={theme.type.display}
              fontSize="46"
              fill={plate}
            >
              {letters}
            </SvgText>
          </>
        ) : null}
      </G>
    </Svg>
  );
}
