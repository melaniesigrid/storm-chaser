import { WEATHER_ICON_NAMES } from '@/core/icons/names';
import {
  STORM_TYPES,
  chaseLevelForTier,
  describeStormType,
  iconForStormType,
} from '@/features/storms/model/stormTypes';
import type { StormTypeId } from '@/features/storms/model/types';

/** Every member of the StormTypeId union, listed by hand so a new one fails here. */
const ALL_IDS: StormTypeId[] = [
  'supercell',
  'tornado',
  'funnel_cloud',
  'wall_cloud',
  'shelf_cloud',
  'squall_line',
  'hail',
  'lightning',
  'flooding',
  'dust_storm',
  'snow_squall',
  'other',
];

describe('STORM_TYPES', () => {
  it('carries one entry per storm type id, with no duplicates', () => {
    const ids = STORM_TYPES.map((type) => type.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(ALL_IDS));
  });

  it('labels every entry', () => {
    for (const type of STORM_TYPES) {
      expect(type.label.length).toBeGreaterThan(0);
    }
  });
});

describe('describeStormType', () => {
  it('resolves every known id to its own definition', () => {
    for (const id of ALL_IDS) {
      expect(describeStormType(id).id).toBe(id);
    }
  });

  it('tiers the three severe types as severe', () => {
    expect(describeStormType('tornado').tier).toBe('severe');
    expect(describeStormType('supercell').tier).toBe('severe');
    expect(describeStormType('flooding').tier).toBe('severe');
  });

  it('falls back to Other rather than returning undefined for a stored id it no longer knows', () => {
    const stale = describeStormType('gustnado' as StormTypeId);
    expect(stale.id).toBe('other');
    expect(stale.label).toBe('Other');
    expect(stale.tier).toBe('routine');
  });
});

describe('chaseLevelForTier', () => {
  it('folds each tier onto the shared chase ladder', () => {
    expect(chaseLevelForTier('severe')).toBe('severe');
    expect(chaseLevelForTier('notable')).toBe('active');
    expect(chaseLevelForTier('routine')).toBe('unsettled');
  });

  it('gives every catalogued type a colour the theme can resolve', () => {
    for (const type of STORM_TYPES) {
      expect(['dormant', 'unsettled', 'active', 'severe', 'extreme']).toContain(
        chaseLevelForTier(type.tier),
      );
    }
  });
});

describe('iconForStormType', () => {
  it('returns a bundled icon for every storm type', () => {
    for (const id of ALL_IDS) {
      expect(WEATHER_ICON_NAMES).toContain(iconForStormType(id));
    }
  });

  it('never falls through to not-available, which reads as a bug on a pin', () => {
    for (const id of ALL_IDS) {
      expect(iconForStormType(id)).not.toBe('not-available');
    }
  });

  it('maps each branch to the icon the map and lore card expect', () => {
    expect(iconForStormType('tornado')).toBe('tornado');
    expect(iconForStormType('funnel_cloud')).toBe('tornado');
    expect(iconForStormType('supercell')).toBe('thunderstorms-extreme-rain');
    expect(iconForStormType('lightning')).toBe('thunderstorms-extreme-rain');
    expect(iconForStormType('squall_line')).toBe('thunderstorms-day-rain');
    expect(iconForStormType('wall_cloud')).toBe('thunderstorms-day-rain');
    expect(iconForStormType('shelf_cloud')).toBe('overcast-day');
    expect(iconForStormType('hail')).toBe('hail');
    expect(iconForStormType('flooding')).toBe('raindrops');
    expect(iconForStormType('dust_storm')).toBe('windsock');
    expect(iconForStormType('snow_squall')).toBe('snow');
    expect(iconForStormType('other')).toBe('code-yellow');
  });

  it('never shows a night icon, since a pin has no time of day', () => {
    for (const id of ALL_IDS) {
      expect(iconForStormType(id)).not.toMatch(/-night/);
    }
  });

  it('returns undefined rather than throwing on an id outside the union', () => {
    // The switch is exhaustive over StormTypeId and has no default, so a value
    // smuggled past the types must not crash the map render.
    expect(() => iconForStormType('gustnado' as StormTypeId)).not.toThrow();
    expect(iconForStormType('gustnado' as StormTypeId)).toBeUndefined();
  });
});
