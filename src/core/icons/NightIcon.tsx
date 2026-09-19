import { View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import ClearNight from './night/clear-night.svg';
import FogNight from './night/fog-night.svg';
import OvercastNight from './night/overcast-night.svg';
import PartlyCloudyNight from './night/partly-cloudy-night.svg';
import StarryNight from './night/starry-night.svg';
import ThunderstormsNightRain from './night/thunderstorms-night-rain.svg';

import { Moon } from '@/core/sky';

/**
 * A night weather icon with the moon that is actually up there.
 *
 * Meteocons draws the same waning crescent in every night glyph. The app knows
 * better -- `src/core/sky/moonPhase` computes the real elongation and `Moon`
 * draws the true terminator from it -- so shipping a fixed crescent meant the
 * forecast strip contradicted the sky on roughly twenty-six nights in every
 * twenty-nine, including every full moon.
 *
 * The crescent is gone from the artwork rather than hidden under something.
 * `scripts/build-night-icons.mjs` cuts it out into ./night/, because
 * an overlay cannot work: the unlit limb of a real moon is all but
 * transparent, so anything opaque enough to cover the old glyph also fills in
 * the dark side that is the entire point.
 *
 * The moon is drawn UNDERNEATH the artwork, not on top. In the cloudy glyphs
 * the Meteocons moon sits inside a mask that the cloud subtracts from, so it
 * passes behind the cloud; a moon composited over the top would float in front
 * of a cloud it is supposed to be behind. Stacking it below gets the same
 * occlusion for free and needs no mask of our own.
 */

/** The icons that had a moon in them, and where that moon was. */
export type NightIconName =
  | 'clear-night'
  | 'starry-night'
  | 'partly-cloudy-night'
  | 'overcast-night'
  | 'fog-night'
  | 'thunderstorms-night-rain';

interface MoonPlacement {
  Artwork: React.FC<SvgProps>;
  /** Centre and radius of the removed crescent, in the icons' 128 viewBox. */
  cx: number;
  cy: number;
  r: number;
}

/**
 * Measured from the crescent paths before they were cut, not eyeballed.
 *
 * All six share a 128 viewBox, and the three cloud glyphs share one moon
 * position because Meteocons composes them from the same parts -- which is why
 * these are a table rather than six magic numbers spread through a component.
 */
const PLACEMENT: Record<NightIconName, MoonPlacement> = {
  'clear-night': { Artwork: ClearNight, cx: 64, cy: 64, r: 32 },
  'starry-night': { Artwork: StarryNight, cx: 64, cy: 64, r: 21.5 },
  'partly-cloudy-night': { Artwork: PartlyCloudyNight, cx: 37, cy: 47, r: 13 },
  'overcast-night': { Artwork: OvercastNight, cx: 37, cy: 47, r: 13 },
  'fog-night': { Artwork: FogNight, cx: 64, cy: 62, r: 22 },
  'thunderstorms-night-rain': { Artwork: ThunderstormsNightRain, cx: 37, cy: 47, r: 13 },
};

const VIEW_BOX = 128;

export interface NightIconProps extends Omit<SvgProps, 'width' | 'height'> {
  name: NightIconName;
  size?: number;
  /** Injectable clock, so a screenshot or a test can pin a phase. */
  now?: Date;
}

export function NightIcon({ name, size = 48, now, ...rest }: NightIconProps) {
  const { Artwork, cx, cy, r } = PLACEMENT[name];

  const scale = size / VIEW_BOX;
  const diameter = r * 2 * scale;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: (cx - r) * scale,
          top: (cy - r) * scale,
        }}
        // The artwork above carries the icon's meaning and its label; a second
        // announcement of "moon, waxing gibbous" on every row of the forecast
        // strip is noise in a screen reader.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Moon size={diameter} now={now} />
      </View>

      <Artwork width={size} height={size} {...rest} />
    </View>
  );
}

export const NIGHT_ICON_NAMES = Object.keys(PLACEMENT) as NightIconName[];
