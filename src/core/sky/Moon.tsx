import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { moonGeometry, moonPhase, type MoonPhase } from './moonPhase';

/**
 * The moon, at the phase it is actually at.
 *
 * Not a picture of a crescent. The terminator is computed from the real
 * elongation between the sun and the moon, so on a gibbous night this draws a
 * gibbous moon, and on the night after new it draws a sliver you can barely
 * see -- which is the correct and slightly disappointing answer.
 *
 * How the shape is built: a moon is a circle with one curve across it. The
 * lit edge is always an exact half-circle, the limb. The other edge, the
 * terminator, is that half-circle seen at an angle, so it projects to an
 * ellipse whose horizontal radius is |cos| of the phase angle -- full width at
 * new and full, and zero at the quarters, where it is a straight line. Two
 * arcs, one path, no masking and no image.
 */

/** Which way each arc bows, in SVG's y-down coordinate system. */
function litPath(radius: number, litOnRight: boolean, terminator: number): string {
  const rx = Math.abs(terminator) * radius;

  // Top to bottom along the lit limb: clockwise if the lit side is the right.
  const limbSweep = litOnRight ? 1 : 0;

  // Bottom back to top along the terminator. A positive terminator bows
  // toward the lit limb, which narrows the lit area into a crescent; a
  // negative one bows away, filling the disc out to a gibbous.
  const bowsTowardLitSide = terminator > 0;
  const terminatorSweep = litOnRight
    ? bowsTowardLitSide
      ? 0
      : 1
    : bowsTowardLitSide
      ? 1
      : 0;

  return [
    `M 0 ${-radius}`,
    `A ${radius} ${radius} 0 0 ${limbSweep} 0 ${radius}`,
    `A ${rx} ${radius} 0 0 ${terminatorSweep} 0 ${-radius}`,
    'Z',
  ].join(' ');
}

export interface MoonProps {
  size?: number;
  /** Injectable so a screenshot or a test can pin a phase. */
  phase?: MoonPhase;
  /** Injectable clock, for the same reason. */
  now?: Date;
}

export function Moon({ size = 56, phase, now }: MoonProps) {
  const resolved = phase ?? moonPhase(now);
  const geometry = moonGeometry(resolved);
  const radius = size / 2;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`${-radius} ${-radius} ${size} ${size}`}
      // The phase is the information; the shape is just how it is delivered.
      accessibilityRole="image"
      accessibilityLabel={`Moon, ${resolved.name}, ${Math.round(resolved.illuminated * 100)} per cent lit`}
    >
      <Defs>
        <RadialGradient id="moonLit" cx="38%" cy="32%" r="78%">
          <Stop offset="0" stopColor="#FFFDF4" stopOpacity="1" />
          <Stop offset="1" stopColor="#E6DFC8" stopOpacity="1" />
        </RadialGradient>
      </Defs>

      {/*
        Earthshine: the unlit disc, faintly visible because the earth is
        lighting it. Real, and the reason a thin crescent still reads as a
        sphere rather than as a stray arc floating in the sky. Drawn under the
        lit part so it only shows where the lit part is not.
      */}
      <Circle cx={0} cy={0} r={radius * 0.97} fill="#FFFFFF" opacity={0.07} />

      <Path d={litPath(radius, geometry.litOnRight, geometry.terminator)} fill="url(#moonLit)" />
    </Svg>
  );
}
