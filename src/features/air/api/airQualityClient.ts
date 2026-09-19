import { err, ok, type Result } from '@/core/utils/result';
import type { Coordinates } from '@/features/weather/model/types';

import { toAirSnapshot, type OpenMeteoAirResponse } from '../model/mappers';
import type { AirSnapshot } from '../model/types';

/**
 * Open-Meteo's air-quality endpoint. A different host from the forecast one,
 * and no API key on either, which is what keeps the app's "no keys required"
 * claim true with this feature added.
 */
const BASE_URL =
  process.env.EXPO_PUBLIC_AIR_BASE_URL ??
  'https://air-quality-api.open-meteo.com/v1/air-quality';

const REQUEST_TIMEOUT_MS = 12_000;

const CURRENT_FIELDS = [
  'european_aqi',
  'pm2_5',
  'pm10',
  'uv_index',
  'alder_pollen',
  'birch_pollen',
  'grass_pollen',
  'mugwort_pollen',
  'olive_pollen',
  'ragweed_pollen',
].join(',');

export interface AirQualityClient {
  fetchSnapshot(coordinates: Coordinates): Promise<Result<AirSnapshot>>;
}

export function buildAirQualityUrl(coordinates: Coordinates): string {
  const params = new URLSearchParams({
    latitude: coordinates.latitude.toFixed(4),
    longitude: coordinates.longitude.toFixed(4),
    current: CURRENT_FIELDS,
    timezone: 'auto',
  });

  return `${BASE_URL}?${params.toString()}`;
}

/**
 * Returns a Result rather than throwing, so the query layer can tell "no
 * coverage for these coordinates" from "the request failed" -- the same
 * distinction `openMeteoClient` draws, and for the same reason: one of those
 * is worth a retry button and the other is not.
 */
export const openMeteoAirClient: AirQualityClient = {
  async fetchSnapshot(coordinates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(buildAirQualityUrl(coordinates), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return err(
          response.status === 404 ? 'not_found' : 'network',
          `Air quality service responded with ${response.status}`,
        );
      }

      const payload = (await response.json()) as OpenMeteoAirResponse;

      if (payload.error || !payload.current) {
        return err(
          'not_found',
          payload.reason ?? 'No air quality data available for this location',
        );
      }

      return ok(toAirSnapshot(payload));
    } catch (cause) {
      const aborted = cause instanceof Error && cause.name === 'AbortError';
      return err(
        'network',
        aborted
          ? 'The air quality service took too long to answer'
          : 'Could not reach the air quality service',
        cause,
      );
    } finally {
      clearTimeout(timeout);
    }
  },
};
