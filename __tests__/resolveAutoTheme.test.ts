import { resolveAutoTheme, sunTimes } from '@/core/theme/resolveAutoTheme';
import { THEME_NAMES } from '@/core/theme/themes';
import type { Coordinates, WeatherConditionGroup } from '@/features/weather/model/types';

/**
 * Auto theme resolution.
 *
 * The sun maths is asserted against real published sunrise and sunset times
 * rather than against whatever this implementation happens to produce. An
 * assertion built from the code under test is not a test -- `dayLabel` shipped
 * a wrong-weekday bug for exactly that reason, and it is not worth repeating
 * one file over.
 *
 * Tolerance is five minutes. Tight enough to catch a sign flip, a
 * degrees-versus-radians slip or a west-positive longitude mix-up, loose enough
 * that a low-order approximation is allowed to be an approximation.
 */

const TORONTO: Coordinates = { latitude: 43.6532, longitude: -79.3832 };
const SYDNEY: Coordinates = { latitude: -33.8688, longitude: 151.2093 };
const TROMSO: Coordinates = { latitude: 69.6492, longitude: 18.9553 };

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function expectWithinFiveMinutes(actualMs: number, expectedIso: string) {
  const expected = Date.parse(expectedIso);
  const drift = Math.abs(actualMs - expected);

  if (drift > FIVE_MINUTES_MS) {
    throw new Error(
      `expected ${new Date(actualMs).toISOString()} to be within 5 minutes of ` +
        `${expectedIso}, but it was ${Math.round(drift / 60000)} minutes out`,
    );
  }
}

function normal(date: Date, coordinates: Coordinates) {
  const times = sunTimes(date, coordinates);
  if (times.kind !== 'normal') {
    throw new Error(`expected a normal sunrise and sunset, got ${times.kind}`);
  }
  return times;
}

describe('sunTimes', () => {
  /**
   * Toronto on the summer solstice: sunrise 05:36 EDT, sunset 21:03 EDT.
   * EDT is UTC-4, so sunset falls on the following UTC date -- which is the
   * reason this module works in absolute instants and never in clock time.
   */
  it('matches published times for a northern city at the summer solstice', () => {
    const { sunriseMs, sunsetMs } = normal(new Date('2026-06-21T12:00:00Z'), TORONTO);

    expectWithinFiveMinutes(sunriseMs, '2026-06-21T09:36:00Z');
    expectWithinFiveMinutes(sunsetMs, '2026-06-22T01:03:00Z');
  });

  it('matches published times for the same city at the winter solstice', () => {
    const { sunriseMs, sunsetMs } = normal(new Date('2026-12-21T12:00:00Z'), TORONTO);

    expectWithinFiveMinutes(sunriseMs, '2026-12-21T12:48:00Z');
    expectWithinFiveMinutes(sunsetMs, '2026-12-21T21:43:00Z');
  });

  /**
   * The southern hemisphere has the seasons the other way round. If the
   * declination sign were wrong, the northern cases above could still pass
   * while this one inverts.
   */
  it('puts the long day in December for a southern city', () => {
    const december = normal(new Date('2026-12-21T02:00:00Z'), SYDNEY);
    const june = normal(new Date('2026-06-21T02:00:00Z'), SYDNEY);

    const decemberLength = december.sunsetMs - december.sunriseMs;
    const juneLength = june.sunsetMs - june.sunriseMs;

    expect(decemberLength).toBeGreaterThan(juneLength);
    expect(decemberLength / (60 * 60 * 1000)).toBeGreaterThan(14);
    expect(juneLength / (60 * 60 * 1000)).toBeLessThan(10);
  });

  it('gives a sunrise before its sunset, every month of the year', () => {
    for (let month = 0; month < 12; month++) {
      const times = normal(new Date(Date.UTC(2026, month, 15, 12)), TORONTO);
      expect(times.sunriseMs).toBeLessThan(times.sunsetMs);
    }
  });

  /**
   * Above the Arctic circle the hour-angle equation has no solution for weeks
   * at a time. These used to be the NaN that fell out of the bottom of the
   * function; they are named cases instead.
   */
  it('names polar day above the Arctic circle in midsummer', () => {
    expect(sunTimes(new Date('2026-06-21T12:00:00Z'), TROMSO).kind).toBe('polar-day');
  });

  it('names polar night above the Arctic circle in midwinter', () => {
    expect(sunTimes(new Date('2026-12-21T12:00:00Z'), TROMSO).kind).toBe('polar-night');
  });

  it('still finds a normal sunrise at the same place in spring', () => {
    expect(sunTimes(new Date('2026-04-15T12:00:00Z'), TROMSO).kind).toBe('normal');
  });

  it('handles the poles themselves without producing NaN', () => {
    for (const latitude of [90, -90]) {
      for (const month of [5, 11]) {
        const times = sunTimes(new Date(Date.UTC(2026, month, 21, 12)), {
          latitude,
          longitude: 0,
        });

        expect(['polar-day', 'polar-night']).toContain(times.kind);
      }
    }
  });
});

