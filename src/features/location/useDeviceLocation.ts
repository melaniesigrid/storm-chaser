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
   * Pass `false` when the request has to belong to a deliberate press;
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

  /**
   * The acquisition itself, with no synchronous state change of its own.
   *
   * Split out because the auto path already opens in `requesting` with no
   * error, so the reset below was setting two pieces of state to the values
   * they already held, inside an effect, on every mount. That is a cascading
   * render for nothing, and it is what the compiler was objecting to.
   */
  const acquire = useCallback(async () => {
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

  /**
   * The manual entry point: a retry from the UI has to clear whatever the last
   * attempt left on screen before it starts, which the auto path never does
   * because there is nothing there yet.
   */
  const refresh = useCallback(async () => {
    setStatus('requesting');
    setError(null);
    await acquire();
  }, [acquire]);

  useEffect(() => {
    if (!shouldAutoAcquire({ auto, gate })) return;
    /*
     * `acquire`, not `refresh`: see the note on the split above.
     *
     * The rule cannot see through the async boundary. `acquire` sets no state
     * synchronously -- its first statement is an `await` on the permission
     * prompt, and every setState after it runs in a promise callback once the
     * device has answered. That is precisely the shape the rule's own guidance
     * calls correct: subscribe to an external system, set state when it
     * reports back. Suppressed narrowly rather than restructured, because the
     * restructuring would only be there to satisfy the analyzer.
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void acquire();
  }, [auto, gate, acquire]);

  return { status, coordinates, accuracyMeters, error, refresh };
}
