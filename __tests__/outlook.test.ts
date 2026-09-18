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

  it('abbreviates the weekday for every later row', () => {
    // Locale-dependent, so the assertion is the abbreviation the runtime
    // itself produces rather than a hard-coded English string.
    const expected = new Date('2026-09-19').toLocaleDateString(undefined, { weekday: 'short' });

    expect(dayLabel('2026-09-19', 1)).toBe(expected);
    expect(dayLabel('2026-09-19', 1)).not.toBe('Today');
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
 * and `new Date` treats the two forms differently enough to be worth pinning.
 */
describe('dayLabel input shapes', () => {
  it('reads a full ISO timestamp as well as a bare date', () => {
    const bare = dayLabel('2026-09-19', 2);
    const stamped = dayLabel('2026-09-19T00:00', 2);

    expect(bare).not.toBe('2026-09-19');
    expect(stamped).not.toBe('2026-09-19T00:00');
    expect(stamped).toHaveLength(bare.length);
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
