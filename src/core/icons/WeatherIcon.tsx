import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';

import Barometer from '@meteocons/svg-static/fill/barometer.svg';
import ClearDay from '@meteocons/svg-static/fill/clear-day.svg';
import ClearNight from '@meteocons/svg-static/fill/clear-night.svg';
import CodeYellow from '@meteocons/svg-static/fill/code-yellow.svg';
import Compass from '@meteocons/svg-static/fill/compass.svg';
import Drizzle from '@meteocons/svg-static/fill/drizzle.svg';
import FogDay from '@meteocons/svg-static/fill/fog-day.svg';
import FogNight from '@meteocons/svg-static/fill/fog-night.svg';
import Hail from '@meteocons/svg-static/fill/hail.svg';
import LightningBolt from '@meteocons/svg-static/fill/lightning-bolt.svg';
import NotAvailable from '@meteocons/svg-static/fill/not-available.svg';
import OvercastDay from '@meteocons/svg-static/fill/overcast-day.svg';
import OvercastNight from '@meteocons/svg-static/fill/overcast-night.svg';
import PartlyCloudyDay from '@meteocons/svg-static/fill/partly-cloudy-day.svg';
import PartlyCloudyNight from '@meteocons/svg-static/fill/partly-cloudy-night.svg';
import Rain from '@meteocons/svg-static/fill/rain.svg';
import Raindrops from '@meteocons/svg-static/fill/raindrops.svg';
import Sleet from '@meteocons/svg-static/fill/sleet.svg';
import Snow from '@meteocons/svg-static/fill/snow.svg';
import StarryNight from '@meteocons/svg-static/fill/starry-night.svg';
import ThermometerCelsius from '@meteocons/svg-static/fill/thermometer-celsius.svg';
import ThunderstormsDayRain from '@meteocons/svg-static/fill/thunderstorms-day-rain.svg';
import ThunderstormsExtremeRain from '@meteocons/svg-static/fill/thunderstorms-extreme-rain.svg';
import ThunderstormsNightRain from '@meteocons/svg-static/fill/thunderstorms-night-rain.svg';
import Tornado from '@meteocons/svg-static/fill/tornado.svg';
import Windsock from '@meteocons/svg-static/fill/windsock.svg';

import type { WeatherIconName } from './names';

/**
 * Meteocons, flat style, rendered natively through react-native-svg.
 *
 * The animated `@meteocons/svg` package is deliberately not used: its motion is
 * SMIL embedded in the SVG, and react-native-svg does not implement SMIL, so
 * those files render as static icons at a larger payload. Motion on the hero
 * condition comes from Lottie instead.
 *
 * Fill rather than flat. Flat draws a cloud as two solid pale shapes -- white
 * and #E6EFFC -- with no outline, which is invisible on anything light: on
 * Skyward Day the frosted pane composites to about #E1EAF7 and a 150px
 * overcast icon simply was not there. Fill draws the same cloud shaded from
 * #94A3B8 to #F3F7FE and strokes it in the slate, so it carries its own edge
 * onto a white card, a cream stock and a blue sky alike.
 *
 * The flat set was originally chosen to stay crisp at 28px in the forecast
 * strip. Nothing in the app is drawn at 28px any more -- the strip is at 46 and
 * the smallest icon anywhere is the 30px bolt on a button -- so the gradient
 * has room to read rather than to muddy.
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