describe('resolveAutoTheme', () => {
  it('reads the middle of the night as night', () => {
    // 03:00 EST in Toronto.
    expect(resolveAutoTheme(new Date('2026-12-21T08:00:00Z'), TORONTO)).toBe('skyward-night');
  });

  it('reads the middle of the day as day', () => {
    // 12:00 EST in Toronto.
    expect(resolveAutoTheme(new Date('2026-12-21T17:00:00Z'), TORONTO)).toBe('skyward-day');
  });

  it('reads the hour after sunset as night, not day', () => {
    const { sunsetMs } = normal(new Date('2026-06-21T12:00:00Z'), TORONTO);

    expect(resolveAutoTheme(new Date(sunsetMs + 60 * 60 * 1000), TORONTO)).toBe('skyward-night');
    expect(resolveAutoTheme(new Date(sunsetMs - 60 * 60 * 1000), TORONTO)).toBe('skyward-day');
  });

  it('reads the hour before sunrise as night, not day', () => {
    const { sunriseMs } = normal(new Date('2026-06-21T12:00:00Z'), TORONTO);

    expect(resolveAutoTheme(new Date(sunriseMs - 60 * 60 * 1000), TORONTO)).toBe('skyward-night');
    expect(resolveAutoTheme(new Date(sunriseMs + 60 * 60 * 1000), TORONTO)).toBe('skyward-day');
  });

  /**
   * The one place weather is allowed a say. A storm darkens a daytime sky
   * enough to be worth switching for; ordinary rain does not, because an
   * overcast afternoon is still an afternoon.
   */
  it('treats a daytime thunderstorm as night', () => {
    const noon = new Date('2026-12-21T17:00:00Z');

    expect(resolveAutoTheme(noon, TORONTO, 'thunderstorm')).toBe('skyward-night');
    expect(resolveAutoTheme(noon, TORONTO, 'hail')).toBe('skyward-night');
  });

  it('leaves ordinary daytime weather alone', () => {
    const noon = new Date('2026-12-21T17:00:00Z');

    for (const group of ['clear', 'cloud', 'fog', 'drizzle', 'rain', 'snow', 'shower'] as const) {
      expect(resolveAutoTheme(noon, TORONTO, group)).toBe('skyward-day');
    }
  });

  it('follows the sun through polar day and polar night', () => {
    expect(resolveAutoTheme(new Date('2026-06-21T02:00:00Z'), TROMSO)).toBe('skyward-day');
    expect(resolveAutoTheme(new Date('2026-12-21T12:00:00Z'), TROMSO)).toBe('skyward-night');
  });

  /**
   * `null` means "nothing to go on", not "use the default". The fallback to
   * system appearance belongs with the caller that knows about it.
   */
  it('declines to guess without a position', () => {
    expect(resolveAutoTheme(new Date('2026-06-21T12:00:00Z'), null)).toBeNull();
  });

  it('declines to guess on a coordinate that is not a real place', () => {
    const nonsense: Coordinates[] = [
      { latitude: Number.NaN, longitude: 0 },
      { latitude: 0, longitude: Number.NaN },
      { latitude: Number.POSITIVE_INFINITY, longitude: 0 },
      { latitude: 91, longitude: 0 },
      { latitude: -91, longitude: 0 },
      { latitude: 0, longitude: 181 },
    ];

    for (const coordinates of nonsense) {
      expect(resolveAutoTheme(new Date('2026-06-21T12:00:00Z'), coordinates)).toBeNull();
    }
  });

  it('declines to guess on an unparseable date', () => {
    expect(resolveAutoTheme(new Date('not a date'), TORONTO)).toBeNull();
  });

  /**
   * Field Card is a taste choice, not a weather condition. Auto mode picking it
   * would mean the app deciding the user's aesthetic for them.
   */
  it('never chooses Field Card, at any hour of any month', () => {
    const chosen = new Set<string>();

    for (let month = 0; month < 12; month++) {
      for (let hour = 0; hour < 24; hour++) {
        const theme = resolveAutoTheme(new Date(Date.UTC(2026, month, 15, hour)), TORONTO);
        if (theme !== null) chosen.add(theme);
      }
    }

    expect(chosen.has('field-card')).toBe(false);
    expect(chosen).toEqual(new Set(['skyward-day', 'skyward-night']));
  });

  it('only ever names a theme that exists', () => {
    for (let hour = 0; hour < 24; hour++) {
      const theme = resolveAutoTheme(new Date(Date.UTC(2026, 5, 15, hour)), TORONTO);
      if (theme !== null) expect(THEME_NAMES).toContain(theme);
    }
  });

  /**
   * The answer must not depend on the machine's zone. This is the property
   * `dayLabel` lost, and the reason this module works in absolute instants.
   */
  it('gives the same answer whatever the process timezone is', () => {
    const instant = new Date('2026-06-21T09:00:00Z');
    const original = process.env.TZ;

    const answers = ['UTC', 'America/Toronto', 'Australia/Sydney', 'Asia/Kolkata'].map((zone) => {
      process.env.TZ = zone;
      return resolveAutoTheme(instant, TORONTO);
    });

    process.env.TZ = original;

    expect(new Set(answers).size).toBe(1);
  });
});

