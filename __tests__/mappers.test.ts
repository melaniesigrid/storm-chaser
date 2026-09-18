import { buildMockForecast } from '@/features/weather/api/mockForecast';
import type { OpenMeteoResponse } from '@/features/weather/api/contracts';
import {
  findCurrentHourIndex,
  toWeatherSnapshot,
} from '@/features/weather/model/mappers';

describe('toWeatherSnapshot', () => {
  it('maps a full Open-Meteo payload onto the domain model', () => {
    const snapshot = toWeatherSnapshot(buildMockForecast(new Date('2026-05-01T18:00:00Z')));

    expect(snapshot.current.temperatureC).toBe(29.4);
    expect(snapshot.current.windGustKmh).toBe(78.5);
    expect(snapshot.current.condition.group).toBe('hail');
    expect(snapshot.current.convective.capeJkg).toBe(2840);
    expect(snapshot.current.chase.level).toBe('extreme');
    expect(snapshot.hourly).toHaveLength(12);
    expect(snapshot.daily).toHaveLength(7);
    expect(snapshot.isMock).toBe(false);
  });

  it('survives a payload with no hourly or daily series', () => {
    const raw: OpenMeteoResponse = {
      latitude: 43.65,
      longitude: -79.38,
      timezone: 'America/Toronto',
      current: {
        time: '2026-05-01T18:00',
        temperature_2m: 14.2,
        apparent_temperature: null,
        relative_humidity_2m: null,
        precipitation: null,
        weather_code: 3,
        cloud_cover: null,
        pressure_msl: null,
        wind_speed_10m: null,
        wind_direction_10m: null,
        wind_gusts_10m: null,
        is_day: 1,
      },
    };

    const snapshot = toWeatherSnapshot(raw);

    expect(snapshot.hourly).toEqual([]);
    expect(snapshot.daily).toEqual([]);
    // Apparent temperature falls back to the dry bulb reading.
    expect(snapshot.current.apparentTemperatureC).toBe(14.2);
    expect(snapshot.current.convective.capeJkg).toBeNull();
    expect(snapshot.current.chase.score).toBe(3);
  });

  it('throws when the payload carries no current block', () => {
    expect(() =>
      toWeatherSnapshot({ latitude: 0, longitude: 0, timezone: 'UTC' }),
    ).toThrow(/no current conditions/i);
  });

  it('flags mock snapshots so the UI can label them', () => {
    const snapshot = toWeatherSnapshot(buildMockForecast(), { isMock: true });
    expect(snapshot.isMock).toBe(true);
  });
});

describe('findCurrentHourIndex', () => {
  const times = ['2026-05-01T16:00', '2026-05-01T17:00', '2026-05-01T18:00'];

  it('finds an exact timestamp match', () => {
    expect(findCurrentHourIndex(times, '2026-05-01T17:00')).toBe(1);
  });

  it('falls back to the nearest hour when the stamp is not aligned', () => {
    expect(findCurrentHourIndex(times, '2026-05-01T17:41')).toBe(2);
  });

  it('returns -1 for an empty series', () => {
    expect(findCurrentHourIndex([], '2026-05-01T17:00')).toBe(-1);
  });
});
