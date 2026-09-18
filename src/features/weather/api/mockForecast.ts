import type { OpenMeteoResponse } from './contracts';

/**
 * Bundled fixture used when the network is unavailable and nothing has been
 * cached yet, and as the fixture for the mapper tests. Modelled on a genuine
 * supercell environment (Oklahoma, late afternoon) so the UI can be exercised
 * at the interesting end of the scale.
 */
export function buildMockForecast(base = new Date()): OpenMeteoResponse {
  const hourly = Array.from({ length: 24 }, (_, index) => {
    const time = new Date(base.getTime() + index * 3600_000);
    time.setMinutes(0, 0, 0);
    return time.toISOString().slice(0, 16);
  });

  const currentTime = hourly[0] ?? new Date().toISOString().slice(0, 16);

  return {
    latitude: 35.4823,
    longitude: -97.5352,
    timezone: 'America/Chicago',
    current: {
      time: currentTime,
      temperature_2m: 29.4,
      apparent_temperature: 33.1,
      relative_humidity_2m: 68,
      precipitation: 3.2,
      weather_code: 96,
      cloud_cover: 92,
      pressure_msl: 1002.4,
      wind_speed_10m: 41.2,
      wind_direction_10m: 195,
      wind_gusts_10m: 78.5,
      is_day: 1,
    },
    hourly: {
      time: hourly,
      temperature_2m: hourly.map((_, i) => 29.4 - i * 0.4),
      precipitation_probability: hourly.map((_, i) => Math.max(5, 85 - i * 4)),
      precipitation: hourly.map((_, i) => Math.max(0, 3.2 - i * 0.25)),
      weather_code: hourly.map((_, i) => (i < 4 ? 96 : i < 8 ? 80 : 3)),
      wind_gusts_10m: hourly.map((_, i) => Math.max(12, 78.5 - i * 3.5)),
      cape: hourly.map((_, i) => Math.max(120, 2840 - i * 180)),
      lifted_index: hourly.map((_, i) => Math.min(4, -7.2 + i * 0.6)),
    },
    daily: {
      time: Array.from({ length: 7 }, (_, index) => {
        const day = new Date(base.getTime() + index * 86_400_000);
        return day.toISOString().slice(0, 10);
      }),
      weather_code: [96, 95, 80, 3, 2, 1, 61],
      temperature_2m_max: [31.2, 30.1, 27.8, 26.4, 28.0, 29.3, 25.7],
      temperature_2m_min: [21.4, 20.8, 18.2, 17.1, 18.5, 19.2, 16.8],
      precipitation_sum: [24.6, 18.2, 6.4, 0, 0, 0, 9.1],
      precipitation_probability_max: [90, 80, 55, 10, 5, 5, 60],
      wind_gusts_10m_max: [92.3, 74.1, 52.6, 28.4, 22.1, 25.7, 44.8],
    },
  };
}
