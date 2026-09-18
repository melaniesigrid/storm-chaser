import { useQuery } from '@tanstack/react-query';

import { unwrap } from '@/core/utils/result';

import { openMeteoClient } from '../api/weatherClient';
import type { Coordinates, WeatherSnapshot } from '../model/types';

export const weatherKeys = {
  all: ['weather'] as const,
  snapshot: (coordinates: Coordinates | null) =>
    [
      'weather',
      'snapshot',
      coordinates ? coordinates.latitude.toFixed(2) : 'unknown',
      coordinates ? coordinates.longitude.toFixed(2) : 'unknown',
    ] as const,
};

const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Conditions move fast, so data is considered stale after five minutes, but the
 * persisted cache is kept for a day: a chaser who loses signal still sees the
 * last good reading with an explicit "stale" marker rather than an empty screen.
 */
export function useWeatherSnapshot(coordinates: Coordinates | null) {
  return useQuery<WeatherSnapshot>({
    queryKey: weatherKeys.snapshot(coordinates),
    enabled: coordinates !== null,
    staleTime: FIVE_MINUTES,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
    queryFn: async () => {
      if (!coordinates) {
        throw new Error('Coordinates are required to fetch weather');
      }
      return unwrap(await openMeteoClient.fetchSnapshot(coordinates));
    },
  });
}
