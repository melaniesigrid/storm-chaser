import { useEffect, useSyncExternalStore } from 'react';

import type { Coordinates } from '@/features/weather/model/types';

/**
 * The last position fix any screen in the app has resolved.
 *
 * `useDeviceLocation` acquires a fresh fix on every mount, which is right for
 * the screens that need an accurate, current position — capture stamps a report
 * with it — and wrong for a screen that only wants to print "420 km away".
 * Opening five legend pins in a row should not mean five permission checks and
 * five trips to the satellites, seconds apiece, when the map behind them is
 * already holding a fix.
 *
 * Deliberately module state rather than a React context: a provider would have
 * to be mounted in the root layout, and this has to work for a screen reached
 * from anywhere, including a deep link opened before any screen has published.
 * Readers therefore always handle null rather than acquiring a fix themselves.
 */

let lastKnown: Coordinates | null = null;
const listeners = new Set<() => void>();

/**
 * Records a fix a screen already holds. Null is ignored rather than stored: a
 * hook still in its `requesting` state, or a screen whose permission was
 * denied, is not evidence that a previously good fix has gone stale.
 */
export function publishLastKnownPosition(coordinates: Coordinates | null): void {
  if (coordinates === null) return;

  if (
    lastKnown !== null &&
    lastKnown.latitude === coordinates.latitude &&
    lastKnown.longitude === coordinates.longitude
  ) {
    return;
  }

  lastKnown = coordinates;
  for (const listener of listeners) listener();
}

export function getLastKnownPosition(): Coordinates | null {
  return lastKnown;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Reads the shared fix. Null until some screen has published one, which callers
 * render as "position unknown" rather than treating as a reason to acquire.
 */
export function useLastKnownPosition(): Coordinates | null {
  return useSyncExternalStore(subscribe, getLastKnownPosition, getLastKnownPosition);
}

/** Publishes a screen's own fix for the read-only screens opened on top of it. */
export function usePublishLastKnownPosition(coordinates: Coordinates | null): void {
  useEffect(() => {
    publishLastKnownPosition(coordinates);
  }, [coordinates]);
}
