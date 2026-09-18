import type { Coordinates } from '@/features/weather/model/types';
import { assertNever } from '@/core/utils/exhaustive';

import type { StormTypeId } from './types';

/**
 * A famous storm place, plotted on the map wherever in the world you are.
 *
 * These are not reports and never become reports: they carry no photo, no
 * weather snapshot and no owner, and they never touch `StormRepository`. They
 * exist so the map has something worth looking at before you have logged
 * anything, and so the app has a point of view about the weather it is asking
 * you to go and photograph.
 *
 * `kind` separates the three honest categories, because "a place that storms
 * every afternoon" and "a thing that happened once in 1925" are not the same
 * claim:
 *
 * - `hotspot`  somewhere that reliably storms, year after year
 * - `record`   where a measured record was set
 * - `event`    a single historic storm, at the place it is named for
 *
 * Coordinates are the named place, rounded to roughly a kilometre. For an
 * `event` that is where the storm is remembered, not a track, so the pin marks
 * a town rather than claiming a path.
 */
export interface StormLegend {
  id: string;
  /** What it is called, e.g. "Catatumbo lightning". */
  name: string;
  /** Where it is, in human terms. */
  place: string;
  kind: 'hotspot' | 'record' | 'event';
  stormType: StormTypeId;
  coordinates: Coordinates;
  /** One line on why it earns a pin. Shown in the map callout. */
  claim: string;
  /** The fun fact. One sentence, one idea, checkable. */
  fact: string;
  /** When it happens, or when it happened. */
  season: string;
  /** Present for `event` and for a dated `record`. */
  year?: number;
}

