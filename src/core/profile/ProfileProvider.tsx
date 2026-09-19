import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  EMPTY_PROFILE,
  normalizeChaserName,
  profileStore as defaultStore,
  type ChaserProfile,
  type ProfileStore,
} from './profileStore';

export interface ProfileContextValue {
  profile: ChaserProfile;
  /** False until the stored profile has been read, so nothing greets the wrong name. */
  ready: boolean;
  /** Normalized before it is stored; empty input clears the name. */
  setName: (name: string) => void;
  clear: () => void;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export interface ProfileProviderProps {
  children: ReactNode;
  /** Injectable for tests. */
  store?: ProfileStore;
}

/**
 * Owns who the app is talking to.
 *
 * Writes are optimistic, the way the theme provider's are: the field updates
 * on the keystroke and persistence catches up, so a failed write costs the
 * name on next launch rather than the typing.
 */
export function ProfileProvider({ children, store = defaultStore }: ProfileProviderProps) {
  const [profile, setProfile] = useState<ChaserProfile>(EMPTY_PROFILE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await store.load();
      if (cancelled) return;
      if (result.ok) setProfile(result.value);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [store]);

  const setName = useCallback(
    (name: string) => {
      const next: ChaserProfile = { name: normalizeChaserName(name) };
      setProfile(next);
      void store.save(next);
    },
    [store],
  );

  const clear = useCallback(() => {
    setProfile(EMPTY_PROFILE);
    void store.clear();
  }, [store]);

  const value = useMemo<ProfileContextValue>(
    () => ({ profile, ready, setName, clear }),
    [profile, ready, setName, clear],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
