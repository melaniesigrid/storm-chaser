import { onboardingStore as defaultOnboardingStore, type OnboardingStore } from '@/core/onboarding/onboardingStore';
import { profileStore as defaultProfileStore, type ProfileStore } from '@/core/profile';
import { themeStore as defaultThemeStore, type ThemeStore } from '@/core/theme/themeStore';
import { err, ok, type Result } from '@/core/utils/result';
import { stormRepository as defaultRepository } from '@/features/storms/data';
import { queryClient as defaultQueryClient, queryPersister as defaultPersister } from '@/services/query/queryClient';
import { deleteAllPhotos as defaultDeletePhotos } from '@/features/storms/data/photoStore';

import type { StormRepository } from '@/features/storms/data/StormRepository';

/**
 * Erasing the account.
 *
 * Storm Chaser has no server account: everything the app knows about a chaser
 * — the call sign, the field log, its photographs, the chosen theme and the
 * fact that onboarding was finished — lives on this phone. "Delete my account"
 * therefore means every one of those, which is why it is composed here rather
 * than left to a screen to remember all five.
 *
 * Every step runs even if an earlier one fails. A half-erased device is worse
 * than a failed erase reported honestly, so the first failure is kept and
 * returned once the rest have had their turn.
 */
export interface EraseAccountDeps {
  reports?: Pick<StormRepository, 'clear'>;
  deletePhotos?: () => Promise<Result<unknown>>;
  profile?: Pick<ProfileStore, 'clear'>;
  theme?: Pick<ThemeStore, 'clear'>;
  onboarding?: Pick<OnboardingStore, 'reset'>;
  /** The in-memory query cache, and the copy of it that survives a cold start. */
  cache?: { clear: () => void };
  persistedCache?: { removeClient: () => Promise<void> };
}

export async function eraseAccount(deps: EraseAccountDeps = {}): Promise<Result<void>> {
  const {
    reports = defaultRepository,
    deletePhotos = defaultDeletePhotos,
    profile = defaultProfileStore,
    theme = defaultThemeStore,
    onboarding = defaultOnboardingStore,
    cache = defaultQueryClient,
    persistedCache = defaultPersister,
  } = deps;

  const steps = [
    // Photos first: the records are what point at them, so losing the index
    // before the files is what orphans bytes on the device.
    () => deletePhotos(),
    () => reports.clear(),
    () => profile.clear(),
    () => theme.clear(),
    () => onboarding.reset(),
    // The field log is served from the query cache, and that cache is written
    // to disk. Leaving it behind would hand the reports straight back on the
    // next launch, erased records or not.
    async () => {
      cache.clear();
      await persistedCache.removeClient();
      return ok(undefined);
    },
  ];

  let failure: Result<void> | null = null;

  for (const step of steps) {
    try {
      const result = await step();
      if (!result.ok && !failure) failure = result;
    } catch (cause) {
      failure ??= err('storage', 'Some of your data could not be removed', cause);
    }
  }

  return failure ?? ok(undefined);
}
