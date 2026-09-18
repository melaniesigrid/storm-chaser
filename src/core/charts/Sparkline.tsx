import { memo } from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { scaleSeries, toAreaPath, toSmoothPath } from './geometry';

export interface SparklineProps {
  values: number[];
  width: number;
  height: number;
  color: string;
  /** Adds a fading fill beneath the line. */
  fill?: boolean;
  /** Marks the most recent reading. */
  showLast?: boolean;
  strokeWidth?: number;
  /** Unique across mounted sparklines: SVG gradient ids are document global. */
  gradientId?: string;
}

/**
 * A smoothed line chart with no axes, no grid and no legend.
 *
 * The number is already on the screen next to it; this is here to show the
 * shape of the last twelve hours at a glance, which a column of figures cannot
 * do. Curved rather than cornered because temperature is continuous, and the
 * curve is constrained to pass through every measured point.
 *
 * Memoised: the props are primitives plus one array the caller memoises, and
 * every render re-runs the scale and the Catmull-Rom path for a chart that has
 * not changed.
 */
export const Sparkline = memo(function Sparkline({
  values,
  width,
  height,
  color,
  fill = true,
  showLast = true,
  strokeWidth = 2.5,
  gradientId = 'sparkFill',
}: SparklineProps) {
  if (values.length < 2 || width <= 0 || height <= 0) return null;

  const padding = Math.max(strokeWidth, showLast ? 4 : strokeWidth);
  const points = scaleSeries(values, { width, height, padding });
  const line = toSmoothPath(points);
  const area = fill ? toAreaPath(points, height) : '';
  const last = points[points.length - 1];

  return (
    <Svg width={width} height={height}>
      {fill ? (
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.36} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
      ) : null}

      {area ? <Path d={area} fill={`url(#${gradientId})`} /> : null}

      <Path
        d={line}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {showLast && last ? (
        <Circle cx={last.x} cy={last.y} r={strokeWidth + 1.2} fill={color} />
      ) : null}
    </Svg>
  );
});
