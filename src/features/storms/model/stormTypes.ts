import type { WeatherIconName } from '@/core/icons/names';
import type { ChaseLevel } from '@/features/weather/model/types';
import { assertNever } from '@/core/utils/exhaustive';

import type { StormTypeId } from './types';

export interface StormTypeDefinition {
  id: StormTypeId;
  label: string;
  /** Severity tier drives pin colour on the map and the accent on the card. */
  tier: 'severe' | 'notable' | 'routine';
}

export const STORM_TYPES: StormTypeDefinition[] = [
  { id: 'tornado', label: 'Tornado', tier: 'severe' },
  { id: 'funnel_cloud', label: 'Funnel cloud', tier: 'severe' },
  { id: 'supercell', label: 'Supercell', tier: 'severe' },
  { id: 'wall_cloud', label: 'Wall cloud', tier: 'notable' },
  { id: 'shelf_cloud', label: 'Shelf cloud', tier: 'notable' },
  { id: 'squall_line', label: 'Squall line', tier: 'notable' },
  { id: 'hail', label: 'Hail', tier: 'notable' },
  { id: 'lightning', label: 'Lightning', tier: 'notable' },
  { id: 'flooding', label: 'Flooding', tier: 'severe' },
  { id: 'dust_storm', label: 'Dust storm', tier: 'notable' },
  { id: 'snow_squall', label: 'Snow squall', tier: 'notable' },
  { id: 'other', label: 'Other', tier: 'routine' },
];

const BY_ID = new Map(STORM_TYPES.map((type) => [type.id, type]));

export function describeStormType(id: StormTypeId): StormTypeDefinition {
  return BY_ID.get(id) ?? { id: 'other', label: 'Other', tier: 'routine' };
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
