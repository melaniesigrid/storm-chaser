import { useQuery } from '@tanstack/react-query';

import { unwrap } from '@/core/utils/result';
import type { Coordinates } from '@/features/weather/model/types';

import { openMeteoAirClient } from '../api/airQualityClient';
import type { AirSnapshot } from '../model/types';

export const airKeys = {
  all: ['air'] as const,
  snapshot: (coordinates: Coordinates | null) =>
    [
      'air',
      'snapshot',
      coordinates ? coordinates.latitude.toFixed(2) : 'unknown',
      coordinates ? coordinates.longitude.toFixed(2) : 'unknown',
    ] as const,
};

/**
 * Half an hour, against the forecast's five minutes.
 *
 * Air quality and pollen are modelled hourly at best and move far slower than
 * a gust front. Refetching them on the conditions screen's cadence would be
 * three hundred requests a day for a number that changes twenty-four times,
 * and it is a second network call on a screen that already makes one.
 */
const THIRTY_MINUTES = 30 * 60 * 1000;

export function useAirSnapshot(coordinates: Coordinates | null) {
  return useQuery<AirSnapshot>({
    queryKey: airKeys.snapshot(coordinates),
    enabled: coordinates !== null,
    staleTime: THIRTY_MINUTES,
    gcTime: 24 * 60 * 60 * 1000,
    // One retry, not the app default of two. This panel is enrichment: the
    // screen is complete without it, so it should give up faster than the
    // forecast does rather than hold a retry budget the main reading needs.
    retry: 1,
    queryFn: async () => {
      if (!coordinates) {
        throw new Error('Coordinates are required to fetch air quality');
      }
      return unwrap(await openMeteoAirClient.fetchSnapshot(coordinates));
    },
  });
}
