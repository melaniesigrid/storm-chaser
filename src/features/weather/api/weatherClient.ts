import { err, ok, type Result } from '@/core/utils/result';

import {
  CURRENT_FIELDS,
  DAILY_FIELDS,
  HOURLY_FIELDS,
  type OpenMeteoResponse,
} from './contracts';
import { buildMockForecast } from './mockForecast';
import { toWeatherSnapshot } from '../model/mappers';
import type { Coordinates, WeatherSnapshot } from '../model/types';

const BASE_URL =
  process.env.EXPO_PUBLIC_WEATHER_BASE_URL ?? 'https://api.open-meteo.com/v1/forecast';

const REQUEST_TIMEOUT_MS = 12_000;

export interface WeatherClient {
  fetchSnapshot(coordinates: Coordinates): Promise<Result<WeatherSnapshot>>;
}

export function buildForecastUrl(coordinates: Coordinates): string {
  const params = new URLSearchParams({
    latitude: coordinates.latitude.toFixed(4),
    longitude: coordinates.longitude.toFixed(4),
    current: CURRENT_FIELDS,
    hourly: HOURLY_FIELDS,
    daily: DAILY_FIELDS,
    wind_speed_unit: 'kmh',
    timezone: 'auto',
    forecast_days: '7',
  });

  return `${BASE_URL}?${params.toString()}`;
}

/**
 * Open-Meteo client. Returns a Result rather than throwing so the query layer
 * can distinguish "no data for these coordinates" (a Not found view) from a
 * transport failure (a retryable error view).
 */
export const openMeteoClient: WeatherClient = {
  async fetchSnapshot(coordinates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(buildForecastUrl(coordinates), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return err(
          response.status === 404 ? 'not_found' : 'network',
          `Weather service responded with ${response.status}`,
        );
      }

      const payload = (await response.json()) as OpenMeteoResponse;

      if (payload.error || !payload.current) {
        return err(
          'not_found',
          payload.reason ?? 'No weather data available for this location',
        );
      }

      return ok(toWeatherSnapshot(payload));
    } catch (cause) {
      const aborted = cause instanceof Error && cause.name === 'AbortError';
      return err(
        'network',
        aborted
          ? 'The weather service took too long to respond'
          : 'Could not reach the weather service',
        cause,
      );
    } finally {
      clearTimeout(timeout);
    }
  },
};

/**
 * Last resort source. The brief allows mock data when live data is limited, so
 * an offline chaser with a cold cache still gets a usable screen, clearly
 * flagged as sample data in the UI.
 */
export function mockSnapshot(coordinates?: Coordinates): WeatherSnapshot {
  const raw = buildMockForecast();
  const withCoordinates: OpenMeteoResponse = coordinates
    ? { ...raw, latitude: coordinates.latitude, longitude: coordinates.longitude }
    : raw;
  return toWeatherSnapshot(withCoordinates, { isMock: true });
}
