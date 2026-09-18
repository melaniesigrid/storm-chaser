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