export const STORM_LEGENDS: StormLegend[] = [
  {
    id: 'catatumbo',
    name: 'Catatumbo lightning',
    place: 'Lake Maracaibo, Venezuela',
    kind: 'hotspot',
    stormType: 'lightning',
    coordinates: { latitude: 9.35, longitude: -71.35 },
    claim: 'The most lightning-struck place on Earth.',
    fact: 'Storms fire over the mouth of the Catatumbo River on roughly 250 nights a year, for up to nine hours at a stretch. Sailors used it as a lighthouse for centuries.',
    season: 'Peaks September to October, quietest in January and February',
  },
  {
    id: 'kifuka',
    name: 'Kifuka',
    place: 'South Kivu, Democratic Republic of the Congo',
    kind: 'hotspot',
    stormType: 'lightning',
    coordinates: { latitude: -3.02, longitude: 28.23 },
    claim: 'The Congo Basin is the most electrically active sky on the planet.',
    fact: 'Satellite counts put more than 150 strikes per square kilometre per year over this village: mountain air lifting the world’s second largest rainforest, every single afternoon.',
    season: 'Year round, with a lull in June and July',
  },
  {
    id: 'lake-victoria',
    name: 'Lake Victoria night storms',
    place: 'Lake Victoria, Uganda, Kenya and Tanzania',
    kind: 'hotspot',
    stormType: 'squall_line',
    coordinates: { latitude: -1.0, longitude: 33.0 },
    claim: 'Storms that only really get going after dark.',
    fact: 'Land breezes converge over the warm lake overnight, so the most violent storms hit between midnight and dawn, which is exactly when the fishing fleet is out on it.',
    season: 'Worst in the March to May and October to December rains',
  },
  {
    id: 'kampala',
    name: 'Kampala',
    place: 'Uganda',
    kind: 'hotspot',
    stormType: 'lightning',
    coordinates: { latitude: 0.32, longitude: 32.58 },
    claim: 'One of the most thunderous cities anywhere.',
    fact: 'Thunder is audible here on the order of 240 days a year, roughly two days in three, which is more thunder days than most countries record nationwide.',
    season: 'Two wet seasons, March to May and September to November',
  },
  {
    id: 'hector',
    name: 'Hector the Convector',
    place: 'Tiwi Islands, Northern Territory, Australia',
    kind: 'hotspot',
    stormType: 'supercell',
    coordinates: { latitude: -11.6, longitude: 130.9 },
    claim: 'A thunderstorm so punctual it has a name.',
    fact: 'Sea breezes off both sides of the Tiwi Islands collide every afternoon in the build-up season and throw a storm tower near 20 km high. Second World War pilots navigated by it.',
    season: 'Most afternoons, September to March',
  },
  {
    id: 'bogor',
    name: 'Bogor',
    place: 'West Java, Indonesia',
    kind: 'hotspot',
    stormType: 'lightning',
    coordinates: { latitude: -6.6, longitude: 106.8 },
    claim: 'Indonesia calls it Kota Hujan, the City of Rain.',
    fact: 'Sitting under volcanoes in the wettest part of the maritime continent, Bogor has recorded well over 300 thunderstorm days in a single year: close to one storm per day.',
    season: 'Year round, heaviest October to April',
  },
  {
    id: 'sumatra-squall',
    name: 'Sumatra squalls',
    place: 'Singapore and the Malacca Strait',
    kind: 'hotspot',
    stormType: 'squall_line',
    coordinates: { latitude: 1.35, longitude: 103.82 },
    claim: 'A squall line that arrives before breakfast, on a schedule.',
    fact: 'Lines of storms form over Sumatra overnight and sweep east across the strait, so Singapore takes a pre-dawn gust front and around 170 thunder days a year.',
    season: 'April to November, usually between midnight and mid-morning',
  },
  {
    id: 'tampa',
    name: 'Lightning Alley',
    place: 'Tampa Bay, Florida, USA',
    kind: 'hotspot',
    stormType: 'lightning',
    coordinates: { latitude: 27.95, longitude: -82.46 },
    claim: 'The lightning capital of the United States.',
    fact: 'Sea breezes off the Gulf and the Atlantic collide over the Florida peninsula most summer afternoons and the collision line parks over Tampa. The local hockey team is named after it.',
    season: 'June to September, peaking mid-afternoon',
  },
  {
    id: 'cordoba',
    name: 'Córdoba hail corridor',
    place: 'Sierras de Córdoba, Argentina',
    kind: 'hotspot',
    stormType: 'hail',
    coordinates: { latitude: -31.42, longitude: -64.43 },
    claim: 'Where storm science goes to see the extreme end of convection.',
    fact: 'Storms here build some of the tallest thunderstorm towers measured anywhere, and a 2018 stone from Villa Carlos Paz was so large that researchers proposed a category above giant: gargantuan hail.',
    season: 'October to March',
  },
  {
    id: 'mawsynram',
    name: 'Mawsynram and Cherrapunji',
    place: 'Meghalaya, India',
    kind: 'record',
    stormType: 'flooding',
    coordinates: { latitude: 25.3, longitude: 91.58 },
    claim: 'The wettest inhabited places on Earth.',
    fact: 'Monsoon air off the Bay of Bengal hits a wall of hills and drops around 11.9 metres of rain a year. Nearby Cherrapunji once recorded 26.4 metres in twelve months.',
    season: 'Monsoon, June to September',
    year: 1861,
  },
  {
    id: 'hokuriku',
    name: 'Winter thundersnow',
    place: 'Hokuriku coast, Sea of Japan',
    kind: 'hotspot',
    stormType: 'snow_squall',
    coordinates: { latitude: 36.6, longitude: 136.63 },
    claim: 'Lightning inside a snowstorm, and some of the most powerful strikes on record.',
    fact: 'Siberian air crossing the warm Sea of Japan builds snow squalls that throw enormous positive strikes. In 2017 researchers caught one triggering a nuclear reaction in the air, producing antimatter.',
    season: 'December to February',
    year: 2017,
  },
  {
    id: 'khartoum',
    name: 'Haboob season',
    place: 'Khartoum, Sudan',
    kind: 'hotspot',
    stormType: 'dust_storm',
    coordinates: { latitude: 15.59, longitude: 32.53 },
    claim: 'The wall of dust that gave the haboob its name.',
    fact: 'The outflow from a collapsing thunderstorm lifts a dust wall up to a kilometre tall and a hundred kilometres wide, turning midday to night in minutes. Haboob is simply Arabic for blasting.',
    season: 'May to September',
  },
  {
    id: 'phoenix',
    name: 'Monsoon haboobs',
    place: 'Phoenix, Arizona, USA',
    kind: 'hotspot',
    stormType: 'dust_storm',
    coordinates: { latitude: 33.45, longitude: -112.07 },
    claim: 'North America’s answer to the Sahel dust wall.',
    fact: 'The July 2011 haboob crossed the Phoenix valley roughly 160 km wide and over a kilometre high, and it is why the city runs dust-storm warnings on its freeways.',
    season: 'Monsoon, mid-June to September',
    year: 2011,
  },
  {
    id: 'burketown',
    name: 'Morning Glory cloud',
    place: 'Burketown, Queensland, Australia',
    kind: 'hotspot',
    stormType: 'shelf_cloud',
    coordinates: { latitude: -17.74, longitude: 139.55 },
    claim: 'A roll cloud you can surf in a glider.',
    fact: 'Tubes of cloud up to 1,000 km long roll in off the Gulf of Carpentaria at dawn, and pilots fly in from around the world to ride the rising air in front of them.',
    season: 'Late September to early November, around sunrise',
  },
  {
    id: 'el-reno',
    name: 'El Reno',
    place: 'Oklahoma, USA',
    kind: 'record',
    stormType: 'tornado',
    coordinates: { latitude: 35.53, longitude: -98.0 },
    claim: 'The widest tornado ever measured.',
    fact: 'On 31 May 2013 the El Reno tornado spread to 4.2 km across. It also killed three storm chasers, which changed how the chase community talks about risk.',
    season: 'Spring, in the heart of Tornado Alley',
    year: 2013,
  },
  {
    id: 'bridge-creek',
    name: 'Bridge Creek to Moore',
    place: 'Moore, Oklahoma, USA',
    kind: 'record',
    stormType: 'tornado',
    coordinates: { latitude: 35.34, longitude: -97.49 },
    claim: 'The fastest wind ever measured near the ground.',
    fact: 'A mobile Doppler radar clocked 484 km/h inside this tornado on 3 May 1999, and Moore has been struck by violent tornadoes so often that Oklahoma rewrote building codes around it.',
    season: 'Spring',
    year: 1999,
  },
  {
    id: 'tri-state',
    name: 'The Tri-State Tornado',
    place: 'Murphysboro, Illinois, USA',
    kind: 'event',
    stormType: 'tornado',
    coordinates: { latitude: 37.76, longitude: -89.33 },
    claim: 'The deadliest tornado in United States history.',
    fact: 'On 18 March 1925 it ran 352 km across three states in about three and a half hours, and no tornado warning system existed to tell anyone it was coming.',
    season: 'March',
    year: 1925,
  },
  {
    id: 'daulatpur-saturia',
    name: 'Daulatpur to Saturia',
    place: 'Manikganj, Bangladesh',
    kind: 'event',
    stormType: 'tornado',
    coordinates: { latitude: 23.86, longitude: 89.99 },
    claim: 'The deadliest tornado on record anywhere.',
    fact: 'On 26 April 1989 it killed around 1,300 people in the Ganges delta, a region that sees more deadly tornadoes than anywhere outside North America and almost no coverage of them.',
    season: 'Pre-monsoon, March to May',
    year: 1989,
  },
  {
    id: 'gopalganj-hail',
    name: 'The heaviest hailstone',
    place: 'Gopalganj, Bangladesh',
    kind: 'record',
    stormType: 'hail',
    coordinates: { latitude: 23.0, longitude: 89.83 },
    claim: 'The heaviest hailstone ever weighed.',
    fact: 'A stone from the 14 April 1986 storm weighed 1.02 kg, about the weight of a pineapple, falling at motorway speed.',
    season: 'Pre-monsoon',
    year: 1986,
  },
  {
    id: 'vivian-hail',
    name: 'The Vivian stone',
    place: 'Vivian, South Dakota, USA',
    kind: 'record',
    stormType: 'hail',
    coordinates: { latitude: 43.93, longitude: -100.29 },
    claim: 'The largest hailstone measured in the United States.',
    fact: 'The 23 July 2010 stone was 20 cm across and 47 cm around. The man who caught it lost some of it to a power cut that thawed his freezer before scientists arrived.',
    season: 'Summer',
    year: 2010,
  },
  {
    id: 'iowa-derecho',
    name: 'The 2020 derecho',
    place: 'Cedar Rapids, Iowa, USA',
    kind: 'event',
    stormType: 'squall_line',
    coordinates: { latitude: 41.98, longitude: -91.67 },
    claim: 'The costliest thunderstorm in United States history.',
    fact: 'On 10 August 2020 a line of storms crossed 1,300 km in fourteen hours with gusts near 225 km/h, flattening a third of Iowa’s corn crop. Inland, with no name, and almost no warning.',
    season: 'Summer',
    year: 2020,
  },
  {
    id: 'super-outbreak',
    name: 'The Super Outbreak',
    place: 'Xenia, Ohio, USA',
    kind: 'event',
    stormType: 'tornado',
    coordinates: { latitude: 39.68, longitude: -83.93 },
    claim: 'The most violent tornado outbreak ever recorded.',
    fact: 'Between 3 and 4 April 1974, 148 tornadoes touched down in about eighteen hours across thirteen states. Thirty of them were violent, which is more than most whole years produce.',
    season: 'April',
    year: 1974,
  },
];

