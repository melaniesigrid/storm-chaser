import { useQuery } from '@tanstack/react-query';

import { unwrap } from '@/core/utils/result';
import type { Coordinates } from '@/features/weather/model/types';
import { cloudSyncClient } from '@/services/cloud/CloudSyncClient';

import type { CommunityReport } from '../model/community';

export const communityKeys = {
  all: ['community'] as const,
  near: (lat: number, lon: number) => ['community', 'near', lat, lon] as const,
};

/**
 * Community reports near a position.
 *
 * Rounded to two decimals (roughly a kilometre) so small GPS drift does not
 * invalidate the cache on every fix, and held for an hour: other people's
 * reports are not time critical the way your own conditions are.
 */
export function useCommunityReports(coordinates: Coordinates | null) {
  const lat = coordinates ? round(coordinates.latitude) : 0;
  const lon = coordinates ? round(coordinates.longitude) : 0;

  return useQuery<CommunityReport[]>({
    queryKey: communityKeys.near(lat, lon),
    enabled: coordinates !== null,
    staleTime: 60 * 60 * 1000,
    queryFn: async () =>
      unwrap(await cloudSyncClient.fetchCommunityReports({ latitude: lat, longitude: lon })),
  });
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
