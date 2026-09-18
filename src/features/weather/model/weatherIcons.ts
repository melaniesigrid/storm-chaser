import type { WeatherIconName } from '@/core/icons/names';

import type { ChaseLevel, WeatherCondition, WeatherConditionGroup } from './types';

/**
 * Maps a WMO condition group onto a Meteocons icon.
 *
 * Pure and dependency free (it imports a string union, never an SVG) so it runs
 * in the test suite without a bundler. Day and night variants matter here: a
 * sun behind a cloud at 2am is the kind of detail that makes an app feel like
 * nobody used it.
 */
export function iconForCondition(condition: WeatherCondition, isNight = false): WeatherIconName {
  return iconForGroup(condition.group, isNight, condition.code);
}

export function iconForGroup(
  group: WeatherConditionGroup,
  isNight = false,
  code?: number,
): WeatherIconName {
  switch (group) {
    case 'clear':
      // Code 0 is a genuinely clear sky; 1 is "mainly clear", which reads
      // better as a few clouds than as a bare sun.
      if (code === 1) return isNight ? 'partly-cloudy-night' : 'partly-cloudy-day';
      return isNight ? 'clear-night' : 'clear-day';
    case 'cloud':
      if (code === 3) return isNight ? 'overcast-night' : 'overcast-day';
      return isNight ? 'partly-cloudy-night' : 'partly-cloudy-day';
    case 'fog':
      return isNight ? 'fog-night' : 'fog-day';
    case 'drizzle':
      return 'drizzle';
    case 'rain':
      return 'rain';
    case 'snow':
      return 'snow';
    case 'shower':
      // Snow showers (85, 86) are snow; everything else in this family is rain.
      return code === 85 || code === 86 ? 'snow' : 'rain';
    case 'thunderstorm':
      return isNight ? 'thunderstorms-night-rain' : 'thunderstorms-day-rain';
    case 'hail':
      // 99 is a thunderstorm with heavy hail: the most dangerous code
      // Open-Meteo reports, and worth its own icon.
      return code === 99 ? 'thunderstorms-extreme-rain' : 'hail';
    case 'unknown':
      return 'not-available';
  }
}

/**
 * The icon that represents a chase tier on its own, used for empty states and
 * the theme picker where there is no live observation to draw from.
 */
export function iconForChaseLevel(level: ChaseLevel): WeatherIconName {
  switch (level) {
    case 'dormant':
      return 'clear-day';
    case 'unsettled':
      return 'partly-cloudy-day';
    case 'active':
      return 'rain';
    case 'severe':
      return 'thunderstorms-day-rain';
    case 'extreme':
      return 'tornado';
  }
}
