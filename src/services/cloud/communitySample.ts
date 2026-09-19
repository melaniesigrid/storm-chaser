import { clamp } from '@/core/utils/clamp';

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
 * The set has two halves, because they answer two different questions.
 *
 * **Nearby** entries are generated relative to the viewer, so the map has
 * something to plot wherever they are standing. Fixed coordinates alone would
 * leave the viewer's own region empty.
 *
 * **World** entries sit at fixed coordinates in storm-prone places on every
 * inhabited continent. Zoomed out, the map should show that the app has a view
 * of weather beyond one horizon; zoomed in, the nearby pins are the ones a
 * chaser could actually reach. Each position is the named city to two decimals,
 * which is about a kilometre, and marks a place rather than claiming a track.
 */
const SEEDS: {
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
}[] = [
  { id: 'c1', chaser: 'R. Okonkwo', stormType: 'supercell', notes: 'Textbook rotating updraft, inflow band to the south.', chaseScore: 78, dLat: 0.42, dLon: -0.55, agoHours: 2 },
  { id: 'c2', chaser: 'M. Halvorsen', stormType: 'wall_cloud', notes: 'Low ragged wall cloud, no rotation yet.', chaseScore: 61, dLat: -0.61, dLon: 0.38, agoHours: 5 },
  { id: 'c3', chaser: 'T. Adeyemi', stormType: 'hail', notes: 'Golf ball hail on the shoulder, dented the roof.', chaseScore: 66, dLat: 0.28, dLon: 0.74, agoHours: 9 },
  { id: 'c4', chaser: 'J. Vasquez', stormType: 'shelf_cloud', notes: 'Shelf came through fast, gust front hit before the rain.', chaseScore: 54, dLat: -0.35, dLon: -0.82, agoHours: 14 },
  { id: 'c5', chaser: 'P. Lindqvist', stormType: 'lightning', notes: 'Near constant CG on the back edge after dark.', chaseScore: 47, dLat: 0.77, dLon: 0.19, agoHours: 20 },
  { id: 'c6', chaser: 'A. Moreau', stormType: 'funnel_cloud', notes: 'Brief funnel, never touched down. Roped out in a minute.', chaseScore: 83, dLat: -0.24, dLon: 0.61, agoHours: 27 },
];


/**
 * Fixed positions, one per notable storm region, ordered by continent.
 *
 * These never move with the viewer. A chaser in Toronto and a chaser in
 * Nairobi see the same worldwide set, and their own nearby pins on top of it.
 */
