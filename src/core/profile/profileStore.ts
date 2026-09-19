import { asyncStorageStore, type KeyValueStore } from '@/core/storage/KeyValueStore';
import { err, ok, type Result } from '@/core/utils/result';

/**
 * The longest name the app will keep.
 *
 * A chaser's name is a label on a field log entry, not free text: past this
 * length it stops fitting a card and starts truncating in three places at
 * once, so it is cut here rather than everywhere it is drawn.
 */
export const MAX_CHASER_NAME_LENGTH = 32;

export const PROFILE_STORAGE_KEY = 'storm-chaser.profile.v1';

/**
 * Trims, collapses runs of whitespace and clips to the maximum length.
 *
 * `null` for anything that is empty once trimmed, because "no name" and "a
 * name made of spaces" are the same state to every screen that reads it.
 */
export function normalizeChaserName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim().slice(0, MAX_CHASER_NAME_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * A blob that is no longer JSON, or no longer this shape, reads as no name at
 * all. Only storage itself failing is an error worth reporting: a value the
 * app wrote in some older version must never stop it from launching.
 */
function parseName(raw: string): string | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return normalizeChaserName((parsed as { name?: unknown }).name);
  } catch {
    return null;
  }
}

export interface ChaserProfile {
  /** `null` means the chaser has not given a name; screens greet them without one. */
  name: string | null;
}

export const EMPTY_PROFILE: ChaserProfile = { name: null };

/**
 * Persistence for who is holding the phone.
 *
 * Same shape as the theme store: an injected `KeyValueStore` port and a
 * `Result` on every call, so it is unit testable without a native module and
 * a storage failure is a value the UI can render rather than a crash.
 */
export interface ProfileStore {
  load(): Promise<Result<ChaserProfile>>;
  save(profile: ChaserProfile): Promise<Result<ChaserProfile>>;
  clear(): Promise<Result<void>>;
}

export function createProfileStore(store: KeyValueStore = asyncStorageStore): ProfileStore {
  return {
    async load() {
      try {
        const raw = await store.getItem(PROFILE_STORAGE_KEY);
        if (raw === null) return ok(EMPTY_PROFILE);

        return ok({ name: parseName(raw) });
      } catch (cause) {
        return err('storage', 'Could not read the saved profile', cause);
      }
    },

    async save(profile) {
      const next: ChaserProfile = { name: normalizeChaserName(profile.name) };

      try {
        await store.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
        return ok(next);
      } catch (cause) {
        return err('storage', 'Could not save the profile', cause);
      }
    },

    async clear() {
      try {
        await store.removeItem(PROFILE_STORAGE_KEY);
        return ok(undefined);
      } catch (cause) {
        return err('storage', 'Could not clear the profile', cause);
      }
    },
  };
}

export const profileStore = createProfileStore();
