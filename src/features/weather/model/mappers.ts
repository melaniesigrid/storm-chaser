import { computeChaseIndex } from './severity';
import type {
  Coordinates,
  DailyPoint,
  HourlyPoint,
  WeatherSnapshot,
} from './types';
import { describeWeatherCode } from './weatherCodes';
import type { OpenMeteoResponse } from '../api/contracts';

/**
 * Translates the Open-Meteo payload into the app's domain model.
 *
 * Nothing above this boundary knows the wire format exists, which is what makes
 * it cheap to swap in weather.gov or a cached fixture later. The mapper is
 * deliberately forgiving: any missing variable degrades to a sensible default
 * rather than failing the whole snapshot, because a chaser standing in a field
 * would rather see partial data than an error screen.
 */
export function toWeatherSnapshot(
  raw: OpenMeteoResponse,
  options: { fetchedAt?: string; isMock?: boolean } = {},
): WeatherSnapshot {
  const current = raw.current;
  if (!current) {
    throw new Error('Open-Meteo response contained no current conditions');
  }

  const coordinates: Coordinates = {
    latitude: raw.latitude,
    longitude: raw.longitude,
  };

  const hourIndex = findCurrentHourIndex(raw.hourly?.time ?? [], current.time);
  const convective = {
    capeJkg: pick(raw.hourly?.cape, hourIndex),
    liftedIndex: pick(raw.hourly?.lifted_index, hourIndex),
  };

  const condition = describeWeatherCode(current.weather_code);
  const windGustKmh = numberOr(current.wind_gusts_10m, 0);
  const precipitationMm = numberOr(current.precipitation, 0);

  return {
    current: {
      observedAt: current.time,
      coordinates,
      timezone: raw.timezone,
      temperatureC: numberOr(current.temperature_2m, 0),
      apparentTemperatureC: numberOr(
        current.apparent_temperature,
        numberOr(current.temperature_2m, 0),
      ),
      humidityPct: numberOr(current.relative_humidity_2m, 0),
      precipitationMm,
      cloudCoverPct: numberOr(current.cloud_cover, 0),
      pressureHpa: numberOr(current.pressure_msl, 0),
      windSpeedKmh: numberOr(current.wind_speed_10m, 0),
      windGustKmh,
      windDirectionDeg: numberOr(current.wind_direction_10m, 0),
      isDay: current.is_day !== 0,
      condition,
      convective,
      chase: computeChaseIndex({
        condition,
        windGustKmh,
        precipitationMm,
        convective,
      }),
    },
    hourly: toHourlyPoints(raw, hourIndex),
    daily: toDailyPoints(raw),
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    isMock: options.isMock ?? false,
  };
}

const HOURLY_WINDOW = 12;

function toHourlyPoints(raw: OpenMeteoResponse, startIndex: number): HourlyPoint[] {
  const hourly = raw.hourly;
  if (!hourly?.time?.length) return [];

  const from = Math.max(0, startIndex);
  const to = Math.min(hourly.time.length, from + HOURLY_WINDOW);
  const points: HourlyPoint[] = [];

  for (let index = from; index < to; index += 1) {
    const time = hourly.time[index];
    if (!time) continue;

    points.push({
      time,
      temperatureC: numberOr(pick(hourly.temperature_2m, index), 0),
      precipitationProbabilityPct: numberOr(
        pick(hourly.precipitation_probability, index),
        0,
      ),
      precipitationMm: numberOr(pick(hourly.precipitation, index), 0),
      windGustKmh: numberOr(pick(hourly.wind_gusts_10m, index), 0),
      capeJkg: pick(hourly.cape, index),
      condition: describeWeatherCode(pick(hourly.weather_code, index)),
    });
  }

  return points;
}

function toDailyPoints(raw: OpenMeteoResponse): DailyPoint[] {
  const daily = raw.daily;
  if (!daily?.time?.length) return [];

  return daily.time.reduce<DailyPoint[]>((points, date, index) => {
    if (!date) return points;
    points.push({
      date,
      minTempC: numberOr(pick(daily.temperature_2m_min, index), 0),
      maxTempC: numberOr(pick(daily.temperature_2m_max, index), 0),
      precipitationSumMm: numberOr(pick(daily.precipitation_sum, index), 0),
      precipitationProbabilityPct: numberOr(
        pick(daily.precipitation_probability_max, index),
        0,
      ),
      maxWindGustKmh: numberOr(pick(daily.wind_gusts_10m_max, index), 0),
      condition: describeWeatherCode(pick(daily.weather_code, index)),
    });
    return points;
  }, []);
}

/**
 * Open-Meteo returns the hourly series for the whole forecast window starting at
 * midnight local time, so the "now" row has to be located by timestamp rather
 * than assumed to be index zero.
 */
export function findCurrentHourIndex(times: string[], currentTime: string): number {
  if (!times.length) return -1;

  const exact = times.indexOf(currentTime);
  if (exact !== -1) return exact;

  const target = new Date(currentTime).getTime();
  if (Number.isNaN(target)) return 0;

  let bestIndex = 0;
  let bestDelta = Number.POSITIVE_INFINITY;

  times.forEach((time, index) => {
    const delta = Math.abs(new Date(time).getTime() - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function pick(series: (number | null)[] | undefined, index: number): number | null {
  if (!series || index < 0) return null;
  const value = series[index];
  return value === undefined || value === null || Number.isNaN(value) ? null : value;
}

function numberOr(value: number | null | undefined, fallback: number): number {
  return value === null || value === undefined || Number.isNaN(value)
    ? fallback
    : value;
}