const WORLD_SEEDS: {
  id: string;
  chaser: string;
  stormType: CommunityReport['stormType'];
  notes: string;
  chaseScore: number;
  latitude: number;
  longitude: number;
  /** Hours before now. */
  agoHours: number;
}[] = [
  // North America
  { id: 'w1', chaser: 'D. Whitcomb', stormType: 'tornado', notes: 'Wedge on the ground for eleven minutes, crossing open section road.', chaseScore: 94, latitude: 35.22, longitude: -97.44, agoHours: 3 },
  { id: 'w2', chaser: 'S. Reyes', stormType: 'dust_storm', notes: 'Haboob rolled off the caprock, visibility to nothing in forty seconds.', chaseScore: 71, latitude: 33.58, longitude: -101.86, agoHours: 8 },
  { id: 'w3', chaser: 'K. Boucher', stormType: 'supercell', notes: 'Isolated cell over the Red River valley, striations at sunset.', chaseScore: 76, latitude: 49.9, longitude: -97.14, agoHours: 15 },
  { id: 'w4', chaser: 'H. Tran', stormType: 'lightning', notes: 'Sea breeze collision, near continuous cloud-to-cloud after dark.', chaseScore: 63, latitude: 25.77, longitude: -80.19, agoHours: 22 },
  { id: 'w5', chaser: 'L. Ferreira', stormType: 'hail', notes: 'Afternoon storm dropped pea hail deep enough to plough in Iztapalapa.', chaseScore: 68, latitude: 19.43, longitude: -99.13, agoHours: 30 },
  { id: 'w6', chaser: 'B. Sandoval', stormType: 'funnel_cloud', notes: 'Landspout off the Palmer Divide, up two minutes, no damage.', chaseScore: 72, latitude: 39.74, longitude: -104.99, agoHours: 38 },
  // South America
  { id: 'w7', chaser: 'C. Duarte', stormType: 'hail', notes: 'Stones over 7 cm through the vineyards. Windscreens gone along the road.', chaseScore: 88, latitude: -31.42, longitude: -64.18, agoHours: 11 },
  { id: 'w8', chaser: 'V. Rojas', stormType: 'lightning', notes: 'Catatumbo firing over the lake mouth, no thunder audible at this range.', chaseScore: 81, latitude: 10.65, longitude: -71.62, agoHours: 19 },
  { id: 'w9', chaser: 'I. Monteiro', stormType: 'flooding', notes: 'The Marginal Tiete underwater again after ninety minutes of rain.', chaseScore: 69, latitude: -23.55, longitude: -46.63, agoHours: 26 },
  { id: 'w10', chaser: 'N. Paredes', stormType: 'squall_line', notes: 'Pampero came through hard, gust front ahead of a 300 km line.', chaseScore: 74, latitude: -34.6, longitude: -58.38, agoHours: 44 },
  // Europe
  { id: 'w11', chaser: 'E. Kowalski', stormType: 'squall_line', notes: 'Derecho-class line, trees down across the eastern suburbs.', chaseScore: 79, latitude: 52.23, longitude: 21.01, agoHours: 6 },
  { id: 'w12', chaser: 'F. Bianchi', stormType: 'supercell', notes: 'Po valley cell with a hard right turn, hail core over the autostrada.', chaseScore: 82, latitude: 44.49, longitude: 11.34, agoHours: 13 },
  { id: 'w13', chaser: 'G. Ruiz', stormType: 'flooding', notes: 'Gota fria stalled offshore, 200 mm through the ramblas overnight.', chaseScore: 85, latitude: 39.47, longitude: -0.38, agoHours: 21 },
  { id: 'w14', chaser: 'O. Lindgren', stormType: 'snow_squall', notes: 'Lake-effect band off the Kattegat, whiteout on the E6 for ten minutes.', chaseScore: 58, latitude: 57.71, longitude: 11.97, agoHours: 33 },
  { id: 'w15', chaser: 'R. Devlin', stormType: 'squall_line', notes: 'Atlantic front, sustained gale on the prom and hail with it.', chaseScore: 52, latitude: 53.27, longitude: -9.05, agoHours: 41 },
  { id: 'w16', chaser: 'J. Weber', stormType: 'hail', notes: 'Alpine foehn break, hail to 5 cm across the north of the city.', chaseScore: 77, latitude: 48.14, longitude: 11.58, agoHours: 48 },
  // Africa
  { id: 'w17', chaser: 'A. Mwangi', stormType: 'lightning', notes: 'Overnight storm off Lake Victoria, strike rate impossible to count.', chaseScore: 86, latitude: 0.35, longitude: 32.58, agoHours: 4 },
  { id: 'w18', chaser: 'S. El Amrani', stormType: 'dust_storm', notes: 'Haboob wall a kilometre high ahead of the storm, city gone orange.', chaseScore: 80, latitude: 15.5, longitude: 32.56, agoHours: 17 },
  { id: 'w19', chaser: 'T. Dlamini', stormType: 'supercell', notes: 'Highveld cell with a clean base and hail west of Soweto.', chaseScore: 75, latitude: -26.2, longitude: 28.05, agoHours: 25 },
  { id: 'w20', chaser: 'M. Diallo', stormType: 'squall_line', notes: 'Sahel line running west, dust ahead of it and rain behind.', chaseScore: 70, latitude: 12.64, longitude: -8.0, agoHours: 36 },
  { id: 'w21', chaser: 'N. Abebe', stormType: 'hail', notes: 'Highland storm, hail lying on the road at 2,400 m.', chaseScore: 64, latitude: 9.03, longitude: 38.74, agoHours: 46 },
  // Asia
  { id: 'w22', chaser: 'P. Sharma', stormType: 'squall_line', notes: 'Norwester off the plateau, dust and then a wall of rain in minutes.', chaseScore: 83, latitude: 22.57, longitude: 88.36, agoHours: 7 },
  { id: 'w23', chaser: 'R. Islam', stormType: 'tornado', notes: 'Narrow track through the delta villages north of the city.', chaseScore: 91, latitude: 23.81, longitude: 90.41, agoHours: 12 },
  { id: 'w24', chaser: 'Y. Tanaka', stormType: 'snow_squall', notes: 'Sea-effect band off the Japan Sea, thundersnow with it.', chaseScore: 73, latitude: 36.56, longitude: 136.66, agoHours: 18 },
  { id: 'w25', chaser: 'W. Chen', stormType: 'flooding', notes: 'Pearl River delta, plum rains, streets under half a metre by dawn.', chaseScore: 78, latitude: 23.13, longitude: 113.26, agoHours: 28 },
  { id: 'w26', chaser: 'S. Putri', stormType: 'lightning', notes: 'The daily afternoon storm, on schedule, as it is most days here.', chaseScore: 67, latitude: -6.6, longitude: 106.8, agoHours: 34 },
  { id: 'w27', chaser: 'A. Karimov', stormType: 'supercell', notes: 'Cell rolling off the Tien Shan foothills, hail on the upper roads.', chaseScore: 71, latitude: 43.24, longitude: 76.89, agoHours: 42 },
  { id: 'w28', chaser: 'H. Farhadi', stormType: 'dust_storm', notes: 'Outflow lifted the plain, brown sky over the south of the city.', chaseScore: 62, latitude: 35.69, longitude: 51.39, agoHours: 50 },
  // Oceania
  { id: 'w29', chaser: 'J. Halloran', stormType: 'hail', notes: 'Southeast Queensland supercell, giant hail through the western suburbs.', chaseScore: 89, latitude: -27.47, longitude: 153.03, agoHours: 9 },
  { id: 'w30', chaser: 'K. Nguyen', stormType: 'lightning', notes: 'Hector building over the Tiwi Islands again, same time as yesterday.', chaseScore: 84, latitude: -12.46, longitude: 130.84, agoHours: 16 },
  { id: 'w31', chaser: 'T. Ngata', stormType: 'funnel_cloud', notes: 'Waterspout out over the Hauraki Gulf, held for four minutes.', chaseScore: 68, latitude: -36.85, longitude: 174.76, agoHours: 31 },
  { id: 'w32', chaser: 'B. Waqa', stormType: 'flooding', notes: 'Trough sat over Viti Levu, the Rewa came up through the night.', chaseScore: 72, latitude: -18.14, longitude: 178.44, agoHours: 45 },
  { id: 'w33', chaser: 'M. Cooper', stormType: 'shelf_cloud', notes: 'Southerly change came up the coast as a textbook roll.', chaseScore: 66, latitude: -31.95, longitude: 115.86, agoHours: 52 },
];

