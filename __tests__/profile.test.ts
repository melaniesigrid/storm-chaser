import {
  createProfileStore,
  MAX_CHASER_NAME_LENGTH,
  normalizeChaserName,
  PROFILE_STORAGE_KEY,
} from '@/core/profile/profileStore';
import { createMemoryStore, type KeyValueStore } from '@/core/storage/KeyValueStore';

/**
 * The profile is one string, so the interesting behaviour is all in what the
 * app refuses to keep: whitespace-only names, over-long ones, and a stored
 * blob that is no longer JSON. None of those may reach a screen or stop a
 * launch.
 */
describe('normalizeChaserName', () => {
  it('trims, collapses inner whitespace and clips to the maximum', () => {
    expect(normalizeChaserName('  Mel   Arellano ')).toBe('Mel Arellano');
    expect(normalizeChaserName('a'.repeat(MAX_CHASER_NAME_LENGTH + 10))).toHaveLength(
      MAX_CHASER_NAME_LENGTH,
    );
  });

  it('treats empty, blank and non-string values as no name at all', () => {
    expect(normalizeChaserName('')).toBeNull();
    expect(normalizeChaserName('   ')).toBeNull();
    expect(normalizeChaserName(undefined)).toBeNull();
    expect(normalizeChaserName(42)).toBeNull();
  });
});

describe('profile store', () => {
  it('round trips a name through storage, normalized', async () => {
    const store = createProfileStore(createMemoryStore());

    const saved = await store.save({ name: '  Storm  Chaser ' });
    expect(saved.ok && saved.value.name).toBe('Storm Chaser');

    const loaded = await store.load();
    expect(loaded.ok && loaded.value.name).toBe('Storm Chaser');
  });

  it('reports no name when nothing has ever been saved', async () => {
    const loaded = await createProfileStore(createMemoryStore()).load();
    expect(loaded.ok && loaded.value.name).toBeNull();
  });

  it('reads a corrupt blob as no name rather than failing', async () => {
    const store = createProfileStore(
      createMemoryStore({ [PROFILE_STORAGE_KEY]: 'not json at all' }),
    );

    const loaded = await store.load();
    expect(loaded.ok && loaded.value.name).toBeNull();
  });

  it('clears the saved name', async () => {
    const store = createProfileStore(
      createMemoryStore({ [PROFILE_STORAGE_KEY]: JSON.stringify({ name: 'Mel' }) }),
    );

    await store.clear();
    const loaded = await store.load();
    expect(loaded.ok && loaded.value.name).toBeNull();
  });

  it('returns a storage error instead of throwing when the write fails', async () => {
    const failing: KeyValueStore = {
      getItem: async () => {
        throw new Error('nope');
      },
      setItem: async () => {
        throw new Error('nope');
      },
      removeItem: async () => {
        throw new Error('nope');
      },
    };
    const store = createProfileStore(failing);

    const saved = await store.save({ name: 'Mel' });
    const loaded = await store.load();

    expect(saved.ok).toBe(false);
    expect(loaded.ok).toBe(false);
    expect(!saved.ok && saved.error.kind).toBe('storage');
  });
});
