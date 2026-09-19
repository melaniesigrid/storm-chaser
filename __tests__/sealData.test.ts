import { STORM_TYPES } from '@/features/storms/model/stormTypes';
import type { CapturedConditions, StormReport } from '@/features/storms/model/types';
import { sealData } from '@/features/storms/seal/sealData';
import { fnv1a, sealSerial } from '@/features/storms/seal/sealSerial';
import {
  describeSealTemplate,
  SEAL_TEMPLATES,
  type SealTemplateId,
} from '@/features/storms/seal/sealTemplates';

const conditions: CapturedConditions = {
  temperatureC: 22.4,
  windSpeedKmh: 61,
  windGustKmh: 94,
  windDirectionDeg: 247,
  pressureHpa: 998.2,
  humidityPct: 81,
  precipitationMm: 14.2,
  conditionLabel: 'Thunderstorm with hail',
  conditionCode: 96,
  capeJkg: 2840,
  chaseScore: 94.4,
};

function report(overrides: Partial<StormReport> = {}): StormReport {
  return {
    id: 'storm_m1x2y3_abcd1234',
    photoUri: 'file:///documents/storm-photos/storm_m1x2y3_abcd1234.jpg',
    photoSource: 'camera',
    // Local time, so the date and hour below are not timezone-dependent.
    capturedAt: new Date(2026, 8, 19, 16, 42).toISOString(),
    coordinates: { latitude: 49.2827, longitude: -123.1207 },
    locationAccuracyM: 6.4,
    stormType: 'tornado',
    notes: '',
    conditions,
    syncState: 'local',
    createdAt: new Date(2026, 8, 19, 16, 42).toISOString(),
    updatedAt: new Date(2026, 8, 19, 16, 42).toISOString(),
    ...overrides,
  };
}

const TEMPLATE_IDS = SEAL_TEMPLATES.map((template) => template.id);

