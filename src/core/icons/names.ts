/**
 * The Meteocons subset this app ships.
 *
 * Meteocons has 475 icons per style; Metro needs every import to be static, so
 * bundling all of them would cost far more than it buys. This is the curated
 * set the UI can actually reach, and it is a plain string union with no imports
 * so the mapping logic stays unit testable without a bundler.
 *
 * Keep in sync with the component registry in `WeatherIcon.tsx`: the test
 * `icons.test.ts` asserts the two agree.
 */
export const WEATHER_ICON_NAMES = [
  'clear-day',
  'clear-night',
  'partly-cloudy-day',
  'partly-cloudy-night',
  'overcast-day',
  'overcast-night',
  'fog-day',
  'fog-night',
  'drizzle',
  'rain',
  'snow',
  'sleet',
  'hail',
  'thunderstorms-day-rain',
  'thunderstorms-night-rain',
  'thunderstorms-extreme-rain',
  'not-available',
  'tornado',
  'compass',
  'barometer',
  'thermometer-celsius',
  'windsock',
  'raindrops',
  'code-yellow',
  'lightning-bolt',
  'starry-night',
] as const;

export type WeatherIconName = (typeof WEATHER_ICON_NAMES)[number];

export function isWeatherIconName(value: string): value is WeatherIconName {
  return (WEATHER_ICON_NAMES as readonly string[]).includes(value);
}
