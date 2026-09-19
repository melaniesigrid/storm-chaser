import { useEffect, useSyncExternalStore } from 'react';

import { onboardingStore, type OnboardingStore } from './onboardingStore';

/**
 * Whether the welcome flow is behind us, as a value a screen can read
 * synchronously while it renders.
 *
 * `onboardingStore` is the source of truth and stays that way. This is a cache
 * of the one flag it holds, not a second flag. It exists because the flag lives
 * in AsyncStorage and the decision that needs it is a render-time one: the
 * Conditions tab mounts before the root layout's redirect to `/onboarding`
 * lands, and it must not fire the OS location dialog over the welcome copy that
 * explains why the app wants a position at all.
 *
 * Module state rather than a context, for the same reason as
 * `lastKnownPosition`: a provider would have to be mounted in the root layout,
 * and the first screen to ask is mounted alongside it, not under it.
 */
export type OnboardingGate =
  /** Not read from storage yet. */
  | 'unknown'
  /** Read, and the welcome flow has not been finished. */
  | 'pending'
  /** Read, and the welcome flow is done (or storage could not answer). */
  | 'completed';

export interface OnboardingGateHandle {
  get(): OnboardingGate;
  subscribe(listener: () => void): () => void;
  /** Re-reads the flag. Concurrent callers share one read. */
  refresh(): Promise<OnboardingGate>;
}

export function createOnboardingGate(store: OnboardingStore = onboardingStore): OnboardingGateHandle {
  let gate: OnboardingGate = 'unknown';
  let inFlight: Promise<OnboardingGate> | null = null;
  const listeners = new Set<() => void>();

  function set(next: OnboardingGate): OnboardingGate {
    if (next !== gate) {
      gate = next;
      for (const listener of listeners) listener();
    }
    return gate;
  }

  return {
    get: () => gate,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    refresh() {
      inFlight ??= (async () => {
        const result = await store.hasCompleted();

        // Fails open, exactly as the root layout does: a storage read that
        // cannot answer must not trap someone in a state where the app will
        // never ask for a position.
        return set(!result.ok || result.value ? 'completed' : 'pending');
      })().finally(() => {
        inFlight = null;
      });

      return inFlight;
    },
  };
}

export const onboardingGate = createOnboardingGate();

/**
 * Reads the gate and kicks off the storage read the first time anything asks.
 * Callers get `unknown` on the first render and a re-render once it resolves.
 */
export function useOnboardingGate(): OnboardingGate {
  const gate = useSyncExternalStore(onboardingGate.subscribe, onboardingGate.get, onboardingGate.get);

  useEffect(() => {
    if (gate === 'unknown') void onboardingGate.refresh();
  }, [gate]);

  return gate;
}
