import type { Coordinates } from '@/features/weather/model/types';

import type { StormTypeId } from './types';

/**
 * A storm someone else logged.
 *
 * Deliberately a different type from `StormReport` and deliberately never
 * written to `StormRepository`. A community report has no local photo file, no
 * sync state and no delete affordance, and conflating the two would let a
 * remote record end up in the user's own field log.
 *
 * `source` is what the UI reads to decide whether to badge a pin as demo data.
 * The brief asks for cloud integration code without a backend, so an
 * unconfigured build resolves a bundled fixture through the same code path as a
 * real fetch, and says so in the interface rather than pretending otherwise.
 */
export interface CommunityReport {
  id: string;
  /** Display name of the chaser who logged it. */
  chaser: string;
  stormType: StormTypeId;
  capturedAt: string;
  coordinates: Coordinates;
  notes: string;
  /** Chase index at capture time, 0 to 100. */
  chaseScore: number;
  source: 'remote' | 'sample';
}

/** True when nothing in the set came from a real backend. */
export function isDemoSet(reports: CommunityReport[]): boolean {
  return reports.length > 0 && reports.every((report) => report.source === 'sample');
}
