import { dayLabel } from '@/features/weather/model/dayLabel';
import {
  BAR_MAX,
  BAR_MIN,
  DAY_MIN,
  ROW_FIXED,
  barWidthFor,
} from '@/features/weather/model/outlookLayout';

describe('dayLabel', () => {
  /**
   * The first row is always the day you are standing in, whatever date the
   * API stamped it with. Printing "Thu" for today reads as a forecast for a
   * day that has not started.
   */
  it('names the first row Today rather than its weekday', () => {
    expect(dayLabel('2026-09-18', 0)).toBe('Today');
  });

  it('names the first row Today even when its date is unparseable', () => {
    expect(dayLabel('not a date', 0)).toBe('Today');
  });

  /**
   * REGRESSION. This assertion used to build its expectation with
   * `new Date('2026-09-19')`, the same expression the code under test used,
   * including its bug, so it agreed with whatever the function did. The
   * expectation is now built from the date's components as local midnight,
   * which is independently what the row means: a calendar day in the reader's
   * own zone. Under the old UTC-midnight parse this fails in every zone west of
   * UTC, which is where the bug actually lived.
   *
   * Still not hard-coded to English: the abbreviation is whatever the runtime's
   * locale produces, which is the point of passing `undefined` in the code.
   */
  it('abbreviates the weekday for every later row, in the reader own zone', () => {
    const localMidnight = new Date(2026, 8, 19);
    const expected = localMidnight.toLocaleDateString(undefined, { weekday: 'short' });

    expect(dayLabel('2026-09-19', 1)).toBe(expected);
    expect(dayLabel('2026-09-19', 1)).not.toBe('Today');
  });

  /**
   * The whole seven-row series, each row asserted against its own local
   * calendar day. A one-day shift moves every row together, so checking the
   * set is distinct (below) never catches it. Only comparing each row to the
   * day it claims to be does.
   */
  it('names every row the weekday its own date falls on', () => {
    const dates: readonly [number, number, number][] = [
      [2026, 8, 19],
      [2026, 8, 20],
      [2026, 8, 21],
      [2026, 8, 22],
      [2026, 8, 23],
      [2026, 8, 24],
    ];

    dates.forEach(([year, month, day], offset) => {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const expected = new Date(year, month, day).toLocaleDateString(undefined, {
        weekday: 'short',
      });

      expect(dayLabel(iso, offset + 1)).toBe(expected);
    });
  });

  /**
   * A malformed date would otherwise render "Invalid Date" in a 48px column
   * across the whole outlook. Echoing the raw string at least keeps the row
   * identifiable and keeps the panel the shape it was laid out as.
   */
  it('falls back to the raw string rather than printing Invalid Date', () => {
    expect(dayLabel('not a date', 3)).toBe('not a date');
    expect(dayLabel('', 3)).toBe('');
  });

  it('gives each of the seven rows its own label', () => {
    const dates = [
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
    ];
    const labels = dates.map((date, index) => dayLabel(date, index));

    expect(new Set(labels).size).toBe(7);
    expect(labels[0]).toBe('Today');
  });
});

/**
 * Inputs the date string can actually take. The daily series is date-only, but
 * the same helper is reached from anything holding an Open-Meteo timestamp,
 * and `new Date` treats the two forms differently: date-only is UTC midnight,
 * date-and-time is local. Both denote the same calendar day, so the label has
 * to come out the same either way, and that is the invariant worth pinning.
 */
describe('dayLabel input shapes', () => {
  /**
   * REGRESSION. This compared the two forms by LENGTH, which is equal even when
   * the two disagree about which day it is, since "Fri" and "Sat" are both three
   * characters. Comparing the values is what catches the UTC-midnight parse:
   * west of UTC the bare form used to resolve a day earlier than the stamped
   * one.
   */
  it('reads a full ISO timestamp and a bare date as the same day', () => {
    const bare = dayLabel('2026-09-19', 2);
    const stamped = dayLabel('2026-09-19T00:00', 2);

    expect(bare).not.toBe('2026-09-19');
    expect(stamped).not.toBe('2026-09-19T00:00');
    expect(stamped).toBe(bare);
  });

  it('abbreviates rather than spelling the weekday out, so the column stays narrow', () => {
    for (let index = 1; index < 7; index++) {
      expect(dayLabel('2026-09-19', index).length).toBeLessThanOrEqual(5);
    }
  });

  /**
   * Only index 0 is Today. A list rendered from a reversed or resliced array
   * must not produce a second one, or two rows claim the same day.
   */
  it('names exactly one row Today', () => {
    const labels = Array.from({ length: 7 }, (_, index) => dayLabel('2026-09-19', index));

    expect(labels.filter((label) => label === 'Today')).toHaveLength(1);
  });
});

