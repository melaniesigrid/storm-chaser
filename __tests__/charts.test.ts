import {
  compact,
  normalise,
  scaleSeries,
  toAreaPath,
  toLinePath,
  toSmoothPath,
} from '@/core/charts/geometry';
import { clamp } from '@/core/utils/clamp';

const BOX = { width: 100, height: 50 };

describe('scaleSeries', () => {
  it('returns nothing for an empty series', () => {
    expect(scaleSeries([], BOX)).toEqual([]);
  });

  it('spans the full width from first to last point', () => {
    const points = scaleSeries([1, 2, 3], BOX);

    expect(points[0]?.x).toBe(0);
    expect(points[2]?.x).toBe(100);
  });

  it('inverts the axis, because SVG y grows downward', () => {
    const points = scaleSeries([0, 10], BOX);

    // The larger value must sit higher on screen, so smaller y.
    expect(points[1]?.y).toBeLessThan(points[0]?.y as number);
    expect(points[1]?.y).toBe(0);
    expect(points[0]?.y).toBe(50);
  });

  it('centres a flat series instead of pinning it to an edge', () => {
    // No range to divide by. Drawing this at y=0 would read as "maximum".
    for (const point of scaleSeries([7, 7, 7, 7], BOX)) {
      expect(point.y).toBe(25);
    }
  });

  it('centres a single point rather than putting it at x=0', () => {
    const points = scaleSeries([12], BOX);

    expect(points).toHaveLength(1);
    expect(points[0]?.x).toBe(50);
    expect(points[0]?.y).toBe(25);
  });

  it('keeps padding inside the box on both axes', () => {
    for (const point of scaleSeries([0, 5, 10], { ...BOX, padding: 4 })) {
      expect(point.x).toBeGreaterThanOrEqual(4);
      expect(point.x).toBeLessThanOrEqual(96);
      expect(point.y).toBeGreaterThanOrEqual(4);
      expect(point.y).toBeLessThanOrEqual(46);
    }
  });

  /**
   * One null temperature used to make Math.min/Math.max NaN for the whole
   * series, which blanked the entire chart rather than losing one reading.
   */
  it('never emits NaN when the series contains a non-finite value', () => {
    for (const point of scaleSeries([4, Number.NaN, 8], BOX)) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    }
  });

  it('keeps the good readings in place around a non-finite one', () => {
    const clean = scaleSeries([4, 6, 8], BOX);
    const dirty = scaleSeries([4, Number.NaN, 8], BOX);

    // The domain still comes from 4 and 8, so the ends are unmoved.
    expect(dirty[0]).toEqual(clean[0]);
    expect(dirty[2]).toEqual(clean[2]);
  });

  it('survives a series with nothing finite in it at all', () => {
    for (const point of scaleSeries([Number.NaN, Number.POSITIVE_INFINITY], BOX)) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    }
  });

  it('never produces NaN when the box has no area', () => {
    for (const point of scaleSeries([1, 2, 3], { width: 0, height: 0 })) {
      expect(Number.isNaN(point.x)).toBe(false);
      expect(Number.isNaN(point.y)).toBe(false);
    }
  });
});

describe('path builders', () => {
  it('produce empty strings for an empty series', () => {
    expect(toLinePath([])).toBe('');
    expect(toAreaPath([], 50)).toBe('');
    expect(toSmoothPath([])).toBe('');
  });

  it('start with a move and then line to each point', () => {
    const path = toLinePath(scaleSeries([0, 10], BOX));

    expect(path.startsWith('M')).toBe(true);
    expect(path).toContain('L');
  });

  it('close the area back along the baseline', () => {
    const path = toAreaPath(scaleSeries([0, 10], BOX), 50);

    expect(path.endsWith('Z')).toBe(true);
  });

  it('refuse to build an area from a single point', () => {
    expect(toAreaPath(scaleSeries([4], BOX), 50)).toBe('');
  });

  it('fall back to straight segments when there are too few points to curve', () => {
    const two = scaleSeries([1, 2], BOX);

    expect(toSmoothPath(two)).toBe(toLinePath(two));
  });

  it('emit cubic segments once there are enough points', () => {
    expect(toSmoothPath(scaleSeries([1, 5, 2, 8], BOX))).toContain('C');
  });

  /**
   * A smoothed line must still pass through every measured value. A curve that
   * invents a reading is a lie about the weather.
   */
  it('keep every real data point on a smoothed path', () => {
    const points = scaleSeries([1, 5, 2, 8], BOX);
    const path = toSmoothPath(points);
    // Paths round to 2dp to keep them small, so compare at that precision.
    const at = (value: number) => Math.round(value * 100) / 100;

    for (const point of points) {
      expect(path).toContain(`${at(point.x)} ${at(point.y)}`);
    }
  });
});

