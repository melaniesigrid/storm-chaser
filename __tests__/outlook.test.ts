import { dayLabel } from '@/features/weather/model/dayLabel';

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
   * `new Date('2026-09-19')` — the same expression the code under test used,
   * including its bug — so it agreed with whatever the function did. The
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
   * set is distinct (below) never catches it — only comparing each row to the
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
 * to come out the same either way — that is the invariant worth pinning.
 */
describe('dayLabel input shapes', () => {
  /**
   * REGRESSION. This compared the two forms by LENGTH, which is equal even when
   * the two disagree about which day it is — "Fri" and "Sat" are both three
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
