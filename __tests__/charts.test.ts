import {
  compact,
  normalise,
  scaleSeries,
  toAreaPath,
  toLinePath,
  toSmoothPath,
} from '@/core/charts/geometry';

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

  it('honours a forced domain so sibling charts share an axis', () => {
    const points = scaleSeries([5], { ...BOX, min: 0, max: 10 });

    expect(points[0]?.y).toBe(25);
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