describe('normalise', () => {
  it('maps a value onto 0..1 within its bounds', () => {
    expect(normalise(5, 0, 10)).toBe(0.5);
    expect(normalise(0, 0, 10)).toBe(0);
    expect(normalise(10, 0, 10)).toBe(1);
  });

  it('clamps rather than overflowing the chart', () => {
    expect(normalise(-40, 0, 10)).toBe(0);
    expect(normalise(9000, 0, 10)).toBe(1);
  });

  it('centres when the bounds collapse', () => {
    expect(normalise(3, 3, 3)).toBe(0.5);
  });

  it('treats a non-finite reading as zero rather than NaN', () => {
    expect(normalise(Number.NaN, 0, 10)).toBe(0);
    expect(normalise(Number.POSITIVE_INFINITY, 0, 10)).toBe(0);
  });
});

describe('compact', () => {
  it('drops the nulls Open-Meteo returns for absent variables', () => {
    expect(compact([1, null, 2, undefined, 3])).toEqual([1, 2, 3]);
  });

  it('drops NaN and Infinity too', () => {
    expect(compact([1, Number.NaN, Number.POSITIVE_INFINITY, 2])).toEqual([1, 2]);
  });

  it('survives an all-null series', () => {
    expect(compact([null, null])).toEqual([]);
  });
});

describe('clamp', () => {
  it('returns the value when it is already inside the bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('pins to whichever bound was crossed', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it('handles the bounds themselves and negative ranges', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
    expect(clamp(-90, -85, 85)).toBe(-85);
  });

  it('collapses to the single value when the bounds meet', () => {
    expect(clamp(42, 7, 7)).toBe(7);
  });
});

/**
 * `scaleSeries` was rewritten in this change to route its vertical placement
 * through `normalise` instead of dividing by a locally computed range. These
 * are the inputs where the two implementations could differ.
 */
describe('scaleSeries degenerate boxes and domains', () => {
  it('collapses to a point rather than going negative when padding exceeds the box', () => {
    // A 12px sparkline asked for 8px of padding on each side. `usableWidth`
    // floors at zero, so every point stacks on the padding origin instead of
    // being drawn outside the SVG.
    for (const point of scaleSeries([1, 2, 3], { width: 12, height: 10, padding: 8 })) {
      expect(point.x).toBe(8);
      expect(point.y).toBe(8);
    }
  });

  it('parks a lone missing reading on the centre line, not the floor', () => {
    // It used to land at the floor, because `normalise` returns 0 for a
    // non-finite value and 0 is the bottom of the box. The point is marked
    // undefined now, so nothing draws it; the centre is only the value
    // anything that ignores `defined` would fall back to.
    const [only] = scaleSeries([Number.NaN], BOX);

    expect(only?.defined).toBe(false);
    expect(only?.y).toBe(25);
    expect(only?.x).toBe(50);
  });
});

