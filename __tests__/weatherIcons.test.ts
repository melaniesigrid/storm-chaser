import { WEATHER_ICON_NAMES, isWeatherIconName } from '@/core/icons/names';
import {
  iconForChaseLevel,
  iconForCondition,
  iconForGroup,
} from '@/features/weather/model/weatherIcons';
import { describeWeatherCode } from '@/features/weather/model/weatherCodes';
import type { ChaseLevel, WeatherConditionGroup } from '@/features/weather/model/types';

const GROUPS: WeatherConditionGroup[] = [
  'clear',
  'cloud',
  'fog',
  'drizzle',
  'rain',
  'snow',
  'shower',
  'thunderstorm',
  'hail',
  'unknown',
];

const LEVELS: ChaseLevel[] = ['dormant', 'unsettled', 'active', 'severe', 'extreme'];

/** Every WMO code the app's own table knows about. */
const KNOWN_CODES = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86,
  95, 96, 99,
];

describe('icon names', () => {
  it('has no duplicates', () => {
    expect(new Set(WEATHER_ICON_NAMES).size).toBe(WEATHER_ICON_NAMES.length);
  });

  it('guards unknown names', () => {
    expect(isWeatherIconName('rain')).toBe(true);
    expect(isWeatherIconName('sunshine-and-rainbows')).toBe(false);
  });
});

describe('iconForGroup', () => {
  it('returns a bundled icon for every condition group, day and night', () => {
    for (const group of GROUPS) {
      expect(WEATHER_ICON_NAMES).toContain(iconForGroup(group, false));
      expect(WEATHER_ICON_NAMES).toContain(iconForGroup(group, true));
    }
  });

  it('never shows a sun at night', () => {
    for (const group of GROUPS) {
      expect(iconForGroup(group, true)).not.toMatch(/-day$/);
    }
  });

  it('never shows a moon during the day', () => {
    for (const group of GROUPS) {
      expect(iconForGroup(group, false)).not.toMatch(/-night$/);
    }
  });

  it('separates a clear sky from mainly clear', () => {
    expect(iconForGroup('clear', false, 0)).toBe('clear-day');
    expect(iconForGroup('clear', false, 1)).toBe('partly-cloudy-day');
  });

  it('treats overcast as its own thing, not as partly cloudy', () => {
    expect(iconForGroup('cloud', false, 3)).toBe('overcast-day');
    expect(iconForGroup('cloud', false, 2)).toBe('partly-cloudy-day');
  });

  it('shows snow, not rain, for snow showers', () => {
    expect(iconForGroup('shower', false, 85)).toBe('snow');
    expect(iconForGroup('shower', false, 86)).toBe('snow');
    expect(iconForGroup('shower', false, 80)).toBe('rain');
  });

  it('gives the heavy hail thunderstorm its own icon', () => {
    expect(iconForGroup('hail', false, 99)).toBe('thunderstorms-extreme-rain');
    expect(iconForGroup('hail', false, 96)).toBe('hail');
  });

  it('falls back rather than throwing on an unknown group', () => {
    expect(iconForGroup('unknown')).toBe('not-available');
  });
});

describe('iconForCondition', () => {
  it('resolves a bundled icon for every code in the WMO table', () => {
    for (const code of KNOWN_CODES) {
      const condition = describeWeatherCode(code);
      expect(WEATHER_ICON_NAMES).toContain(iconForCondition(condition, false));
      expect(WEATHER_ICON_NAMES).toContain(iconForCondition(condition, true));
    }
  });

  it('handles the null and unrecognised cases the API can return', () => {
    expect(iconForCondition(describeWeatherCode(null))).toBe('not-available');
    expect(iconForCondition(describeWeatherCode(undefined))).toBe('not-available');
    expect(iconForCondition(describeWeatherCode(1234))).toBe('not-available');
  });
});

describe('iconForChaseLevel', () => {
  it('covers every tier with a bundled icon', () => {
    for (const level of LEVELS) {
      expect(WEATHER_ICON_NAMES).toContain(iconForChaseLevel(level));
    }
  });

  it('escalates visually from calm to tornado', () => {
    expect(iconForChaseLevel('dormant')).toBe('clear-day');
    expect(iconForChaseLevel('extreme')).toBe('tornado');
  });
});
