import {
  STORM_LEGENDS,
  type StormLegend,
  describeLegendKind,
  findLegend,
  formatDistanceKm,
  haversineKm,
  legendOfTheDay,
  nearestLegend,
} from '@/features/storms/model/legends';
import { describeStormType, iconForStormType } from '@/features/storms/model/stormTypes';
import { WEATHER_ICON_NAMES } from '@/core/icons/names';
import { assertNever } from '@/core/utils/exhaustive';

const TORONTO = { latitude: 43.6532, longitude: -79.3832 };

describe('STORM_LEGENDS', () => {
  it('carries unique ids, so findLegend and the map keys stay unambiguous', () => {
    const ids = STORM_LEGENDS.map((legend) => legend.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('plots on the globe, not past it', () => {
    for (const legend of STORM_LEGENDS) {
      expect(legend.coordinates.latitude).toBeGreaterThanOrEqual(-90);
      expect(legend.coordinates.latitude).toBeLessThanOrEqual(90);
      expect(legend.coordinates.longitude).toBeGreaterThanOrEqual(-180);
      expect(legend.coordinates.longitude).toBeLessThanOrEqual(180);
    }
  });

  it('spans more than one continent, which is the whole point of the layer', () => {
    const northern = STORM_LEGENDS.filter((l) => l.coordinates.latitude > 0);
    const southern = STORM_LEGENDS.filter((l) => l.coordinates.latitude < 0);
    const eastern = STORM_LEGENDS.filter((l) => l.coordinates.longitude > 0);
    const western = STORM_LEGENDS.filter((l) => l.coordinates.longitude < 0);

    for (const quadrant of [northern, southern, eastern, western]) {
      expect(quadrant.length).toBeGreaterThan(1);
    }
  });

  it('uses storm types the app can describe and draw', () => {
    for (const legend of STORM_LEGENDS) {
      expect(describeStormType(legend.stormType).id).toBe(legend.stormType);
      expect(WEATHER_ICON_NAMES).toContain(iconForStormType(legend.stormType));
    }
  });

  it('gives every entry the copy the UI reads', () => {
    for (const legend of STORM_LEGENDS) {
      expect(legend.name.length).toBeGreaterThan(0);
      expect(legend.place.length).toBeGreaterThan(0);
      expect(legend.season.length).toBeGreaterThan(0);
      // Callouts truncate: a claim that runs long is a claim nobody reads.
      expect(legend.claim.length).toBeLessThanOrEqual(90);
      expect(legend.fact.length).toBeGreaterThan(40);
    }
  });

  it('dates every historic event, because an undated one is just a rumour', () => {
    for (const legend of STORM_LEGENDS.filter((l) => l.kind === 'event')) {
      expect(legend.year).toBeDefined();
      expect(legend.year).toBeGreaterThan(1800);
      expect(legend.year).toBeLessThanOrEqual(new Date().getFullYear());
    }
  });

  it('names every kind', () => {
    for (const legend of STORM_LEGENDS) {
      expect(describeLegendKind(legend.kind).length).toBeGreaterThan(0);
    }
  });
});

describe('findLegend', () => {
  it('resolves a known id', () => {
    expect(findLegend('catatumbo')?.place).toContain('Venezuela');
  });

  it('is undefined for an unknown or missing id rather than throwing', () => {
    expect(findLegend('nope')).toBeUndefined();
    expect(findLegend(undefined)).toBeUndefined();
  });
});

describe('haversineKm', () => {
  it('is zero for a point against itself', () => {
    expect(haversineKm(TORONTO, TORONTO)).toBeCloseTo(0, 6);
  });

  it('matches a known great circle distance', () => {
    // Toronto to Sydney, roughly 15,550 km.
    const sydney = { latitude: -33.8688, longitude: 151.2093 };
    expect(haversineKm(TORONTO, sydney)).toBeGreaterThan(15_300);
    expect(haversineKm(TORONTO, sydney)).toBeLessThan(15_800);
  });

  it('measures across the antimeridian the short way', () => {
    const west = { latitude: 0, longitude: -179.5 };
    const east = { latitude: 0, longitude: 179.5 };

    // A flat longitude subtraction would give roughly 39,000 km here.
    expect(haversineKm(west, east)).toBeLessThan(150);
  });

  it('is symmetric', () => {
    const a = STORM_LEGENDS[0]!.coordinates;
    const b = STORM_LEGENDS[5]!.coordinates;
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});

describe('nearestLegend', () => {
  it('picks the genuinely closest entry', () => {
    const result = nearestLegend(TORONTO);
    expect(result).not.toBeNull();

    const shortest = Math.min(
      ...STORM_LEGENDS.map((legend) => haversineKm(TORONTO, legend.coordinates)),
    );
    expect(result?.distanceKm).toBeCloseTo(shortest, 6);
  });

  it('answers differently from two different places', () => {
    const fromCanada = nearestLegend(TORONTO);
    const fromJava = nearestLegend({ latitude: -6.2, longitude: 106.8 });

    expect(fromCanada?.legend.id).not.toBe(fromJava?.legend.id);
    expect(fromJava?.legend.id).toBe('bogor');
  });

  it('is null only when there is nothing to search', () => {
    expect(nearestLegend(TORONTO, [])).toBeNull();
  });
});

describe('legendOfTheDay', () => {
  it('is stable within a calendar day', () => {
    const morning = legendOfTheDay(new Date(2026, 4, 1, 7, 15));
    const evening = legendOfTheDay(new Date(2026, 4, 1, 23, 45));

    expect(morning?.id).toBe(evening?.id);
  });

  it('moves on the next day', () => {
    const today = legendOfTheDay(new Date(2026, 4, 1));
    const tomorrow = legendOfTheDay(new Date(2026, 4, 2));

    expect(today?.id).not.toBe(tomorrow?.id);
  });

  it('covers the whole set over a full cycle rather than favouring a few', () => {
    const seen = new Set<string>();

    for (let day = 0; day < STORM_LEGENDS.length; day += 1) {
      const legend = legendOfTheDay(new Date(2026, 0, 1 + day));
      if (legend) seen.add(legend.id);
    }

    expect(seen.size).toBe(STORM_LEGENDS.length);
  });

  it('handles dates before the epoch without a negative index', () => {
    expect(legendOfTheDay(new Date(1965, 2, 14))).not.toBeNull();
  });

  it('is null for an empty set', () => {
    expect(legendOfTheDay(new Date(), [])).toBeNull();
  });
});

describe('formatDistanceKm', () => {
  it('keeps one decimal only when close enough for it to mean something', () => {
    expect(formatDistanceKm(4.25)).toBe('4.3 km');
    expect(formatDistanceKm(128.4)).toBe('128 km');
  });

  it('groups thousands, because five bare digits are unreadable', () => {
    expect(formatDistanceKm(15_550.2)).toBe('15,550 km');
  });

  it('degrades rather than printing NaN', () => {
    expect(formatDistanceKm(Number.NaN)).toBe('--');
    expect(formatDistanceKm(Number.POSITIVE_INFINITY)).toBe('--');
  });
});

describe('describeLegendKind', () => {
  it('reads as a label a person would accept, not as an enum', () => {
    expect(describeLegendKind('hotspot')).toBe('Storm hotspot');
    expect(describeLegendKind('record')).toBe('World record');
    expect(describeLegendKind('event')).toBe('Historic storm');
  });

  it('is exercised by real data for all three kinds', () => {
    const kinds = new Set(STORM_LEGENDS.map((legend) => legend.kind));
    expect(kinds).toEqual(new Set(['hotspot', 'record', 'event']));
  });

  it('lowercases cleanly for the lore card subtitle', () => {
    expect(describeLegendKind('record').toLowerCase()).toBe('world record');
  });
});

describe('formatDistanceKm boundaries', () => {
  it('switches off the decimal at exactly 10 km', () => {
    expect(formatDistanceKm(9.99)).toBe('10.0 km');
    expect(formatDistanceKm(10)).toBe('10 km');
  });

  it('starts grouping at exactly 1000 km', () => {
    expect(formatDistanceKm(999.4)).toBe('999 km');
    expect(formatDistanceKm(1000)).toBe('1,000 km');
  });

  it('handles standing on the pin', () => {
    expect(formatDistanceKm(0)).toBe('0.0 km');
  });

  it('degrades on negative infinity too, not just NaN', () => {
    expect(formatDistanceKm(Number.NEGATIVE_INFINITY)).toBe('--');
  });
});

describe('haversineKm extremes', () => {
  it('clamps at the antipode instead of returning NaN from a rounding overshoot', () => {
    const north = { latitude: 90, longitude: 0 };
    const south = { latitude: -90, longitude: 0 };
    const half = haversineKm(north, south);

    expect(Number.isFinite(half)).toBe(true);
    // Half the great circle: roughly 20,015 km.
    expect(half).toBeGreaterThan(19_900);
    expect(half).toBeLessThan(20_100);
  });

  it('is finite for every legend measured from every other', () => {
    for (const a of STORM_LEGENDS) {
      for (const b of STORM_LEGENDS) {
        expect(Number.isFinite(haversineKm(a.coordinates, b.coordinates))).toBe(true);
      }
    }
  });
});

describe('nearestLegend ties and single sets', () => {
  it('keeps the first entry when two are equally close, rather than flickering', () => {
    const origin = { latitude: 0, longitude: 0 };
    const west = { ...STORM_LEGENDS[0]!, id: 'west', coordinates: { latitude: 0, longitude: -5 } };
    const east = { ...STORM_LEGENDS[0]!, id: 'east', coordinates: { latitude: 0, longitude: 5 } };

    expect(nearestLegend(origin, [west, east])?.legend.id).toBe('west');
    expect(nearestLegend(origin, [east, west])?.legend.id).toBe('east');
  });

  it('returns the only candidate when given a set of one', () => {
    const only = STORM_LEGENDS[3]!;
    const result = nearestLegend(TORONTO, [only]);

    expect(result?.legend.id).toBe(only.id);
    expect(result?.distanceKm).toBeCloseTo(haversineKm(TORONTO, only.coordinates), 6);
  });

  it('reports a distance that matches the legend it picked', () => {
    const result = nearestLegend(TORONTO);
    expect(result?.distanceKm).toBeCloseTo(
      haversineKm(TORONTO, result!.legend.coordinates),
      6,
    );
  });
});

describe('legendOfTheDay defaults', () => {
  it('needs no arguments on the conditions screen', () => {
    const legend = legendOfTheDay();
    expect(legend).not.toBeNull();
    expect(STORM_LEGENDS.map((l) => l.id)).toContain(legend!.id);
  });

  it('returns the single entry every day when given a set of one', () => {
    const only = STORM_LEGENDS[2]!;
    expect(legendOfTheDay(new Date(2026, 0, 1), [only])?.id).toBe(only.id);
    expect(legendOfTheDay(new Date(2026, 6, 17), [only])?.id).toBe(only.id);
  });

  it('wraps without a gap across a year boundary', () => {
    const newYearsEve = legendOfTheDay(new Date(2025, 11, 31));
    const newYearsDay = legendOfTheDay(new Date(2026, 0, 1));

    expect(newYearsEve).not.toBeNull();
    expect(newYearsDay).not.toBeNull();
    expect(newYearsEve!.id).not.toBe(newYearsDay!.id);
  });

  it('is unaffected by the clock time the screen happened to render at', () => {
    const justAfterMidnight = legendOfTheDay(new Date(2026, 4, 1, 0, 0, 1));
    const justBeforeMidnight = legendOfTheDay(new Date(2026, 4, 1, 23, 59, 59));

    expect(justAfterMidnight!.id).toBe(justBeforeMidnight!.id);
  });
});

describe('STORM_LEGENDS record entries', () => {
  it('dates a record whenever it claims a specific measurement year', () => {
    for (const legend of STORM_LEGENDS.filter((l) => l.kind === 'record' && l.year)) {
      expect(legend.year).toBeGreaterThan(1800);
      expect(legend.year).toBeLessThanOrEqual(new Date().getFullYear());
    }
  });

  it('names each entry distinctly, so two pins never read the same', () => {
    const names = STORM_LEGENDS.map((legend) => legend.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('writes a claim that ends as a sentence, since the callout shows it raw', () => {
    for (const legend of STORM_LEGENDS) {
      expect(legend.claim.trim()).toMatch(/[.!?]$/);
    }
  });
});

/**
 * `describeLegendKind` grew a `default` branch in this change. It exists for a
 * legend persisted under a kind this build no longer knows: the lore card
 * lowercases the returned string for its subtitle, so `undefined` there is a
 * crash on a screen the user deep-linked into.
 */
describe('describeLegendKind fallback', () => {
  const stale = describeLegendKind('folklore' as StormLegend['kind']);

  it('labels a kind outside the union rather than returning undefined', () => {
    expect(stale).toBe('Storm lore');
  });

  it('never throws on a kind outside the union', () => {
    expect(() => describeLegendKind('folklore' as StormLegend['kind'])).not.toThrow();
  });

  it('stays safe for the subtitle, which lowercases whatever it is given', () => {
    expect(stale.toLowerCase()).toBe('storm lore');
  });

  it('does not collide with any of the three real labels', () => {
    const real = (['hotspot', 'record', 'event'] as const).map(describeLegendKind);

    expect(real).not.toContain(stale);
  });
});

/**
 * The compile-time exhaustiveness helper both `describeLegendKind` and
 * `iconForStormType` now call in their default branch. The whole point is that
 * it does nothing at runtime: if it threw, every fallback above would become
 * the crash it was added to prevent.
 */
describe('assertNever', () => {
  it('does not throw on a value smuggled past the types', () => {
    expect(() => assertNever('folklore' as never)).not.toThrow();
  });

  it('returns nothing, so the fallback on the next line still runs', () => {
    expect(assertNever('folklore' as never)).toBeUndefined();
  });
});
