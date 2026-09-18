import { createMemoryStore } from '@/core/storage/KeyValueStore';
import {
  createStormRepository,
  STORAGE_KEY,
} from '@/features/storms/data/StormRepository';
import type { StormReportDraft } from '@/features/storms/model/types';

function draft(overrides: Partial<StormReportDraft> = {}): StormReportDraft {
  return {
    photoUri: 'file:///documents/storm-photos/a.jpg',
    capturedAt: '2026-05-01T18:00:00.000Z',
    coordinates: { latitude: 35.48, longitude: -97.53 },
    locationAccuracyM: 12,
    stormType: 'supercell',
    notes: 'Rotating wall cloud on the south flank',
    conditions: null,
    ...overrides,
  };
}

function buildRepository(seed: Record<string, string> = {}) {
  let counter = 0;
  const store = createMemoryStore(seed);
  const repository = createStormRepository(store, {
    now: () => new Date('2026-05-01T18:05:00.000Z'),
    nextId: () => `storm_${(counter += 1)}`,
  });
  return { repository, store };
}

describe('StormRepository', () => {
  it('starts empty and returns an ok result rather than throwing', async () => {
    const { repository } = buildRepository();
    const result = await repository.list();

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toEqual([]);
  });

  it('creates a report with generated id, timestamps and local sync state', async () => {
    const { repository } = buildRepository();
    const created = await repository.create(draft());

    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(created.value.id).toBe('storm_1');
    expect(created.value.syncState).toBe('local');
    expect(created.value.createdAt).toBe('2026-05-01T18:05:00.000Z');
    expect(created.value.stormType).toBe('supercell');
  });

  it('persists through a fresh repository instance over the same store', async () => {
    const { repository, store } = buildRepository();
    await repository.create(draft());

    const reopened = createStormRepository(store);
    const listed = await reopened.list();

    expect(listed.ok && listed.value).toHaveLength(1);
  });

  it('returns reports newest first', async () => {
    const { repository } = buildRepository();
    await repository.create(draft({ capturedAt: '2026-05-01T10:00:00.000Z' }));
    await repository.create(draft({ capturedAt: '2026-05-03T10:00:00.000Z' }));
    await repository.create(draft({ capturedAt: '2026-05-02T10:00:00.000Z' }));

    const listed = await repository.list();
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;

    expect(listed.value.map((report) => report.capturedAt)).toEqual([
      '2026-05-03T10:00:00.000Z',
      '2026-05-02T10:00:00.000Z',
      '2026-05-01T10:00:00.000Z',
    ]);
  });

  it('reads a single report by id and reports a miss as not_found', async () => {
    const { repository } = buildRepository();
    await repository.create(draft());

    const hit = await repository.getById('storm_1');
    expect(hit.ok).toBe(true);

    const miss = await repository.getById('nope');
    expect(miss.ok).toBe(false);
    expect(!miss.ok && miss.error.kind).toBe('not_found');
  });

  it('patches a report without rewriting its id or creation time', async () => {
    const { repository } = buildRepository();
    await repository.create(draft());

    const updated = await repository.update('storm_1', { notes: 'Now tornado warned' });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.value.id).toBe('storm_1');
    expect(updated.value.notes).toBe('Now tornado warned');
    expect(updated.value.createdAt).toBe('2026-05-01T18:05:00.000Z');
  });

  it('moves a report through sync states', async () => {
    const { repository } = buildRepository();
    await repository.create(draft());

    const synced = await repository.markSyncState('storm_1', 'synced');
    expect(synced.ok && synced.value.syncState).toBe('synced');
  });

  it('removes a report and rejects a second removal', async () => {
    const { repository } = buildRepository();
    await repository.create(draft());

    expect((await repository.remove('storm_1')).ok).toBe(true);
    expect((await repository.list()).ok).toBe(true);

    const second = await repository.remove('storm_1');
    expect(second.ok).toBe(false);
    expect(!second.ok && second.error.kind).toBe('not_found');
  });

  it('degrades to an empty log when stored data is corrupt', async () => {
    const { repository } = buildRepository({ [STORAGE_KEY]: '{not json' });
    const result = await repository.list();

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe('storage');
  });

  it('surfaces a write failure as a storage error instead of throwing', async () => {
    const store = createMemoryStore();
    store.setItem = async () => {
      throw new Error('disk full');
    };
    const repository = createStormRepository(store);

    const created = await repository.create(draft());
    expect(created.ok).toBe(false);
    expect(!created.ok && created.error.kind).toBe('storage');
  });
});
