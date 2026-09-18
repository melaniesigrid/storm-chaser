import { asyncStorageStore, type KeyValueStore } from '@/core/storage/KeyValueStore';
import { err, ok, type Result } from '@/core/utils/result';

import { isThemeName, type ThemeName } from './themes';

/**
 * Persistence for the user's theme choice.
 *
 * Takes the same injected `KeyValueStore` port the storm repository uses, so
 * it is unit testable without a native module. Versioned key: if the theme
 * names ever change, the old value is simply unreadable and the app falls back
 * to system appearance rather than booting into a theme that no longer exists.
 */
export const THEME_STORAGE_KEY = 'storm-chaser.theme.v1';

export interface ThemeStore {
  /** `null` means the user has never chosen; follow system appearance. */
  load(): Promise<Result<ThemeName | null>>;
  save(name: ThemeName): Promise<Result<ThemeName>>;
  clear(): Promise<Result<void>>;
}

export function createThemeStore(store: KeyValueStore = asyncStorageStore): ThemeStore {
  return {
    async load() {
      try {
        const raw = await store.getItem(THEME_STORAGE_KEY);
        // An unknown value is treated as no choice at all, never as a crash.
        return ok(isThemeName(raw) ? raw : null);
      } catch (cause) {
        return err('storage', 'Could not read the saved theme', cause);
      }
    },

    async save(name) {
      try {
        await store.setItem(THEME_STORAGE_KEY, name);
        return ok(name);
      } catch (cause) {
        return err('storage', 'Could not save the theme', cause);
      }
    },

    async clear() {
      try {
        await store.removeItem(THEME_STORAGE_KEY);
        return ok(undefined);
      } catch (cause) {
        return err('storage', 'Could not clear the saved theme', cause);
      }
    },
  };
}

export const themeStore = createThemeStore();
