import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
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

const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * The bolt, in a 0–100 box. Taller than the plate on purpose: it is cropped
 * top and bottom by the plate, which is what makes it read as a strike passing
 * through the mark rather than as a sticker sitting inside it.
 */
const BOLT = '56,-14 20,44 46,44 33,114 84,32 54,32 73,-14';

export interface MonogramProps {
  size?: number;
  /**
   * The bolt strikes down once as the mark appears. One shot, not a loop: a
   * mark that keeps re-striking turns into a nervous tic on any screen you sit
   * on. Off wherever the mark is chrome rather than a moment — a list row, a
   * header.
   */
  animated?: boolean;
}

/**
 * The app mark: SC struck through by a bolt, on a plate.
 *
 * Geometry rather than an exported image, so it is sharp from a 24px list row
 * to a 512px store listing and it repaints itself when the theme changes. The
 * SC is drawn twice — stroke pass, then fill pass — because SVG `paint-order`
 * is not supported in react-native-svg, and drawing the stroke underneath is
 * the only way to keep it outside the letterforms rather than eating into
 * them.
 */
export function Monogram({ size = 104, animated = false }: MonogramProps) {
  const { theme } = useAppTheme();
  const reduceMotion = useReducedMotion();

  const plate = theme.brand.monogramPlate;
  const mark = theme.brand.monogramMark;

  const strike = useSharedValue(animated && !reduceMotion ? -130 : 0);

  useEffect(() => {
    if (!animated || reduceMotion) {
      strike.value = 0;
      return;
    }

    strike.value = withDelay(
      120,
      withTiming(0, { duration: 420, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    );
  }, [animated, reduceMotion, strike]);

  const boltProps = useAnimatedProps(() => ({
    // A plain translate, not a matrix: react-native-svg animates the `y`
    // transform on the native side without a re-render.
    y: strike.value,
  }));

  const radius = theme.brand.monogramRadius * 100;
  const letters = theme.borderWidth > 0 ? 'SC' : 'sc';

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
      </G>
    </Svg>
  );
}