const BY_ID = new Map(STORM_LEGENDS.map((legend) => [legend.id, legend]));

export function findLegend(id: string | undefined): StormLegend | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** Human label for the three categories, used on cards and callouts. */
export function describeLegendKind(kind: StormLegend['kind']): string {
  switch (kind) {
    case 'hotspot':
      return 'Storm hotspot';
    case 'record':
      return 'World record';
    case 'event':
      return 'Historic storm';
    default:
      // Still a compile error if the kind union grows: `kind` is `never` here
      // only while the cases above cover it. At runtime a legend stored under
      // a kind this build no longer knows still gets a label, because callers
      // lowercase this string and undefined would throw.
      assertNever(kind);
      return 'Storm lore';
  }
}

const EARTH_RADIUS_KM = 6371;

/**
 * Great circle distance in kilometres.
 *
 * Haversine rather than a flat projection: these pins are usually thousands of
 * kilometres from the viewer and often on the far side of the antimeridian,
 * where subtracting longitudes gives a nonsense answer.
 */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export interface LegendDistance {
  legend: StormLegend;
  distanceKm: number;
}

/** The closest legend to a position. Null only when given an empty set. */
export function nearestLegend(
  origin: Coordinates,
  legends: StormLegend[] = STORM_LEGENDS,
): LegendDistance | null {
  let best: LegendDistance | null = null;

  for (const legend of legends) {
    const distanceKm = haversineKm(origin, legend.coordinates);
    if (!best || distanceKm < best.distanceKm) best = { legend, distanceKm };
  }

  return best;
}

/**
 * The legend on show today.
 *
 * Deterministic on the calendar date rather than random, so the fact does not
 * reshuffle on every render and a screenshot taken twice in a minute shows the
 * same thing. It advances at local midnight.
 */
export function legendOfTheDay(
  date: Date = new Date(),
  legends: StormLegend[] = STORM_LEGENDS,
): StormLegend | null {
  if (!legends.length) return null;

  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );

  const index = ((dayNumber % legends.length) + legends.length) % legends.length;
  return legends[index] as StormLegend;
}

/** Distance for display: metres are noise at this range, so kilometres only. */
export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km)) return '--';
  if (km < 10) return `${km.toFixed(1)} km`;
  if (km < 1000) return `${Math.round(km)} km`;
  return `${Math.round(km).toLocaleString('en-GB')} km`;
}
