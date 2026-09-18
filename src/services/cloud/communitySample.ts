import type { CommunityReport } from '@/features/storms/model/community';
import type { Coordinates } from '@/features/weather/model/types';

/**
 * Bundled community reports, used when no sync backend is configured.
 *
 * The brief asks for cloud integration code with no keys and no server, so this
 * is the honest version of "storms other chasers logged": fictional entries,
 * resolved through the same `Result` boundary as a real fetch, and tagged
 * `source: 'sample'` so the UI can badge them as demo data rather than passing
 * them off as real people.
 *
 * Positions are generated relative to the viewer so the map has something to
 * plot wherever they are standing. A fixed set of coordinates would put every
 * community pin in one city.
 */
const SEEDS: Array<{
  id: string;
  chaser: string;
  stormType: CommunityReport['stormType'];
  notes: string;
  chaseScore: number;
  /** Degrees offset from the viewer, roughly 30 to 120 km out. */
  dLat: number;
  dLon: number;
  /** Hours before now. */
  agoHours: number;
}> = [
  { id: 'c1', chaser: 'R. Okonkwo', stormType: 'supercell', notes: 'Textbook rotating updraft, inflow band to the south.', chaseScore: 78, dLat: 0.42, dLon: -0.55, agoHours: 2 },
  { id: 'c2', chaser: 'M. Halvorsen', stormType: 'wall_cloud', notes: 'Low ragged wall cloud, no rotation yet.', chaseScore: 61, dLat: -0.61, dLon: 0.38, agoHours: 5 },
  { id: 'c3', chaser: 'T. Adeyemi', stormType: 'hail', notes: 'Golf ball hail on the shoulder, dented the roof.', chaseScore: 66, dLat: 0.28, dLon: 0.74, agoHours: 9 },
  { id: 'c4', chaser: 'J. Vasquez', stormType: 'shelf_cloud', notes: 'Shelf came through fast, gust front hit before the rain.', chaseScore: 54, dLat: -0.35, dLon: -0.82, agoHours: 14 },
  { id: 'c5', chaser: 'P. Lindqvist', stormType: 'lightning', notes: 'Near constant CG on the back edge after dark.', chaseScore: 47, dLat: 0.77, dLon: 0.19, agoHours: 20 },
  { id: 'c6', chaser: 'A. Moreau', stormType: 'funnel_cloud', notes: 'Brief funnel, never touched down. Roped out in a minute.', chaseScore: 83, dLat: -0.24, dLon: 0.61, agoHours: 27 },
];

export function sampleCommunityReports(
  origin: Coordinates,
  now: Date = new Date(),
): CommunityReport[] {
  return SEEDS.map((seed) => ({
    id: `sample-${seed.id}`,
    chaser: seed.chaser,
    stormType: seed.stormType,
    capturedAt: new Date(now.getTime() - seed.agoHours * 60 * 60 * 1000).toISOString(),
    coordinates: {
      latitude: clampLatitude(origin.latitude + seed.dLat),
      longitude: wrapLongitude(origin.longitude + seed.dLon),
    },
    notes: seed.notes,
    chaseScore: seed.chaseScore,
    source: 'sample',
  }));
}

/** Keeps a generated point on the globe rather than past the poles. */
function clampLatitude(value: number): number {
  return Math.min(85, Math.max(-85, value));
}

/** Wraps past the antimeridian instead of producing an invalid longitude. */
function wrapLongitude(value: number): number {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}
