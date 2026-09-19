import { createId } from '@/core/utils/id';
import { err, ok, type Result } from '@/core/utils/result';

import type { KeyValueStore } from '@/core/storage/KeyValueStore';
import type { StormReport, StormReportDraft, SyncState } from '../model/types';

export const STORAGE_KEY = 'storm-chaser/reports';
export const SCHEMA_VERSION = 2;

interface StoredEnvelope {
  version: number;
  reports: StormReport[];
}

export interface StormRepository {
  list(): Promise<Result<StormReport[]>>;
  getById(id: string): Promise<Result<StormReport>>;
  create(draft: StormReportDraft): Promise<Result<StormReport>>;
  update(id: string, patch: Partial<StormReport>): Promise<Result<StormReport>>;
  remove(id: string): Promise<Result<string>>;
  markSyncState(id: string, state: SyncState): Promise<Result<StormReport>>;
  /** Drops the whole envelope. Used by account erasure, never by the log UI. */
  clear(): Promise<Result<void>>;
}

/**
 * Reports live in a single versioned envelope. For a field log measured in
 * hundreds of entries this is faster than one key per record and makes ordering
 * and migration trivial; the envelope shape is what a SQLite migration would
 * read from if the volume ever justified it.
 *
 * The clock and the id generator are injected so tests are deterministic.
 */
export function createStormRepository(
  store: KeyValueStore,
  deps: { now?: () => Date; nextId?: () => string } = {},
): StormRepository {
  const now = deps.now ?? (() => new Date());
  const nextId = deps.nextId ?? (() => createId());

  async function read(): Promise<Result<StormReport[]>> {
    try {
      const raw = await store.getItem(STORAGE_KEY);
      if (!raw) return ok([]);

      const parsed = JSON.parse(raw) as StoredEnvelope;
      if (!parsed || !Array.isArray(parsed.reports)) return ok([]);

      return ok(migrate(parsed));
    } catch (cause) {
      return err('storage', 'Saved storm reports could not be read', cause);
    }
  }

  async function write(reports: StormReport[]): Promise<Result<StormReport[]>> {
    try {
      const envelope: StoredEnvelope = { version: SCHEMA_VERSION, reports };
      await store.setItem(STORAGE_KEY, JSON.stringify(envelope));
      return ok(reports);
    } catch (cause) {
      return err('storage', 'Storm report could not be saved to this device', cause);
    }
  }

  async function update(
    id: string,
    patch: Partial<StormReport>,
  ): Promise<Result<StormReport>> {
    const existing = await read();
    if (!existing.ok) return existing;

    const index = existing.value.findIndex((report) => report.id === id);
    const current = existing.value[index];
    if (index === -1 || !current) {
      return err('not_found', `No storm report with id ${id}`);
    }

    const updated: StormReport = {
      ...current,
      ...patch,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: now().toISOString(),
    };

    const next = [...existing.value];
    next[index] = updated;

    const written = await write(next);
    return written.ok ? ok(updated) : written;
  }

  return {
    update,

    async list() {
      const result = await read();
      if (!result.ok) return result;
      // Newest first: the log is read as a timeline.
      return ok(
        [...result.value].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)),
      );
    },

    async getById(id) {
      const result = await read();
      if (!result.ok) return result;

      const found = result.value.find((report) => report.id === id);
      return found ? ok(found) : err('not_found', `No storm report with id ${id}`);
    },

    async create(draft) {
      const existing = await read();
      if (!existing.ok) return existing;

      const timestamp = now().toISOString();
      const report: StormReport = {
        ...draft,
        id: nextId(),
        syncState: 'local',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const written = await write([report, ...existing.value]);
      return written.ok ? ok(report) : written;
    },

    async remove(id) {
      const existing = await read();
      if (!existing.ok) return existing;

      const next = existing.value.filter((report) => report.id !== id);
      if (next.length === existing.value.length) {
        return err('not_found', `No storm report with id ${id}`);
      }

      const written = await write(next);
      return written.ok ? ok(id) : written;
    },

    async markSyncState(id, state) {
      return update(id, { syncState: state });
    },

    async clear() {
      try {
        await store.removeItem(STORAGE_KEY);
        return ok(undefined);
      } catch (cause) {
        return err('storage', 'Saved storm reports could not be removed', cause);
      }
    },
  };
}

/**
 * Forward migration hook.
 *
 * Version 2 added `photoSource`. Every version 1 report predates photo import,
 * so it was necessarily shot on the camera; defaulting it that way is a
 * statement of fact rather than a guess. Migration is read time and
 * non-destructive: the envelope is rewritten on the next save.
 */
function migrate(envelope: StoredEnvelope): StormReport[] {
  if (envelope.version === SCHEMA_VERSION) return envelope.reports;
  return envelope.reports.map((report) => ({
    ...report,
    syncState: report.syncState ?? 'local',
    photoSource: report.photoSource ?? 'camera',
  }));
}
