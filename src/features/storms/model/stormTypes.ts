import type { WeatherIconName } from '@/core/icons/names';
import type { ChaseLevel } from '@/features/weather/model/types';
import { assertNever } from '@/core/utils/exhaustive';

import type { StormTypeId } from './types';

export interface StormTypeDefinition {
  id: StormTypeId;
  label: string;
  /** Severity tier drives pin colour on the map and the accent on the card. */
  tier: 'severe' | 'notable' | 'routine';
  /**
   * One sentence on how to recognise this from the ground, shown when the
   * classification is selected.
   *
   * Twelve labels are not self-explanatory to someone learning the sky, and a
   * wall cloud misfiled as a shelf cloud is a wrong record rather than an
   * untidy one. Written as what you would see, not as a glossary definition.
   */
  description: string;
}

export const STORM_TYPES: StormTypeDefinition[] = [
  {
    id: 'tornado',
    label: 'Tornado',
    tier: 'severe',
    description:
      'A rotating column of air in contact with both the cloud base and the ground. Debris being lifted at the surface is the confirmation; a funnel alone is not.',
  },
  {
    id: 'funnel_cloud',
    label: 'Funnel cloud',
    tier: 'severe',
    description:
      'The same rotation, visible as a tapering cone below the cloud, but not yet reaching the ground. Worth logging: it is often the minute before a tornado.',
  },
  {
    id: 'supercell',
    label: 'Supercell',
    tier: 'severe',
    description:
      'A single long-lived thunderstorm built around one rotating updraught. Seen side-on it has a hard, sculpted, often striated tower leaning over a rain-free base.',
  },
  {
    id: 'wall_cloud',
    label: 'Wall cloud',
    tier: 'notable',
    description:
      'A lowering that hangs beneath the rain-free base, where the updraught is strongest. If it is rotating and persistent, it is the part of the storm a tornado comes from.',
  },
  {
    id: 'shelf_cloud',
    label: 'Shelf cloud',
    tier: 'notable',
    description:
      'A low wedge attached to the front of the storm, rolling towards you ahead of the rain. It marks outflow — cold air spreading out — so the wind hits as it passes overhead.',
  },
  {
    id: 'squall_line',
    label: 'Squall line',
    tier: 'notable',
    description:
      'A long, more or less unbroken band of storms advancing together, often hundreds of kilometres end to end. The threat is straight-line wind along its leading edge.',
  },
  {
    id: 'hail',
    label: 'Hail',
    tier: 'notable',
    description:
      'Ice falling from the storm. Log the largest stone you can measure against something known — a coin, a ball — since size is what makes the report useful to anyone else.',
  },
  {
    id: 'lightning',
    label: 'Lightning',
    tier: 'notable',
    description:
      'Cloud-to-ground or cloud-to-cloud discharge. If you can hear thunder you are within range of being struck, so this is a classification to photograph from shelter.',
  },
  {
    id: 'flooding',
    label: 'Flooding',
    tier: 'severe',
    description:
      'Water over ground that is normally dry — roads, fields, drains backing up. Flash flooding kills more chasers than tornadoes do, and moving water hides what it has removed.',
  },
  {
    id: 'dust_storm',
    label: 'Dust storm',
    tier: 'notable',
    description:
      'A wall of lifted dust or sand driven by storm outflow, sometimes kilometres wide. Visibility can go from clear to nothing in under a minute.',
  },
  {
    id: 'snow_squall',
    label: 'Snow squall',
    tier: 'notable',
    description:
      'A short, violent burst of heavy snow and wind under an otherwise moving system. Brief, intense, and the winter cause of motorway pile-ups.',
  },
  {
    id: 'other',
    label: 'Other',
    tier: 'routine',
    description:
      'Anything the list above does not cover, or a sky you cannot confidently name. Describe what you saw in the field notes rather than forcing a classification.',
  },
];

const BY_ID = new Map(STORM_TYPES.map((type) => [type.id, type]));

/** The fallback for an unknown id, taken from the table rather than restated. */
const OTHER: StormTypeDefinition =
  BY_ID.get('other') ?? STORM_TYPES[STORM_TYPES.length - 1]!;

export function describeStormType(id: StormTypeId): StormTypeDefinition {
  return BY_ID.get(id) ?? OTHER;
}

/**
 * Folds the three storm-type tiers onto the five-level chase ladder.
 *
 * The app used to carry two unrelated colour schemes: this three-tier one for
 * map pins and a separate one for the chase index, which also collapsed severe
 * and extreme onto the same red. Routing both through `ChaseLevel` means a
 * colour means the same thing wherever it appears, and a theme only has to
 * define one ladder.
 */
export function chaseLevelForTier(tier: StormTypeDefinition['tier']): ChaseLevel {
  switch (tier) {
    case 'severe':
      return 'severe';
    case 'notable':
      return 'active';
    case 'routine':
      return 'unsettled';
  }
}

/**
 * Meteocons icon for a storm classification.
 *
 * Imports the string union, never an SVG, so it stays testable without a
 * bundler, exactly like `iconForCondition`. Where the icon set has nothing
 * literal — there is no shelf cloud glyph — it falls back to the nearest
 * honest thing rather than to `not-available`, which reads as a bug.
 */
export function iconForStormType(id: StormTypeId): WeatherIconName {
  switch (id) {
    case 'tornado':
    case 'funnel_cloud':
      return 'tornado';
    case 'supercell':
    case 'lightning':
      return 'thunderstorms-extreme-rain';
    case 'squall_line':
    case 'wall_cloud':
      return 'thunderstorms-day-rain';
    case 'shelf_cloud':
      return 'overcast-day';
    case 'hail':
      return 'hail';
    case 'flooding':
      return 'raindrops';
    case 'dust_storm':
      return 'windsock';
    case 'snow_squall':
      return 'snow';
    case 'other':
      return 'code-yellow';
    default:
      // Still a compile error if StormTypeId gains a member: `id` is `never`
      // here only while the cases above cover the union. At runtime a report
      // persisted under a type this build no longer knows falls back to the
      // same honest glyph as `other`, never to an undefined icon name.
      assertNever(id);
      return 'code-yellow';
  }
}
