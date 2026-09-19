import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';

import Barometer from '@meteocons/svg-static/flat/barometer.svg';
import ClearDay from '@meteocons/svg-static/flat/clear-day.svg';
import ClearNight from '@meteocons/svg-static/flat/clear-night.svg';
import CodeYellow from '@meteocons/svg-static/flat/code-yellow.svg';
import Compass from '@meteocons/svg-static/flat/compass.svg';
import Drizzle from '@meteocons/svg-static/flat/drizzle.svg';
import FogDay from '@meteocons/svg-static/flat/fog-day.svg';
import FogNight from '@meteocons/svg-static/flat/fog-night.svg';
import Hail from '@meteocons/svg-static/flat/hail.svg';
import LightningBolt from '@meteocons/svg-static/flat/lightning-bolt.svg';
import NotAvailable from '@meteocons/svg-static/flat/not-available.svg';
import OvercastDay from '@meteocons/svg-static/flat/overcast-day.svg';
import OvercastNight from '@meteocons/svg-static/flat/overcast-night.svg';
import PartlyCloudyDay from '@meteocons/svg-static/flat/partly-cloudy-day.svg';
import PartlyCloudyNight from '@meteocons/svg-static/flat/partly-cloudy-night.svg';
import Rain from '@meteocons/svg-static/flat/rain.svg';
import Raindrops from '@meteocons/svg-static/flat/raindrops.svg';
import Sleet from '@meteocons/svg-static/flat/sleet.svg';
import Snow from '@meteocons/svg-static/flat/snow.svg';
import StarryNight from '@meteocons/svg-static/flat/starry-night.svg';
import ThermometerCelsius from '@meteocons/svg-static/flat/thermometer-celsius.svg';
import ThunderstormsDayRain from '@meteocons/svg-static/flat/thunderstorms-day-rain.svg';
import ThunderstormsExtremeRain from '@meteocons/svg-static/flat/thunderstorms-extreme-rain.svg';
import ThunderstormsNightRain from '@meteocons/svg-static/flat/thunderstorms-night-rain.svg';
import Tornado from '@meteocons/svg-static/flat/tornado.svg';
import Windsock from '@meteocons/svg-static/flat/windsock.svg';

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
 */
const REGISTRY: Record<WeatherIconName, ComponentType<SvgProps>> = {
  'clear-day': ClearDay,
  'clear-night': ClearNight,
  'partly-cloudy-day': PartlyCloudyDay,
  'partly-cloudy-night': PartlyCloudyNight,
  'overcast-day': OvercastDay,
  'overcast-night': OvercastNight,
  'fog-day': FogDay,
  'fog-night': FogNight,
  drizzle: Drizzle,
  rain: Rain,
  snow: Snow,
  sleet: Sleet,
  hail: Hail,
  'thunderstorms-day-rain': ThunderstormsDayRain,
  'thunderstorms-night-rain': ThunderstormsNightRain,
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
  'starry-night': StarryNight,
};

export interface WeatherIconProps extends Omit<SvgProps, 'width' | 'height'> {
  name: WeatherIconName;
  size?: number;
}

export function WeatherIcon({ name, size = 48, ...rest }: WeatherIconProps) {
  const Icon = REGISTRY[name];
  return <Icon width={size} height={size} {...rest} />;
}

/** Exposed so a test can assert the registry covers every declared name. */
export const WEATHER_ICON_REGISTRY_KEYS = Object.keys(REGISTRY) as WeatherIconName[];