/**
 * The edges of the accepted domain, and the edges of the day.
 *
 * The validity check uses `>` rather than `>=`, so the poles and the
 * antimeridian are inside the domain -- the McMurdo and Fiji cases. And the
 * daylight window is closed at both ends, so the sunrise instant itself is
 * already day. Both are one character away from being wrong, and neither shows
 * up in a test that only visits the middle of the range.
 */
describe('resolveAutoTheme at the edges', () => {
  const MIDSUMMER = new Date('2026-06-21T12:00:00Z');

  it('accepts the poles and the antimeridian, which are real places', () => {
    const extremes: Coordinates[] = [
      { latitude: 90, longitude: 0 },
      { latitude: -90, longitude: 0 },
      { latitude: 0, longitude: 180 },
      { latitude: 0, longitude: -180 },
    ];

    for (const coordinates of extremes) {
      expect(resolveAutoTheme(MIDSUMMER, coordinates)).not.toBeNull();
    }
  });

  it('declines a coordinate off the west and south edges too', () => {
    const nonsense: Coordinates[] = [
      { latitude: 0, longitude: -181 },
      { latitude: -90.0001, longitude: 0 },
      { latitude: 0, longitude: Number.NEGATIVE_INFINITY },
    ];

    for (const coordinates of nonsense) {
      expect(resolveAutoTheme(MIDSUMMER, coordinates)).toBeNull();
    }
  });

  /**
   * The theme flips within a minute of the sun, on the correct side, at both
   * ends of the day. A minute rather than the instant itself: `sunTimes` is
   * recomputed from whatever instant it is handed, so the boundary it reports
   * moves by a second or two depending on which side of it you ask from, and an
   * assertion pinned to the exact millisecond would be testing that jitter
   * rather than the behaviour. The behaviour is that a minute after sunrise is
   * day and a minute before it is night.
   */
  it('flips with the sun at both ends of the day', () => {
    const { sunriseMs, sunsetMs } = normal(new Date('2026-06-21T12:00:00Z'), TORONTO);
    const MINUTE = 60_000;

    expect(resolveAutoTheme(new Date(sunriseMs + MINUTE), TORONTO)).toBe('skyward-day');
    expect(resolveAutoTheme(new Date(sunriseMs - MINUTE), TORONTO)).toBe('skyward-night');
    expect(resolveAutoTheme(new Date(sunsetMs - MINUTE), TORONTO)).toBe('skyward-day');
    expect(resolveAutoTheme(new Date(sunsetMs + MINUTE), TORONTO)).toBe('skyward-night');
  });

  /**
   * Weather is enrichment, never the input. At night every condition is already
   * night, so none of them may change the answer -- including the two that
   * darken a daytime sky.
   */
  it('lets no condition change the answer once it is already night', () => {
    const { sunsetMs } = normal(new Date('2026-06-21T12:00:00Z'), TORONTO);
    const afterDark = new Date(sunsetMs + 60 * 60 * 1000);

    const groups: WeatherConditionGroup[] = [
      'clear',
      'cloud',
      'fog',
      'drizzle',
      'rain',
      'snow',
      'shower',
      'thunderstorm',
      'hail',
      'unknown',
    ];

    for (const group of groups) {
      expect(resolveAutoTheme(afterDark, TORONTO, group)).toBe('skyward-night');
    }
  });

  /**
   * Only thunderstorm and hail darken a daytime sky. An overcast afternoon is
   * still an afternoon, so every other group has to leave the day alone --
   * otherwise a drizzle in Vancouver turns the lights off.
   */
  it('keeps every non-storm daytime sky in the day theme', () => {
    const noon = new Date('2026-06-21T16:00:00Z');
    const calm: WeatherConditionGroup[] = [
      'clear',
      'cloud',
      'fog',
      'drizzle',
      'rain',
      'snow',
      'shower',
      'unknown',
    ];

    for (const group of calm) {
      expect(resolveAutoTheme(noon, TORONTO, group)).toBe('skyward-day');
    }
  });

  it('reads the sun at the equator, where the day barely moves all year', () => {
    const quito: Coordinates = { latitude: -0.1807, longitude: -78.4678 };

    for (const month of [0, 3, 6, 9]) {
      const { sunriseMs, sunsetMs } = normal(new Date(Date.UTC(2026, month, 15, 12)), quito);
      const dayLengthHours = (sunsetMs - sunriseMs) / 3_600_000;

      expect(dayLengthHours).toBeGreaterThan(11.5);
      expect(dayLengthHours).toBeLessThan(12.5);
    }
  });
});
