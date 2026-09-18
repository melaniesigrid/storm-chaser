import type { WeatherCondition, WeatherConditionGroup } from './types';

/**
 * WMO 4677 weather interpretation codes as returned by Open-Meteo.
 * Grouped rather than listed one by one so that downstream logic (the chase
 * index, the map pin colour) can reason about families of conditions.
 */
const CODE_TABLE: Record<number, { group: WeatherConditionGroup; label: string; glyph: string }> = {
  0: { group: 'clear', label: 'Clear sky', glyph: '○' },
  1: { group: 'clear', label: 'Mainly clear', glyph: '◔' },
  2: { group: 'cloud', label: 'Partly cloudy', glyph: '◑' },
  3: { group: 'cloud', label: 'Overcast', glyph: '●' },
  45: { group: 'fog', label: 'Fog', glyph: '≡' },
  48: { group: 'fog', label: 'Rime fog', glyph: '≣' },
  51: { group: 'drizzle', label: 'Light drizzle', glyph: '⋮' },
  53: { group: 'drizzle', label: 'Drizzle', glyph: '⋮' },
  55: { group: 'drizzle', label: 'Dense drizzle', glyph: '⋮' },
  56: { group: 'drizzle', label: 'Freezing drizzle', glyph: '❄' },
  57: { group: 'drizzle', label: 'Dense freezing drizzle', glyph: '❄' },
  61: { group: 'rain', label: 'Light rain', glyph: '⋰' },
  63: { group: 'rain', label: 'Rain', glyph: '⋰' },
  65: { group: 'rain', label: 'Heavy rain', glyph: '⋰' },
  66: { group: 'rain', label: 'Freezing rain', glyph: '❄' },
  67: { group: 'rain', label: 'Heavy freezing rain', glyph: '❄' },
  71: { group: 'snow', label: 'Light snow', glyph: '❄' },
  73: { group: 'snow', label: 'Snow', glyph: '❄' },
  75: { group: 'snow', label: 'Heavy snow', glyph: '❄' },
  77: { group: 'snow', label: 'Snow grains', glyph: '❄' },
  80: { group: 'shower', label: 'Light showers', glyph: '⋱' },
  81: { group: 'shower', label: 'Showers', glyph: '⋱' },
  82: { group: 'shower', label: 'Violent showers', glyph: '⋱' },
  85: { group: 'shower', label: 'Snow showers', glyph: '❄' },
  86: { group: 'shower', label: 'Heavy snow showers', glyph: '❄' },
  95: { group: 'thunderstorm', label: 'Thunderstorm', glyph: '⚡' },
  96: { group: 'hail', label: 'Thunderstorm, slight hail', glyph: '⚡' },
  99: { group: 'hail', label: 'Thunderstorm, heavy hail', glyph: '⚡' },
};

export function describeWeatherCode(code: number | null | undefined): WeatherCondition {
  if (code === null || code === undefined) {
    return { code: -1, group: 'unknown', label: 'Unknown', glyph: '?' };
  }

  const entry = CODE_TABLE[code];
  if (!entry) {
    return { code, group: 'unknown', label: `Code ${code}`, glyph: '?' };
  }

  return { code, ...entry };
}

/** Condition families a chaser actually drives toward. */
export function isConvective(group: WeatherConditionGroup): boolean {
  return group === 'thunderstorm' || group === 'hail' || group === 'shower';
}
