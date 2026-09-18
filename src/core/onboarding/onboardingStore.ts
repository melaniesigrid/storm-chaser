import { asyncStorageStore, type KeyValueStore } from '@/core/storage/KeyValueStore';
import { err, ok, type Result } from '@/core/utils/result';

/**
 * Whether the welcome flow has been completed.
 *
 * Versioned like the theme key: if the flow changes materially, bumping the
 * version shows it again rather than leaving returning users on a stale
 * understanding of the app.
 */
export const ONBOARDING_STORAGE_KEY = 'storm-chaser.onboarding.v1';
const DONE = 'done';

export interface OnboardingStore {
  hasCompleted(): Promise<Result<boolean>>;
  complete(): Promise<Result<void>>;
  reset(): Promise<Result<void>>;
}

export function createOnboardingStore(store: KeyValueStore = asyncStorageStore): OnboardingStore {
  return {
    async hasCompleted() {
      try {
        return ok((await store.getItem(ONBOARDING_STORAGE_KEY)) === DONE);
      } catch (cause) {
        // Failing closed here would trap someone in onboarding forever, so a
        // read failure is treated as "already seen".
        return err('storage', 'Could not read onboarding state', cause);
      }
    },

    async complete() {
      try {
        await store.setItem(ONBOARDING_STORAGE_KEY, DONE);
        return ok(undefined);
      } catch (cause) {
        return err('storage', 'Could not save onboarding state', cause);
      }
    },

    async reset() {
      try {
        await store.removeItem(ONBOARDING_STORAGE_KEY);
        return ok(undefined);
      } catch (cause) {
        return err('storage', 'Could not reset onboarding state', cause);
      }
    },
  };
}

export const onboardingStore = createOnboardingStore();
