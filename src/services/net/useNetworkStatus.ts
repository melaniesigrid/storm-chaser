import * as Network from 'expo-network';
import { useEffect, useState } from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

const POLL_INTERVAL_MS = 15_000;

/**
 * Drives the offline banner. Polled rather than event driven to avoid pulling in
 * a community package for a single boolean; fifteen seconds is well inside the
 * window a chaser would notice.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function read() {
      try {
        const state = await Network.getNetworkStateAsync();
        if (cancelled) return;
        setStatus({
          isConnected: state.isConnected ?? true,
          isInternetReachable: state.isInternetReachable ?? true,
        });
      } catch {
        // A failed probe is not evidence of being offline; leave the last value.
      }
    }

    void read();
    const interval = setInterval(read, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return status;
}
