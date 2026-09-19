import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coordinates } from '@/features/weather/model/types';

/**
 * Where the fix actually is, in words.
 *
 * Coordinates are what the app runs on and what a report is stamped with, but
 * they are not what a person calls the place they are standing in. The header
 * says "Toronto, Canada" and keeps the decimals underneath it as the readout
 * they always were.
 *
 * Reverse geocoding is the one thing here that is allowed to fail quietly: it
 * needs a network round trip on Android and it is decoration over a number the
 * screen already has. A failure returns null and the header simply shows the
 * coordinates on their own.
 */

/**
 * The best name for a place, out of whatever the platform chose to fill in.
 *
 * Neither field is guaranteed. A fix in open country comes back with no city
 * and sometimes no district either, so the locality falls through city →
 * subregion → district → region before giving up, and either half may be
 * missing without losing the other.
 */
export function formatPlace(address: Location.LocationGeocodedAddress): string | null {
  const locality = address.city ?? address.subregion ?? address.district ?? address.region ?? null;
  const country = address.country ?? null;

  if (locality && country) return `${locality}, ${country}`;
  return locality ?? country;
}

/**
 * Two decimal places, which is a little over a kilometre.
 *
 * The cache key is deliberately coarser than the fix: walking down the street
 * is a new position and the same city, and a lookup per position update would
 * be a network call per GPS tick for an answer that has not changed.
 */
function cacheKey(coordinates: Coordinates): string {
  return `${coordinates.latitude.toFixed(2)},${coordinates.longitude.toFixed(2)}`;
}

const cache = new Map<string, string | null>();

export function usePlaceName(coordinates: Coordinates | null): string | null {
  const key = coordinates ? cacheKey(coordinates) : null;
  // Holds the key it answered, not just the name: a resolved city belongs to
  // the fix that asked for it, so a position change drops back to null instead
  // of labelling the new place with the old city for a frame.
  const [resolved, setResolved] = useState<{ key: string; name: string | null } | null>(null);

  useEffect(() => {
    if (!coordinates || !key || cache.has(key)) return;

    // Guards the write rather than the call: the fix can move while the lookup
    // is in flight, and a late answer for a place the user has left would
    // relabel the header with the wrong city.
    let current = true;

    void (async () => {
      try {
        const results = await Location.reverseGeocodeAsync(coordinates);
        const nearest = results[0];
        const name = nearest ? formatPlace(nearest) : null;
        cache.set(key, name);
        if (current) setResolved({ key, name });
      } catch {
        cache.set(key, null);
        if (current) setResolved({ key, name: null });
      }
    })();

    return () => {
      current = false;
    };
  }, [coordinates, key]);

  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;
  return resolved?.key === key ? resolved.name : null;
}