/**
 * Hostile date strings. The outlook is built from whatever the API sent, and
 * the 48px column has room for a weekday abbreviation and nothing else. The
 * contract is that the label is always SOMETHING the column can hold and never
 * the string "Invalid Date", whatever arrives.
 */
describe('dayLabel on input it was not promised', () => {
  it('echoes an empty date rather than inventing a weekday', () => {
    expect(dayLabel('', 3)).toBe('');
  });

  /**
   * Every one of these either parses to a real day or falls back to the raw
   * string. None may render "Invalid Date", which is what `toLocaleDateString`
   * produces on a NaN date and what would otherwise overflow the column on
   * every row at once.
   */
  it('never renders Invalid Date, whatever it is handed', () => {
    const hostile = [
      '',
      '   ',
      'not a date',
      '2026-09',
      '2026-09-19T',
      '0000-00-00',
      '2026-13-45',
      '19/09/2026',
      'null',
    ];

    for (const value of hostile) {
      for (const index of [1, 5]) {
        const label = dayLabel(value, index);

        expect(label).not.toBe('Invalid Date');
        expect(label).not.toMatch(/NaN/);
      }
    }
  });

  /**
   * A full UTC instant is a legitimate shape here -- anything holding an
   * Open-Meteo timestamp reaches this helper. It has to resolve to a weekday
   * rather than echoing an 20-character string into a 48px column.
   */
  it('reads a zoned timestamp as a weekday rather than echoing it', () => {
    const label = dayLabel('2026-09-19T12:00:00Z', 1);

    expect(label).not.toBe('2026-09-19T12:00:00Z');
    expect(label.length).toBeLessThanOrEqual(5);
  });
});

/*
 * REGRESSION. The outlook row was six fixed-width columns totalling 408dp
 * inside a panel that is 326dp wide on a 390pt phone. React Native overlaps
 * an overflowing row rather than clipping it, so the gust printed through the
 * low temperature -- "37 km/h9°" -- on every row, on every phone. No test
 * could have caught it, because the widths were literals inside JSX. They are
 * arithmetic now, and this is the arithmetic.
 */
describe('the outlook row fits the phone it is drawn on', () => {
  /**
   * Panel content width = screen width, less the scroll view's 16dp either
   * side, less the panel's own 16dp either side.
   */
  const panel = (screen: number) => screen - 32 - 32;

  /** The narrowest phone still worth supporting, and the common ones. */
  const PHONES = [320, 360, 375, 390, 414, 430];

  it('never asks for more room than the row has', () => {
    for (const screen of PHONES) {
      const row = panel(screen);
      const used = ROW_FIXED + DAY_MIN + barWidthFor(row);

      expect({ screen, fits: used <= row || barWidthFor(row) === BAR_MIN })
        .toEqual({ screen, fits: true });
    }
  });

  it('leaves the day label at least its floor on every phone but the smallest', () => {
    for (const screen of PHONES.filter((width) => width >= 360)) {
      const row = panel(screen);
      expect({ screen, dayColumn: row - ROW_FIXED - barWidthFor(row) >= DAY_MIN })
        .toEqual({ screen, dayColumn: true });
    }
  });

  it('keeps the bar between a dash and a chart', () => {
    for (const row of [0, 100, 200, 300, 400, 900, 4000]) {
      const width = barWidthFor(row);
      expect({ row, inRange: width >= BAR_MIN && width <= BAR_MAX })
        .toEqual({ row, inRange: true });
    }
  });

  it('grows the bar with the screen rather than pinning it', () => {
    expect(barWidthFor(panel(390))).toBeGreaterThan(barWidthFor(panel(320)));
  });
});