describe('sealSerial', () => {
  it('is stable for the same id', () => {
    expect(sealSerial('storm_a_b')).toBe(sealSerial('storm_a_b'));
  });

  it('is always eight uppercase hex digits', () => {
    // Includes ids that hash to small numbers, which is where a missing
    // padStart would silently produce a shorter serial.
    for (const id of ['', 'a', 'storm_m1x2y3_abcd1234', 'x'.repeat(200)]) {
      expect(sealSerial(id)).toMatch(/^[0-9A-F]{8}$/);
    }
  });

  it('separates ids that differ by one character', () => {
    expect(sealSerial('storm_aaaa_0001')).not.toBe(sealSerial('storm_aaaa_0002'));
  });

  it('does not collide across a realistically large log', () => {
    // This test is why the serial is the whole 32-bit hash rather than the
    // six hex digits the design first specified. Truncated to 24 bits, these
    // same two thousand ids collided -- the birthday bound doing its job
    // around 2^12 for a 2^24 space. Two reports claiming the same serial is
    // worse on a collectible than two extra glyphs on the stamp.
    const serials = new Set<string>();
    for (let i = 0; i < 2000; i += 1) {
      serials.add(sealSerial(`storm_m${i.toString(36)}_${(i * 7919).toString(36)}`));
    }
    expect(serials.size).toBe(2000);
  });

  it('stays inside 32 bits', () => {
    // A plain `*` instead of Math.imul overflows into float territory and the
    // hash stops being FNV. This is the assertion that catches that.
    for (const id of ['storm', 'storm_m1x2y3_abcd1234', 'zzzzzzzzzzzzzzzz']) {
      const hash = fnv1a(id);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('sealData', () => {
  it('prints the classification in upper case and carries the tier', () => {
    const data = sealData(report(), 'field-card');
    expect(data.classification).toBe('TORNADO');
    expect(data.tier).toBe('severe');
    expect(data.level).toBe('severe');
  });

  it('formats the ring coordinates without a space before the hemisphere', () => {
    // formatCoordinates emits `49.2827° N, 123.1207° W`, four glyphs wider,
    // against an arc that only just fits. The ring has its own formatter.
    const data = sealData(report(), 'wax');
    expect(data.ringCoordinates).toBe('49.2827°N · 123.1207°W');
  });

  it('never prints both a minus sign and a hemisphere letter', () => {
    const data = sealData(
      report({ coordinates: { latitude: -33.8688, longitude: 151.2093 } }),
      'wax',
    );
    expect(data.ringCoordinates).toBe('33.8688°S · 151.2093°E');
    expect(data.ringCoordinates).not.toContain('-');
  });

  it('splits the timestamp so the ring and the card can differ', () => {
    const data = sealData(report(), 'field-card');
    expect(data.date).toBe('19 SEP 2026');
    expect(data.time).toBe('16:42');
  });

  it('pads the day and hour so the ring arc length is stable', () => {
    const data = sealData(
      report({ capturedAt: new Date(2026, 0, 5, 9, 7).toISOString() }),
      'wax',
    );
    expect(data.date).toBe('05 JAN 2026');
    expect(data.time).toBe('09:07');
  });

  it('survives an unparseable timestamp rather than rendering NaN', () => {
    const data = sealData(report({ capturedAt: 'not a date' }), 'field-card');
    expect(data.date).toBe('UNKNOWN DATE');
    expect(data.time).toBe('--:--');
  });

  it('prints the eight Field Card instruments in template order', () => {
    const data = sealData(report(), 'field-card');
    expect(data.fields.map((field) => field.id)).toEqual([
      'temperature', 'wind', 'gust', 'direction',
      'pressure', 'humidity', 'cape', 'precipitation',
    ]);
    expect(data.fields.map((field) => field.value)).toEqual([
      '22°', '61 km/h', '94 km/h', 'WSW 247°',
      '998 hPa', '81%', '2840', '14.2 mm',
    ]);
  });

  it('prints only the four a chaser would quote on the collectible', () => {
    const data = sealData(report(), 'collectible');
    expect(data.fields.map((field) => field.id)).toEqual([
      'gust', 'pressure', 'cape', 'humidity',
    ]);
  });

  it('prints no instrument rows on the wax seal', () => {
    expect(sealData(report(), 'wax').fields).toEqual([]);
  });

  it('rounds the chase score rather than printing a fraction', () => {
    expect(sealData(report(), 'field-card').chaseScore).toBe(94);
  });
});

describe('sealData with missing readings', () => {
  it('reports absent coordinates as null, not as a dash', () => {
    const data = sealData(
      report({ coordinates: null, locationAccuracyM: null }),
      'field-card',
    );
    expect(data.ringCoordinates).toBeNull();
    expect(data.cardCoordinates).toBeNull();
    expect(data.accuracy).toBeNull();
    expect(data.hasCoordinates).toBe(false);
  });

  it('drops every instrument row when no conditions were captured', () => {
    // The common case: a photo filed with location or network unavailable.
    // A seal that printed zeroes here would be publishing a false reading.
    const data = sealData(report({ conditions: null }), 'field-card');
    expect(data.fields).toEqual([]);
    expect(data.chaseScore).toBeNull();
    expect(data.conditionLabel).toBeNull();
    expect(data.hasConditions).toBe(false);
  });

  it('nulls a missing CAPE without nulling the readings beside it', () => {
    const data = sealData(
      report({ conditions: { ...conditions, capeJkg: null } }),
      'field-card',
    );
    const byId = new Map(data.fields.map((field) => [field.id, field.value]));
    expect(byId.get('cape')).toBeNull();
    expect(byId.get('pressure')).toBe('998 hPa');
  });

  it('never emits the app-internal "--" placeholder onto a seal', () => {
    // '--' is right inside the app's own panels and wrong on something
    // someone is about to post. The layout needs null so it can drop the row.
    const data = sealData(
      report({
        conditions: { ...conditions, windGustKmh: Number.NaN, humidityPct: Number.NaN },
      }),
      'field-card',
    );
    for (const field of data.fields) {
      expect(field.value).not.toBe('--');
    }
    const byId = new Map(data.fields.map((field) => [field.id, field.value]));
    expect(byId.get('gust')).toBeNull();
    expect(byId.get('humidity')).toBeNull();
  });
});

describe('sealData provenance', () => {
  it('marks a library import', () => {
    expect(sealData(report({ photoSource: 'library' }), 'field-card').filedFromLibrary).toBe(true);
  });

  it('does not mark a camera capture', () => {
    expect(sealData(report(), 'field-card').filedFromLibrary).toBe(false);
  });
});

describe('sealTemplates', () => {
  it('falls back to Field Card for an id this build does not know', () => {
    // A template persisted by a later build must not render as undefined.
    expect(describeSealTemplate('nimbus' as SealTemplateId).id).toBe('field-card');
  });

  it('only names fields the data layer can actually produce', () => {
    const data = sealData(report(), 'field-card');
    const produced = new Set(data.fields.map((field) => field.id));
    for (const field of describeSealTemplate('field-card').fields) {
      expect(produced.has(field)).toBe(true);
    }
  });
});

describe('every storm type on every template', () => {
  // 12 types x 3 templates = 36. NOT 12 x 3 tiers: tier is a fixed property
  // of each STORM_TYPES entry, so only 12 type/tier pairs are reachable and a
  // 36-cell grid built on that number would have 24 unreachable cells.
  const combinations = STORM_TYPES.flatMap((type) =>
    TEMPLATE_IDS.map((templateId) => [type.id, templateId] as const),
  );

  it('spans 36 combinations', () => {
    expect(combinations).toHaveLength(36);
  });

  it.each(combinations)('renders %s on %s', (stormType, templateId) => {
    const data = sealData(report({ stormType }), templateId);

    expect(data.classification).toBe(
      STORM_TYPES.find((type) => type.id === stormType)!.label.toUpperCase(),
    );
    expect(data.serial).toMatch(/^[0-9A-F]{8}$/);
    expect(data.fields).toHaveLength(describeSealTemplate(templateId).fields.length);
    // Nothing a seal prints may be undefined, NaN, or the string "undefined".
    for (const field of data.fields) {
      expect(field.value === null || /^[^u].*/.test(field.value)).toBe(true);
      expect(String(field.value)).not.toContain('NaN');
    }
  });

  it.each(combinations)('renders %s on %s with nothing captured', (stormType, templateId) => {
    const data = sealData(
      report({ stormType, conditions: null, coordinates: null, locationAccuracyM: null }),
      templateId,
    );
    expect(data.classification).toBeTruthy();
    expect(data.date).toBe('19 SEP 2026');
    expect(data.fields).toEqual([]);
  });
});

describe('sealData is pure', () => {
  it('returns the same data for the same report', () => {
    expect(sealData(report(), 'collectible')).toEqual(sealData(report(), 'collectible'));
  });

  it('takes an injected serial rather than reaching for the log', () => {
    // Log position would have been the obvious serial and is unstable under
    // deletion. The caller supplies it so the transform stays pure.
    expect(sealData(report(), 'collectible', { serial: 'ABC123' }).serial).toBe('ABC123');
  });

  it('does not mutate the report it is given', () => {
    const subject = report();
    const snapshot = JSON.parse(JSON.stringify(subject));
    sealData(subject, 'field-card');
    expect(subject).toEqual(snapshot);
  });
});
