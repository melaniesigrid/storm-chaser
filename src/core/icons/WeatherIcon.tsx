import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';

import Barometer from '@meteocons/svg-static/flat/barometer.svg';
import ClearDay from '@meteocons/svg-static/flat/clear-day.svg';
import CodeYellow from '@meteocons/svg-static/flat/code-yellow.svg';
import Compass from '@meteocons/svg-static/flat/compass.svg';
import Drizzle from '@meteocons/svg-static/flat/drizzle.svg';
import FogDay from '@meteocons/svg-static/flat/fog-day.svg';
import Hail from '@meteocons/svg-static/flat/hail.svg';
import LightningBolt from '@meteocons/svg-static/flat/lightning-bolt.svg';
import NotAvailable from '@meteocons/svg-static/flat/not-available.svg';
import OvercastDay from '@meteocons/svg-static/flat/overcast-day.svg';
import PartlyCloudyDay from '@meteocons/svg-static/flat/partly-cloudy-day.svg';
import Rain from '@meteocons/svg-static/flat/rain.svg';
import Raindrops from '@meteocons/svg-static/flat/raindrops.svg';
import Sleet from '@meteocons/svg-static/flat/sleet.svg';
import Snow from '@meteocons/svg-static/flat/snow.svg';
import ThermometerCelsius from '@meteocons/svg-static/flat/thermometer-celsius.svg';
import ThunderstormsDayRain from '@meteocons/svg-static/flat/thunderstorms-day-rain.svg';
import ThunderstormsExtremeRain from '@meteocons/svg-static/flat/thunderstorms-extreme-rain.svg';
import Tornado from '@meteocons/svg-static/flat/tornado.svg';
import Windsock from '@meteocons/svg-static/flat/windsock.svg';

import { NightIcon, type NightIconName } from './NightIcon';
import type { WeatherIconName } from './names';

/**
 * Meteocons, flat style, rendered natively through react-native-svg.
 *
 * The animated `@meteocons/svg` package is deliberately not used: its motion is
 * SMIL embedded in the SVG, and react-native-svg does not implement SMIL, so
 * those files render as static icons at a larger payload. Motion on the hero
 * condition comes from Lottie instead.
 *
 * Flat rather than fill because flat carries no gradients, which keeps these
 * crisp at 28px in the forecast strip where a gradient would turn to mud.
 *
 * The fill set was tried as an answer to pale clouds disappearing into pale
 * cards and rejected: it lifts a cloud, which is drawn in white and #E6EFFC,
 * by shading it to #94A3B8 and giving it an outline -- but it does the reverse
 * to the instruments. Flat draws a barometer face in solid near-black; fill
 * draws the same face in white with a thin rule around it, and the dial that
 * was the strongest mark in the grid became the weakest. The clouds were fixed
 * by taking the pale card out from behind them instead, which is a surface
 * decision rather than an icon one -- see `conditionsSurface`.
 */
const REGISTRY: Record<DayIconName, ComponentType<SvgProps>> = {
  'clear-day': ClearDay,
  'partly-cloudy-day': PartlyCloudyDay,
  'overcast-day': OvercastDay,
  'fog-day': FogDay,
  drizzle: Drizzle,
  rain: Rain,
  snow: Snow,
  sleet: Sleet,
  hail: Hail,
  'thunderstorms-day-rain': ThunderstormsDayRain,
  'thunderstorms-extreme-rain': ThunderstormsExtremeRain,
  'not-available': NotAvailable,
  tornado: Tornado,
  compass: Compass,
  barometer: Barometer,
  'thermometer-celsius': ThermometerCelsius,
  windsock: Windsock,
  raindrops: Raindrops,
  'code-yellow': CodeYellow,
  'lightning-bolt': LightningBolt,
};

/** Everything that is not one of the six glyphs that contained a moon. */
type DayIconName = Exclude<WeatherIconName, NightIconName>;

const NIGHT_NAMES = new Set<string>([
  'clear-night',
  'starry-night',
  'partly-cloudy-night',
  'overcast-night',
  'fog-night',
  'thunderstorms-night-rain',
]);

function isNightName(name: WeatherIconName): name is NightIconName {
  return NIGHT_NAMES.has(name);
}

export interface WeatherIconProps extends Omit<SvgProps, 'width' | 'height'> {
  name: WeatherIconName;
  size?: number;
  /** Injectable clock, so a screenshot or a test can pin a moon phase. */
  now?: Date;
}

/**
 * The single door every weather icon goes through.
 *
 * Night names are routed to `NightIcon`, which draws the real lunar phase
 * instead of the crescent Meteocons hardcodes. Doing it HERE rather than at
 * each call site is the point: the hero, the forecast strip and the theme
 * picker all ask for an icon by name and none of them has to know that some
 * names carry a moon, so none of them can be the one that forgets.
 */
export function WeatherIcon({ name, size = 48, now, ...rest }: WeatherIconProps) {
  if (isNightName(name)) {
    return <NightIcon name={name} size={size} now={now} {...rest} />;
  }

  const Icon = REGISTRY[name];
  return <Icon width={size} height={size} {...rest} />;
}

/** Exposed so a test can assert every declared name still resolves. */
export const WEATHER_ICON_REGISTRY_KEYS = [
  ...Object.keys(REGISTRY),
  ...NIGHT_NAMES,
] as WeatherIconName[];
