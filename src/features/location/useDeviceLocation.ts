import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { useOnboardingGate } from '@/core/onboarding/onboardingGate';
import type { AppError } from '@/core/utils/result';
import { shouldAutoAcquire } from '@/features/location/autoAcquire';
import type { Coordinates } from '@/features/weather/model/types';

export type LocationStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'error';

export interface DeviceLocationState {
  status: LocationStatus;
  coordinates: Coordinates | null;
  accuracyMeters: number | null;
  error: AppError | null;
  refresh: () => Promise<void>;
}

export interface DeviceLocationOptions {
  /**
   * Acquire a fix as soon as the caller mounts. The default, because the map
   * and the capture flow both want a position the moment they are open.
   *
   * Pass `false` when the request has to belong to a deliberate press —
   * onboarding's location primer is the whole reason this option exists. Note
   * that even `auto: true` waits for onboarding to be finished; see
   * `shouldAutoAcquire`.
   */
  auto?: boolean;
}

/**
 * Owns permission negotiation and the single position read the rest of the app
 * depends on. Kept separate from the weather feature so the camera flow can
 * stamp coordinates onto a report without pulling in weather code.
 */
export function useDeviceLocation({ auto = true }: DeviceLocationOptions = {}): DeviceLocationState {
  const gate = useOnboardingGate();
  // An auto caller opens in `requesting` rather than `idle`: a fix is on its
  // way, and a screen that reads `idle` as "nothing is coming" paints an
  // unavailable state for the frames before the acquire starts.
  const [status, setStatus] = useState<LocationStatus>(auto ? 'requesting' : 'idle');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const refresh = useCallback(async () => {
    setStatus('requesting');
    setError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setStatus('denied');
        setError({
          kind: 'permission',
          message:
            'Location access is off. Enable it in Settings to pull conditions for where you are standing.',
        });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setAccuracyMeters(position.coords.accuracy ?? null);
      setStatus('ready');
    } catch (cause) {
      setStatus('error');
      setError({
        kind: 'unknown',
        message: 'Could not read a position fix from this device.',
        cause,
      });
    }
  }, []);

  useEffect(() => {
    if (!shouldAutoAcquire({ auto, gate })) return;
    void refresh();
  }, [auto, gate, refresh]);

  return { status, coordinates, accuracyMeters, error, refresh };
}