describe('gaps in a series', () => {
  /*
   * REGRESSION. `mappers.ts` used to substitute 0 for a missing hourly
   * temperature. 0 is finite, so the chart could not tell it from a reading:
   * a 24 to 31 degree day with one null hour drew a spike to the floor and
   * dragged the domain down with it, flattening the real curve into the top
   * of the box. The mapper emits null now, and the chart has to carry it all
   * the way through without inventing a temperature.
   */
  it('marks a missing reading undefined and leaves the rest defined', () => {
    const points = scaleSeries([24, null, 31], BOX);

    expect(points.map((point) => point.defined)).toEqual([true, false, true]);
  });

  it('keeps the domain off the missing hour', () => {
    // 24 is the floor and 31 the ceiling. If null were still 0, the 24 would
    // sit near the top of the box instead of at the bottom of it.
    const points = scaleSeries([24, null, 31], BOX);

    expect(points[0]?.y).toBe(50);
    expect(points[2]?.y).toBe(0);
  });

  it('holds every later point on its own slot', () => {
    // The x positions must not shift: the strip labels hour N under point N.
    const complete = scaleSeries([24, 27, 31], BOX);
    const sparse = scaleSeries([24, null, 31], BOX);

    expect(sparse.map((point) => point.x)).toEqual(complete.map((point) => point.x));
  });

  it('breaks the line rather than drawing across the gap', () => {
    const path = toLinePath(scaleSeries([24, null, 31], BOX));

    // Two subpaths, so two moves: one per run of real readings.
    expect(path.match(/M/g)?.length).toBe(2);
  });

  it('breaks the curve rather than bending through the gap', () => {
    const path = toSmoothPath(scaleSeries([1, 5, 2, null, 8, 4, 9], BOX));

    expect(path.match(/M/g)?.length).toBe(2);
  });

  it('fills each run of readings separately', () => {
    const path = toAreaPath(scaleSeries([1, 5, null, 8, 4], BOX), 50);

    // One closed shape per run: ink under an unmeasured hour is the same lie
    // the line would have told.
    expect(path.match(/Z/g)?.length).toBe(2);
  });

  it('draws nothing at all when every reading is missing', () => {
    const points = scaleSeries([null, null, null], BOX);

    expect(toLinePath(points)).toBe('');
    expect(toSmoothPath(points)).toBe('');
    expect(toAreaPath(points, 50)).toBe('');
  });

  it('refuses to fill a run of one', () => {
    // A single reading between two gaps has no area under it.
    expect(toAreaPath(scaleSeries([null, 7, null], BOX), 50)).toBe('');
  });

  it('is unchanged for a complete series', () => {
    // The common case must take exactly the path it always did.
    const points = scaleSeries([1, 5, 2, 8], BOX);

    expect(points.every((point) => point.defined)).toBe(true);
    expect(toLinePath(points).match(/M/g)?.length).toBe(1);
    expect(toAreaPath(points, 50).match(/Z/g)?.length).toBe(1);
  });
});

/**
 * The contract `RangeBar` leans on.
 *
 * The outlook bar computes `start = normalise(min(low, high))` and
 * `end = normalise(max(low, high))`, then draws from `start * width` for
 * `(end - start) * width`. The component itself needs a renderer this project
 * does not configure, but everything that can actually go wrong in it is a
 * property of `normalise`: an end below its start is a negative span, and a
 * result outside 0..1 is a bar drawn past the end of its own track. A day
 * hotter than the week's domain (the outlook derives the domain from the same
 * seven days, but a caller elsewhere need not) has to fill the track rather
 * than overflow it.
 */
describe('normalise as the range bar uses it', () => {
  const DOMAIN = { min: -5, max: 30 };
  const at = (value: number) => normalise(value, DOMAIN.min, DOMAIN.max);

  it('never orders the warm end below the cold end, so a span is never negative', () => {
    for (const [low, high] of [
      [2, 18],
      [-5, 30],
      [11, 11],
      [30, -5],
    ] as const) {
      const start = at(Math.min(low, high));
      const end = at(Math.max(low, high));

      expect(end).toBeGreaterThanOrEqual(start);
    }
  });

  it('keeps both ends inside the track for a day outside the domain', () => {
    for (const value of [-40, -6, 31, 120]) {
      expect(at(value)).toBeGreaterThanOrEqual(0);
      expect(at(value)).toBeLessThanOrEqual(1);
    }
  });

  it('rises with temperature, so a warmer day sits further right', () => {
    expect(at(0)).toBeLessThan(at(15));
    expect(at(15)).toBeLessThan(at(29));
  });

  it('collapses a day with no spread to a zero width span, not a negative one', () => {
    expect(at(14) - at(14)).toBe(0);
  });

  /**
   * A week where every day is identical collapses the domain the outlook
   * derives. Every bar then centres rather than the whole column vanishing.
   */
  it('centres every bar when the whole week shares one temperature', () => {
    expect(normalise(20, 20, 20)).toBe(0.5);
  });
});