export function sampleCommunityReports(
  origin: Coordinates,
  now: Date = new Date(),
): CommunityReport[] {
  const ago = (hours: number) =>
    new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

  const nearby: CommunityReport[] = SEEDS.map((seed) => ({
    id: `sample-${seed.id}`,
    chaser: seed.chaser,
    stormType: seed.stormType,
    capturedAt: ago(seed.agoHours),
    coordinates: {
      latitude: clampLatitude(origin.latitude + seed.dLat),
      longitude: wrapLongitude(origin.longitude + seed.dLon),
    },
    notes: seed.notes,
    chaseScore: seed.chaseScore,
    source: 'sample',
  }));

  const world: CommunityReport[] = WORLD_SEEDS.map((seed) => ({
    id: `sample-${seed.id}`,
    chaser: seed.chaser,
    stormType: seed.stormType,
    capturedAt: ago(seed.agoHours),
    // Already a real place, so it is used as given rather than offset from the
    // viewer. It still goes through the same two guards, so a bad literal
    // cannot put a pin past a pole or past the antimeridian.
    coordinates: {
      latitude: clampLatitude(seed.latitude),
      longitude: wrapLongitude(seed.longitude),
    },
    notes: seed.notes,
    chaseScore: seed.chaseScore,
    source: 'sample',
  }));

  return [...nearby, ...world];
}

/** Keeps a generated point on the globe rather than past the poles. */
function clampLatitude(value: number): number {
  return clamp(value, -85, 85);
}

/** Wraps past the antimeridian instead of producing an invalid longitude. */
function wrapLongitude(value: number): number {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}
