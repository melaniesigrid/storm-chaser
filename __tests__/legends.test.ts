import {
  STORM_LEGENDS,
  describeLegendKind,
  findLegend,
  formatDistanceKm,
  haversineKm,
  legendOfTheDay,
  nearestLegend,
} from '@/features/storms/model/legends';
import { describeStormType, iconForStormType } from '@/features/storms/model/stormTypes';
import { WEATHER_ICON_NAMES } from '@/core/icons/names';

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
